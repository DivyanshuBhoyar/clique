import { useCallback, useEffect, useRef, useState } from 'react';

import { NewMessageBubbleChannel } from '@/components/chat/new-message-bubble';

type UnreadBubbleChannel = NewMessageBubbleChannel & {
    lastMessageAt: number;
};

interface OtherUnreadSummary {
    activeChannelId: string;
    totalUnread: number;
    channels: UnreadBubbleChannel[];
}

interface UnreadSnapshot {
    activeChannelId: string;
    channels: Map<string, { unreadCount: number; lastMessageAt: number }>;
}

export function useOtherChannelUnreadBubble(
    channelId: string | undefined,
    otherUnreadSummary: OtherUnreadSummary | undefined,
) {
    const [bubbleChannel, setBubbleChannel] = useState<NewMessageBubbleChannel | null>(null);
    const [extraChannelCount, setExtraChannelCount] = useState(0);
    const unreadSnapshotRef = useRef<UnreadSnapshot | null>(null);
    const bubbleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const dismissBubble = useCallback(() => {
        setBubbleChannel(null);
        setExtraChannelCount(0);
        if (bubbleTimerRef.current) {
            clearTimeout(bubbleTimerRef.current);
            bubbleTimerRef.current = null;
        }
    }, []);

    useEffect(() => {
        dismissBubble();
        unreadSnapshotRef.current = null;
    }, [channelId, dismissBubble]);

    useEffect(() => {
        return () => {
            if (bubbleTimerRef.current) clearTimeout(bubbleTimerRef.current);
        };
    }, []);

    useEffect(() => {
        if (!channelId || !otherUnreadSummary) return;
        if (otherUnreadSummary.activeChannelId !== channelId) return;

        const nextSnapshot = new Map(
            otherUnreadSummary.channels.map((channel) => [
                channel.channelId,
                { unreadCount: channel.unreadCount, lastMessageAt: channel.lastMessageAt },
            ]),
        );

        const previousSnapshot = unreadSnapshotRef.current;
        unreadSnapshotRef.current = {
            activeChannelId: channelId,
            channels: nextSnapshot,
        };

        if (!previousSnapshot || previousSnapshot.activeChannelId !== channelId) return;

        const changedChannels = otherUnreadSummary.channels.filter((channel) => {
            const previous = previousSnapshot.channels.get(channel.channelId);
            if (!previous) return channel.unreadCount > 0;
            return channel.lastMessageAt > previous.lastMessageAt || channel.unreadCount > previous.unreadCount;
        });

        if (changedChannels.length === 0) return;

        const latestChannel = [...changedChannels].sort((a, b) => b.lastMessageAt - a.lastMessageAt)[0];
        const extraCount = otherUnreadSummary.channels.filter(
            (channel) => channel.channelId !== latestChannel.channelId,
        ).length;

        setBubbleChannel(latestChannel);
        setExtraChannelCount(extraCount);

        if (bubbleTimerRef.current) clearTimeout(bubbleTimerRef.current);
        bubbleTimerRef.current = setTimeout(() => {
            setBubbleChannel(null);
            setExtraChannelCount(0);
            bubbleTimerRef.current = null;
        }, 4000);
    }, [channelId, otherUnreadSummary]);

    return {
        bubbleChannel,
        extraChannelCount,
        dismissBubble,
    };
}
