import { Radius, Spacing, Typography, Weight } from '@/constants/theme';
import { useMostUsedEmojis } from '@/hooks/use-most-used-emojis';
import { useTheme } from '@/hooks/use-theme';
import { heavyImpact, lightImpact } from '@/utils/haptics';
import { Bookmark, Reply } from 'lucide-react-native';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

interface MessageActionsProps {
    visible: boolean;
    isOwnMessage: boolean;
    isBookmarked?: boolean;
    onClose: () => void;
    onDelete: () => void;
    onReact: (emoji: string) => void;
    onReply?: () => void;
    onBookmark?: () => void;
    onMoreReactions?: () => void;
}

export function MessageActions({
    visible,
    isOwnMessage,
    isBookmarked,
    onClose,
    onDelete,
    onReact,
    onReply,
    onBookmark,
    onMoreReactions,
}: MessageActionsProps) {
    const theme = useTheme();
    const { mostUsedEmojis, recordEmojiUsage } = useMostUsedEmojis(5);

    if (!visible) return null;

    return (
        <Modal transparent animationType="fade" onRequestClose={onClose}>
            <Pressable style={styles.overlay} onPress={onClose}>
                <View style={[styles.sheet, { backgroundColor: theme.surface, borderColor: theme.outline, borderTopWidth: 2 }]}>
                    <View style={[styles.reactionRow, { borderBottomColor: theme.outlineLight }]}>
                        {mostUsedEmojis.map((emoji) => (
                            <Pressable
                                key={emoji}
                                onPress={() => {
                                    lightImpact();
                                    recordEmojiUsage(emoji);
                                    onReact(emoji);
                                    onClose();
                                }}
                                style={styles.reactionButton}
                                accessibilityRole="button"
                                accessibilityLabel={`React with ${emoji}`}
                            >
                                <Text style={styles.emoji}>{emoji}</Text>
                            </Pressable>
                        ))}
                        {onMoreReactions && (
                            <Pressable
                                onPress={() => { onMoreReactions(); onClose(); }}
                                style={styles.reactionButton}
                                accessibilityRole="button"
                                accessibilityLabel="Open full emoji picker"
                            >
                                <Text style={[styles.emoji, { color: theme.textSecondary }]}>+</Text>
                            </Pressable>
                        )}
                    </View>

                    {onReply && (
                        <Pressable
                            onPress={() => { onReply(); onClose(); }}
                            style={[styles.actionRow, { borderBottomColor: theme.outlineLight }]}
                            accessibilityRole="button"
                            accessibilityLabel="Reply to message"
                        >
                            <Reply size={18} color={theme.text} strokeWidth={2} />
                            <Text style={{ color: theme.text, fontSize: Typography.body, fontWeight: Weight.medium }}>
                                Reply
                            </Text>
                        </Pressable>
                    )}

                    {onBookmark && (
                        <Pressable
                            onPress={() => { onBookmark(); onClose(); }}
                            style={[styles.actionRow, { borderBottomColor: theme.outlineLight }]}
                            accessibilityRole="button"
                            accessibilityLabel={isBookmarked ? 'Remove bookmark' : 'Bookmark'}
                        >
                            <Bookmark
                                size={18}
                                color={isBookmarked ? theme.accent : theme.text}
                                fill={isBookmarked ? theme.accent : 'none'}
                                strokeWidth={2}
                            />
                            <Text style={{ color: theme.text, fontSize: Typography.body, fontWeight: Weight.medium }}>
                                {isBookmarked ? 'Remove bookmark' : 'Bookmark'}
                            </Text>
                        </Pressable>
                    )}

                    {isOwnMessage && (
                        <Pressable
                            onPress={() => { heavyImpact(); onDelete(); onClose(); }}
                            style={[styles.actionButton, { borderBottomColor: theme.outlineLight }]}
                            accessibilityRole="button"
                            accessibilityLabel="Delete message"
                        >
                            <Text style={[styles.deleteText, { color: theme.error }]}>Delete</Text>
                        </Pressable>
                    )}

                    <Pressable onPress={onClose} style={styles.actionButton}>
                        <Text style={{ color: theme.textSecondary }}>Cancel</Text>
                    </Pressable>
                </View>
            </Pressable>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        justifyContent: 'flex-end',
        backgroundColor: 'rgba(0,0,0,0.4)',
    },
    sheet: {
        borderTopLeftRadius: Radius.xl,
        borderTopRightRadius: Radius.xl,
        paddingBottom: Spacing.xxxl,
    },
    reactionRow: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        paddingVertical: Spacing.lg,
        borderBottomWidth: 1.5,
    },
    reactionButton: {
        padding: Spacing.sm,
        minHeight: 44,
        minWidth: 44,
        alignItems: 'center',
        justifyContent: 'center',
    },
    emoji: {
        fontSize: Typography.heading,
    },
    actionRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: Spacing.sm,
        paddingVertical: Spacing.lg,
        borderBottomWidth: 1,
    },
    actionButton: {
        paddingVertical: Spacing.lg,
        alignItems: 'center',
        minHeight: 48,
        justifyContent: 'center',
        borderBottomWidth: 1,
    },
    deleteText: {
        fontSize: Typography.body,
        fontWeight: Weight.semibold,
    },
});
