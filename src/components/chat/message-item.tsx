import { MessageReactions } from '@/components/chat/message-reactions';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { Pressable, StyleSheet } from 'react-native';

interface Reaction {
    emoji: string;
    userId: string;
}

interface MessageItemProps {
    messageId: string;
    nickname?: string;
    content: string;
    createdAt: number;
    deleted?: boolean;
    isOwnMessage: boolean;
    reactions?: Reaction[];
    currentUserId?: string;
    onToggleReaction?: (messageId: string, emoji: string) => void;
    onLongPress?: () => void;
}

export function MessageItem({
    messageId,
    nickname,
    content,
    createdAt,
    deleted,
    isOwnMessage,
    reactions = [],
    currentUserId,
    onToggleReaction,
    onLongPress,
}: MessageItemProps) {
    const time = new Date(createdAt).toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
    });

    return (
        <Pressable onLongPress={onLongPress} delayLongPress={300}>
            <ThemedView style={[styles.container, isOwnMessage && styles.containerRight]}>
                {!isOwnMessage && (
                    <ThemedText type="smallBold">{nickname ?? 'Unknown'}</ThemedText>
                )}
                <ThemedText style={isOwnMessage && !deleted ? styles.ownMessage : styles.content}>
                    {content}
                </ThemedText>
                <MessageReactions
                    reactions={reactions}
                    currentUserId={currentUserId}
                    onToggle={(emoji) => onToggleReaction?.(messageId, emoji)}
                />
                <ThemedText type="small" themeColor="textSecondary">{time}</ThemedText>
            </ThemedView>
        </Pressable>
    );
}

const styles = StyleSheet.create({
    container: {
        paddingVertical: Spacing.two,
        paddingHorizontal: Spacing.three,
        maxWidth: '70%',
        alignSelf: 'flex-start',
        borderTopLeftRadius: 16,
        borderTopRightRadius: 16,
        borderBottomLeftRadius: 16,
        borderBottomWidth: 1,
        borderColor: 'rgba(0, 0, 0, 0.1)',
        borderBottomRightRadius: 16,
    },
    containerRight: {
        alignSelf: 'flex-end',
        borderTopLeftRadius: 16,
        borderBottomRightRadius: 16,
        borderTopRightRadius: 16,
        borderBottomLeftRadius: 4,
    },
    content: {
        marginTop: 2,
        paddingVertical: Spacing.one,
        paddingHorizontal: Spacing.three,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: 'rgba(0, 0, 0, 0.1)',
        backgroundColor: 'transparent',
    },
    ownMessage: {
        color: '#fff',
        backgroundColor: '#55a5faff',
        borderWidth: 0,
    },
    deleted: {
        opacity: 0.5,
    },
});
