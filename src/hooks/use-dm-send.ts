import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import * as localDb from "@/lib/local-db";
import { prepareEnvelopes } from "@/lib/messaging";
import { successNotification } from "@/utils/haptics";
import { useConvex, useMutation } from "convex/react";
import { useCallback, useState } from "react";
import { v4 as uuid } from "uuid";

interface UseDmSendOptions {
    conversationId: string;
    otherUserId: string | undefined;
    currentUserId: string | undefined;
    refresh: () => void;
}

/**
 * Encapsulates the E2EE send flow:
 * persist local pending row → fetch device keys → encrypt → fan-out → ack local row
 */
export function useDmSend({ conversationId, otherUserId, currentUserId, refresh }: UseDmSendOptions) {
    const convex = useConvex();
    const sendFanOut = useMutation(api.dm.sendFanOut);
    const [sending, setSending] = useState(false);

    const getDeviceLists = useCallback(async () => {
        if (!otherUserId || !currentUserId) throw new Error("Missing user IDs");
        const recipientDevices = await convex.query(
            api.deviceKeys.getDevicesForUser,
            { userId: otherUserId as Id<"users"> },
        );
        const myDevices = await convex.query(
            api.deviceKeys.getDevicesForUser,
            { userId: currentUserId as Id<"users"> },
        );
        return { recipientDevices, myDevices };
    }, [convex, otherUserId, currentUserId]);

    const sendMessage = useCallback(async (text: string) => {
        if (sending || !currentUserId) return;
        setSending(true);
        const messageId = uuid();
        try {
            await localDb.insertMessage({
                messageId,
                conversationId,
                senderId: currentUserId,
                text,
                serverTimestamp: Date.now(),
                sequenceNumber: 0,
                status: "sending",
            });
            refresh();

            const { recipientDevices, myDevices } = await getDeviceLists();
            const { envelopes } = await prepareEnvelopes(text, recipientDevices, myDevices, "message", messageId);
            const sent = await sendFanOut({ conversationId: conversationId as Id<"dmConversations">, envelopes: envelopes as any });

            await localDb.ackSentMessage(
                messageId,
                sent.serverTimestamp,
                sent.sequenceNumber,
            );

            successNotification();
            refresh();
        } catch (error) {
            await localDb.updateMessageStatus(messageId, "failed");
            refresh();
            console.warn("Failed to send DM", error);
        } finally {
            setSending(false);
        }
    }, [sending, currentUserId, conversationId, getDeviceLists, sendFanOut, refresh]);

    const sendDelete = useCallback(async (messageId: string) => {
        try {
            const { recipientDevices, myDevices } = await getDeviceLists();
            const payload = JSON.stringify({ deleteMessageId: messageId });
            const { envelopes } = await prepareEnvelopes(payload, recipientDevices, myDevices, "delete");
            await sendFanOut({ conversationId: conversationId as Id<"dmConversations">, envelopes: envelopes as any });
            await localDb.deleteMessage(messageId);
            refresh();
        } catch {
            // Caller can handle via toast if needed
            throw new Error("Failed to delete");
        }
    }, [conversationId, getDeviceLists, sendFanOut, refresh]);

    return { sendMessage, sendDelete, sending };
}
