// src/hooks/use-dm-messages.ts
import { api } from "@/convex/_generated/api";
import { emitNewMessage, onNewMessage } from "@/lib/dm-events";
import { getMyDeviceId, getMyKeyPair } from "@/lib/keyStore";
import * as localDb from "@/lib/local-db";
import { decryptEnvelope } from "@/lib/messaging";
import { useMutation, useQuery } from "convex/react";
import { useCallback, useEffect, useState } from "react";

/**
 * Subscribes to pending envelopes, decrypts them, persists locally.
 *
 * The flow:
 * 1. Convex subscription fires when new envelopes appear (delivered: false)
 * 2. For each envelope: decrypt → check duplicate → save to SQLite → ack
 * 3. The ack (markDelivered) tells Convex to stop sending this envelope
 *
 * ⚠️ The order is: decrypt → persist → ack. NEVER ack before persist.
 */
export function useDmIncomingMessages() {
    const [deviceId, setDeviceId] = useState<string | null>(null);

    useEffect(() => {
        getMyDeviceId().then(setDeviceId).catch(() => {});
    }, []);

    const pending = useQuery(
        api.dm.pendingForDevice,
        deviceId ? { recipientDeviceId: deviceId } : "skip"
    );
    const markDelivered = useMutation(api.dm.markDelivered);

    useEffect(() => {
        if (!pending?.length) return;

        (async () => {
            const myKeyPair = await getMyKeyPair();

            for (const envelope of pending) {
                // 1. Deduplicate — might arrive twice on reconnect
                const exists = await localDb.hasMessage(envelope.messageId);
                if (exists) {
                    await markDelivered({ envelopeId: envelope._id });
                    continue;
                }

                // 2. Decrypt
                const plaintext = decryptEnvelope(
                    envelope.ciphertext,
                    envelope.nonce,
                    envelope.senderPublicKey,
                    myKeyPair.secretKey,
                );

                if (!plaintext) {
                    console.error("Decrypt failed for messageId:", envelope.messageId);
                    continue;
                }

                // 3. Handle based on payload type
                if (envelope.payloadType === "receipt") {
                    // Receipt payload format: JSON { "readUpTo": <sequenceNumber> }
                    try {
                        const receipt = JSON.parse(plaintext);
                        if (receipt.readUpTo) {
                            await localDb.markMessagesReadUpTo(
                                envelope.conversationId,
                                receipt.readUpTo,
                            );
                            emitNewMessage(envelope.conversationId);
                        }
                    } catch { /* malformed receipt — ignore */ }
                    await markDelivered({ envelopeId: envelope._id });
                    continue;
                }

                // Handle edit payload
                if (envelope.payloadType === "edit") {
                    try {
                        const { editMessageId, newText } = JSON.parse(plaintext);
                        if (editMessageId && newText) {
                            await localDb.editMessage(editMessageId, newText);
                            emitNewMessage(envelope.conversationId);
                        }
                    } catch { /* malformed — ignore */ }
                    await markDelivered({ envelopeId: envelope._id });
                    continue;
                }

                // Handle delete payload
                if (envelope.payloadType === "delete") {
                    try {
                        const { deleteMessageId } = JSON.parse(plaintext);
                        if (deleteMessageId) {
                            await localDb.deleteMessage(deleteMessageId);
                            emitNewMessage(envelope.conversationId);
                        }
                    } catch { /* malformed — ignore */ }
                    await markDelivered({ envelopeId: envelope._id });
                    continue;
                }

                // 4. Regular message — persist to local SQLite
                await localDb.insertMessage({
                    messageId:       envelope.messageId,
                    conversationId:  envelope.conversationId,
                    senderId:        envelope.senderId,
                    text:            plaintext,
                    serverTimestamp:  envelope.serverTimestamp,
                    sequenceNumber:  envelope.sequenceNumber,
                });

                // 5. Ack AFTER successful decrypt + persist
                await markDelivered({ envelopeId: envelope._id });

                // 6. Notify UI that this conversation has a new message
                emitNewMessage(envelope.conversationId);
            }
        })();
    }, [pending, markDelivered]);
}

/**
 * Hook to read a paginated message window for a specific conversation from local SQLite.
 */
export function useDmConversationMessages(conversationId: string | undefined) {
    const [messages, setMessages] = useState<any[]>([]);
    const [hasMore, setHasMore] = useState(true);
    const [refreshKey, setRefreshKey] = useState(0);
    const PAGE_SIZE = 50;

    // Re-read the newest page whenever refreshKey changes
    useEffect(() => {
        if (!conversationId) return;
        localDb.getMessagesPage(conversationId, { limit: PAGE_SIZE }).then((page) => {
            setMessages(page);
            setHasMore(page.length === PAGE_SIZE);
        });
    }, [conversationId, refreshKey]);

    // Subscribe to incoming message events for THIS conversation
    useEffect(() => {
        if (!conversationId) return;
        return onNewMessage((convId) => {
            if (convId === conversationId) {
                setRefreshKey((k) => k + 1);
            }
        });
    }, [conversationId]);

    const loadOlder = useCallback(async () => {
        if (!conversationId || !hasMore || messages.length === 0) return;
        const oldest = messages[messages.length - 1];
        const page = await localDb.getMessagesPage(conversationId, {
            beforeSeq: oldest.sequenceNumber,
            beforeTimestamp: oldest.serverTimestamp,
            limit: PAGE_SIZE,
        });
        setMessages((current) => [...current, ...page]);
        setHasMore(page.length === PAGE_SIZE);
    }, [conversationId, hasMore, messages]);

    // Call this after sending a message to refresh the list
    const refresh = useCallback(() => setRefreshKey((k) => k + 1), []);

    return { messages, refresh, loadOlder, hasMore };
}
