import { useCallback, useEffect, useState } from 'react';

import { ChatMessageSnapshot, ChatReplyTarget, ChatSelectedMessage } from '@/components/chat/types';
import { Id } from '@/convex/_generated/dataModel';

function getMessagePreview(message: ChatMessageSnapshot) {
    if (message.deleted) return 'Message deleted';
    if (message.type === 'image') return message.content || '📷 Photo';
    return message.content;
}

export function useChatReplyTarget(channelId?: string) {
    const [selectedMessage, setSelectedMessage] = useState<ChatSelectedMessage | null>(null);
    const [replyTarget, setReplyTarget] = useState<ChatReplyTarget | null>(null);

    useEffect(() => {
        setSelectedMessage(null);
        setReplyTarget(null);
    }, [channelId]);

    const selectMessage = useCallback((message: ChatMessageSnapshot, currentUserId?: string) => {
        setSelectedMessage({
            id: message._id,
            isOwn: message.userId === currentUserId,
            nickname: message.nickname,
            content: getMessagePreview(message),
            deleted: message.deleted,
            type: message.type,
        });
    }, []);

    const startReplyToSelectedMessage = useCallback(() => {
        if (!selectedMessage) return;
        setReplyTarget({
            id: selectedMessage.id as Id<'messages'>,
            nickname: selectedMessage.nickname,
            content: selectedMessage.content,
        });
    }, [selectedMessage]);

    const startReplyToMessage = useCallback((message: ChatMessageSnapshot) => {
        setReplyTarget({
            id: message._id as Id<'messages'>,
            nickname: message.nickname,
            content: getMessagePreview(message),
        });
    }, []);

    const clearReplyTarget = useCallback(() => setReplyTarget(null), []);
    const clearSelectedMessage = useCallback(() => setSelectedMessage(null), []);

    return {
        selectedMessage,
        replyTarget,
        selectMessage,
        startReplyToSelectedMessage,
        startReplyToMessage,
        clearReplyTarget,
        clearSelectedMessage,
    };
}
