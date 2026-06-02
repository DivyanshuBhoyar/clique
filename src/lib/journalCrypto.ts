import nacl, { secureRandomBytes } from "@/lib/nacl";
import { decodeBase64, encodeBase64 } from "tweetnacl-util";

// Sentinel value encrypted to verify a password is correct.
// Chosen to be app-specific so it's clear what it was used for.
const VERIFICATION_SENTINEL = "homie_squad_journal_v1";

/**
 * Derive a 32-byte symmetric key from a password and salt using PBKDF2-SHA256.
 *
 * Why PBKDF2 over a plain hash: PBKDF2 adds a work factor (iterations) that
 * makes brute-force attacks significantly slower. 100k iterations adds ~100ms
 * on modern hardware — acceptable for a one-time unlock, painful to brute-force.
 *
 * crypto.subtle is available in Hermes (React Native ≥ 0.71) and modern browsers.
 */
export async function deriveKey(password: string, saltB64: string): Promise<Uint8Array> {
    const encoder = new TextEncoder();
    const keyMaterial = await crypto.subtle.importKey(
        "raw",
        encoder.encode(password),
        "PBKDF2",
        false,
        ["deriveBits"],
    );

    const bits = await crypto.subtle.deriveBits(
        {
            name: "PBKDF2",
            hash: "SHA-256",
            // tweetnacl-util always produces a Uint8Array backed by a plain ArrayBuffer;
            // cast to suppress TS's overly-broad ArrayBufferLike type
            salt: decodeBase64(saltB64).buffer as ArrayBuffer,
            iterations: 100_000,
        },
        keyMaterial,
        256, // 32 bytes
    );

    return new Uint8Array(bits);
}

/**
 * Encrypt plaintext content using NaCl secretbox (XSalsa20-Poly1305).
 * Returns base64-encoded ciphertext and nonce, ready for Convex storage.
 */
export function encryptContent(
    plaintext: string,
    key: Uint8Array,
): { ct: string; nonce: string } {
    const nonce = secureRandomBytes(nacl.secretbox.nonceLength);
    const encoded = new TextEncoder().encode(plaintext);
    const ciphertext = nacl.secretbox(encoded, nonce, key);
    return {
        ct: encodeBase64(ciphertext),
        nonce: encodeBase64(nonce),
    };
}

/**
 * Decrypt ciphertext from Convex. Returns plaintext or null.
 *
 * null means either the key is wrong or the data was tampered — don't display it.
 */
export function decryptContent(
    ctB64: string,
    nonceB64: string,
    key: Uint8Array,
): string | null {
    const result = nacl.secretbox.open(
        decodeBase64(ctB64),
        decodeBase64(nonceB64),
        key,
    );
    if (!result) return null;
    return new TextDecoder().decode(result);
}

/**
 * Encrypt the sentinel string to create a verification token.
 * Stored in Convex so a new device can confirm the password is correct
 * before caching the key — avoids silently storing a wrong key.
 */
export function createVerificationToken(
    key: Uint8Array,
): { ct: string; nonce: string } {
    return encryptContent(VERIFICATION_SENTINEL, key);
}

/**
 * Returns true if the key can decrypt the stored verification token correctly.
 */
export function verifyKey(
    key: Uint8Array,
    ctB64: string,
    nonceB64: string,
): boolean {
    const result = decryptContent(ctB64, nonceB64, key);
    return result === VERIFICATION_SENTINEL;
}
