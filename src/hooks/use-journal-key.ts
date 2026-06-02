import { useConvex, useMutation, useQuery } from "convex/react";
import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { decodeBase64, encodeBase64 } from "tweetnacl-util";

import { api } from "@/convex/_generated/api";
import {
    createVerificationToken,
    deriveKey,
    encryptContent,
    verifyKey,
} from "@/lib/journalCrypto";
import { secureGet, secureSet } from "@/lib/keyStore";
import nacl, { secureRandomBytes } from "@/lib/nacl";

const SK_JOURNAL_KEY = "journal_key"; // base64 symmetric key cached in SecureStore

export type JournalKeyStatus = "loading" | "not_setup" | "locked" | "unlocked";

interface JournalKeyValue {
    status: JournalKeyStatus;
    key: Uint8Array | null;
    setup: (password: string) => Promise<void>;
    unlock: (password: string) => Promise<boolean>;
}

export const JournalKeyContext = createContext<JournalKeyValue>({
    status: "loading",
    key: null,
    setup: async () => {},
    unlock: async () => false,
});

/**
 * Manages the journal encryption key lifecycle.
 * Mount this once at the notes layout level; consume with useJournalKey().
 */
export function useJournalKeyProvider(): JournalKeyValue {
    const [status, setStatus] = useState<JournalKeyStatus>("loading");
    const [key, setKey] = useState<Uint8Array | null>(null);

    const keyConfig = useQuery(api.journalKey.getJournalKeyConfig);
    const saveConfig = useMutation(api.journalKey.saveJournalKeyConfig);
    const updateNote = useMutation(api.notes.updateNote);
    const convex = useConvex();

    // Determine status once Convex has loaded the config
    useEffect(() => {
        if (keyConfig === undefined) return; // still loading

        (async () => {
            if (!keyConfig) {
                setStatus("not_setup");
                return;
            }

            // Config exists — check SecureStore for the cached derived key
            const cachedKeyB64 = await secureGet(SK_JOURNAL_KEY);
            if (cachedKeyB64) {
                setKey(decodeBase64(cachedKeyB64));
                setStatus("unlocked");
            } else {
                // New device — user must enter password once to re-derive the key
                setStatus("locked");
            }
        })();
    }, [keyConfig]);

    /**
     * First-time setup: derives key from password, saves salt + verification token to
     * Convex, caches key in SecureStore, and encrypts all existing plain-text journals.
     */
    const setup = useCallback(async (password: string) => {
        const salt = secureRandomBytes(nacl.secretbox.keyLength);
        const saltB64 = encodeBase64(salt);

        const derivedKey = await deriveKey(password, saltB64);
        const { ct: verificationCt, nonce: verificationNonce } = createVerificationToken(derivedKey);

        await saveConfig({ salt: saltB64, verificationCt, verificationNonce });
        await secureSet(SK_JOURNAL_KEY, encodeBase64(derivedKey));

        // Migrate: encrypt all existing plain-text journals
        const journals = await convex.query(api.notes.getUnencryptedJournals, {});
        for (const journal of journals) {
            const { ct, nonce } = encryptContent(journal.content, derivedKey);
            await updateNote({ noteId: journal._id, content: ct, nonce, encrypted: true });
        }

        setKey(derivedKey);
        setStatus("unlocked");
    }, [saveConfig, updateNote, convex]);

    /**
     * New-device unlock: re-derives key from password using the salt stored in Convex,
     * verifies it against the stored token, then caches it in SecureStore.
     *
     * Returns false if the password is wrong.
     */
    const unlock = useCallback(async (password: string): Promise<boolean> => {
        if (!keyConfig) return false;

        const derivedKey = await deriveKey(password, keyConfig.salt);
        const isValid = verifyKey(derivedKey, keyConfig.verificationCt, keyConfig.verificationNonce);
        if (!isValid) return false;

        await secureSet(SK_JOURNAL_KEY, encodeBase64(derivedKey));
        setKey(derivedKey);
        setStatus("unlocked");
        return true;
    }, [keyConfig]);

    return { status, key, setup, unlock };
}

/**
 * Consume the journal key from context. Must be a descendant of JournalKeyContext.Provider.
 */
export function useJournalKey(): JournalKeyValue {
    return useContext(JournalKeyContext);
}
