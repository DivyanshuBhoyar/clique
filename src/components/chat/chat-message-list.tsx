import { RefObject, useCallback } from 'react';
import { FlatList, Keyboard, Pressable, StyleSheet } from 'react-native';

import { MessageItem } from '@/components/chat/message-item';
import { ChatMessageSnapshot } from '@/components/chat/types';
import { ThemedText } from '@/components/themed-text';
import { EmptyState } from '@/components/ui/empty-state';
import { Spacing } from '@/constants/theme';

interface ChatMessageListProps {
    messages: any[];
    currentUserId?: string;
    readReceipts?: { userId: string; nickname: string; lastReadAt: number }[];
    loadingMore: boolean;
    flatListRef: RefObject<FlatList | null>;
    onEndReached: () => void;
    onToggleReaction: (messageId: string, emoji: string) => void;
    onSelectMessage: (message: ChatMessageSnapshot) => void;
    onReplyToMessage: (message: ChatMessageSnapshot) => void;
}

export function ChatMessageList({
    messages,
    currentUserId,
    readReceipts = [],
    loadingMore,
    flatListRef,
    onEndReached,
    onToggleReaction,
    onSelectMessage,
    onReplyToMessage,
}: ChatMessageListProps) {
    const latestOwnMessageId = messages.find((message) => message.userId === currentUserId && !message.deleted)?._id;

    const renderItem = useCallback(({ item }: { item: any }) => {
        const isOwnMessage = item.userId === currentUserId;
        const readers = isOwnMessage && item._id === latestOwnMessageId
            ? readReceipts.filter((receipt) => receipt.lastReadAt >= item.createdAt)
            : [];
        const seenByText = readers.length > 0
            ? readers.length <= 2
                ? `Seen by ${readers.map((reader) => reader.nickname).join(', ')}`
                : `Seen by ${readers.length}`
            : null;

        return (
            <MessageItem
                messageId={item._id}
                nickname={item.nickname}
                avatarUrl={item.avatarUrl}
                content={item.content}
                createdAt={item.createdAt}
                editedAt={item.editedAt}
                deleted={item.deleted}
                parentMessage={item.parentMessage}
                isOwnMessage={isOwnMessage}
                reactions={item.reactions}
                currentUserId={currentUserId}
                imageUrl={item.imageUrl}
                seenByText={seenByText}
                onToggleReaction={onToggleReaction}
                onLongPress={() => onSelectMessage(item)}
                onSwipeReply={!item.deleted ? () => onReplyToMessage(item) : undefined}
            />
        );
    }, [currentUserId, latestOwnMessageId, onReplyToMessage, onSelectMessage, onToggleReaction, readReceipts]);

    if (messages.length === 0) {
        return (
            <EmptyState
                emoji="👋"
                title="No messages yet"
                subtitle="Be the first to say something!"
            />
        );
    }

    return (
        <Pressable style={styles.inner} onPress={Keyboard.dismiss}>
            <FlatList
                ref={flatListRef}
                data={messages}
                keyExtractor={(item) => item._id}
                renderItem={renderItem}
                inverted
                initialNumToRender={15}
                maxToRenderPerBatch={10}
                windowSize={10}
                contentContainerStyle={styles.listContent}
                keyboardShouldPersistTaps="handled"
                onEndReached={onEndReached}
                onEndReachedThreshold={0.5}
                ListFooterComponent={loadingMore ? (
                    <ThemedText />
                ) : null}
            />
        </Pressable>
    );
}

const styles = StyleSheet.create({
    inner: { flex: 1 },
    listContent: { paddingVertical: Spacing.sm },
});
