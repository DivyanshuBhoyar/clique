import { MessageReactions } from '@/components/chat/message-reactions';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { UserAvatar } from '@/components/user-avatar';
import { useTheme } from '@/hooks/use-theme';
import { Radius, Spacing } from '@/constants/theme';
import { Pressable, StyleSheet, View } from 'react-native';

interface Reaction {
    emoji: string;
    userId: string;
}

interface MessageItemProps {
    messageId: string;
    nickname?: string;
    avatarUrl?: string | null;
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
    avatarUrl,
    content,
    createdAt,
    deleted,
    isOwnMessage,
    reactions = [],
    currentUserId,
    onToggleReaction,
    onLongPress,
}: MessageItemProps) {
    const theme = useTheme();
    const time = new Date(createdAt).toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
    });

    return (
        <Pressable onLongPress={onLongPress} delayLongPress={300}>
            <View style={[styles.row, isOwnMessage && styles.rowRight]}>
                {!isOwnMessage && (
                    <UserAvatar uri={avatarUrl} size={28} fallbackText={nickname} />
                )}
                <View style={[
                    styles.container,
                    {
                        backgroundColor: isOwnMessage ? theme.bubbleOwn : theme.bubbleOther,
                        borderColor: isOwnMessage ? 'transparent' : theme.outline,
                        borderWidth: isOwnMessage ? 0 : 1.5,
                        borderTopLeftRadius: isOwnMessage ? Radius.lg : Radius.lg,
                        borderTopRightRadius: isOwnMessage ? Radius.lg : Radius.lg,
                        borderBottomLeftRadius: isOwnMessage ? Radius.lg : 4,
                        borderBottomRightRadius: isOwnMessage ? 4 : Radius.lg,
                    },
                ]}>
                    {!isOwnMessage && (
                        <ThemedText type="smallBold">{nickname ?? 'Unknown'}</ThemedText>
                    )}
                    <ThemedText style={[
                        styles.content,
                        { color: isOwnMessage ? theme.bubbleOwnText : theme.bubbleOtherText },
                    ]}>
                        {content}
                    </ThemedText>
                    <MessageReactions
                        reactions={reactions}
                        currentUserId={currentUserId}
                        onToggle={(emoji) => onToggleReaction?.(messageId, emoji)}
                    />
                    <ThemedText
                        type="caption"
                        style={{ color: isOwnMessage ? 'rgba(255,255,255,0.7)' : theme.textSecondary }}
                    >
                        {time}
                    </ThemedText>
                </View>
            </View>
        </Pressable>
    );
}

const styles = StyleSheet.create({
    row: {
        flexDirection: 'row',
        gap: Spacing.xs,
        marginBottom: Spacing.xs,
    },
    rowRight: {
        justifyContent: 'flex-end',
    },
    container: {
        paddingTop: Spacing.xs,
        paddingBottom: Spacing.xs,
        paddingHorizontal: Spacing.md,
        maxWidth: '75%',
        alignSelf: 'flex-start',
    },
    content: {
        marginTop: 1,
    },
});
