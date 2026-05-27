import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { prepareEnvelopes } from "@/lib/messaging";
import { useConvex, useMutation } from "convex/react";
import { useEffect, useRef } from "react";

interface UseDmReadReceiptsOptions {
    messages: Array<{ senderId: string; sequenceNumber: number }>;
    currentUserId: string | undefined;
    otherUserId: string | undefined;
    conversationId: string;
}

/**
 * Sends encrypted read receipts when new messages from the other user are seen.
 * Fire-and-forget — receipt failures don't block UX.
 */
export function useDmReadReceipts({
    messages,
    currentUserId,
    otherUserId,
    conversationId,
}: UseDmReadReceiptsOptions) {
    const convex = useConvex();
    const sendFanOut = useMutation(api.dm.sendFanOut);
    const lastSeenSeqRef = useRef(0);

    useEffect(() => {
        if (!messages.length || !currentUserId || !otherUserId) return;

        const otherMessages = messages.filter((m) => m.senderId !== currentUserId);
        if (!otherMessages.length) return;
        const highestSeq = Math.max(...otherMessages.map((m) => m.sequenceNumber));

        if (highestSeq <= lastSeenSeqRef.current) return;
        lastSeenSeqRef.current = highestSeq;

        (async () => {
            try {
                const recipientDevices = await convex.query(
                    api.deviceKeys.getDevicesForUser,
                    { userId: otherUserId as Id<"users"> },
                );
                const myDevices = await convex.query(
                    api.deviceKeys.getDevicesForUser,
                    { userId: currentUserId as Id<"users"> },
                );
                const receiptPayload = JSON.stringify({ readUpTo: highestSeq });
                const { envelopes } = await prepareEnvelopes(
                    receiptPayload,
                    recipientDevices,
                    myDevices,
                    "receipt",
                );
                await sendFanOut({
                    conversationId: conversationId as Id<"dmConversations">,
                    envelopes: envelopes as any,
                });
            } catch {
                // Non-critical — don't block UX for receipt failures
            }
        })();
    }, [messages, currentUserId, otherUserId, conversationId, convex, sendFanOut]);
}
