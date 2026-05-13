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
    loadingMore: boolean;
    flatListRef: RefObject<FlatList | null>;
    onEndReached: () => void;
    onToggleReaction: (messageId: string, emoji: string) => void;
    onSelectMessage: (message: ChatMessageSnapshot) => void;
}

export function ChatMessageList({
    messages,
    currentUserId,
    loadingMore,
    flatListRef,
    onEndReached,
    onToggleReaction,
    onSelectMessage,
}: ChatMessageListProps) {
    const renderItem = useCallback(({ item }: { item: any }) => (
        <MessageItem
            messageId={item._id}
            nickname={item.nickname}
            avatarUrl={item.avatarUrl}
            content={item.content}
            createdAt={item.createdAt}
            editedAt={item.editedAt}
            deleted={item.deleted}
            parentMessage={item.parentMessage}
            isOwnMessage={item.userId === currentUserId}
            reactions={item.reactions}
            currentUserId={currentUserId}
            imageUrl={item.imageUrl}
            onToggleReaction={onToggleReaction}
            onLongPress={() => onSelectMessage(item)}
        />
    ), [currentUserId, onSelectMessage, onToggleReaction]);

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
