import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

interface MessageActionsProps {
    visible: boolean;
    isOwnMessage: boolean;
    onClose: () => void;
    onDelete: () => void;
    onReact: (emoji: string) => void;
}

const REACTIONS = ['👍', '❤️', '😂', '🔥', '👀'];

export function MessageActions({ visible, isOwnMessage, onClose, onDelete, onReact }: MessageActionsProps) {
    const theme = useTheme();

    if (!visible) return null;

    return (
        <Modal transparent animationType="fade" onRequestClose={onClose}>
            <Pressable style={styles.overlay} onPress={onClose}>
                <View style={[styles.sheet, { backgroundColor: theme.surface, borderColor: theme.outline, borderTopWidth: 2 }]}>
                    <View style={[styles.reactionRow, { borderBottomColor: theme.outlineLight }]}>
                        {REACTIONS.map((emoji) => (
                            <Pressable
                                key={emoji}
                                onPress={() => { onReact(emoji); onClose(); }}
                                style={styles.reactionButton}
                                accessibilityRole="button"
                                accessibilityLabel={`React with ${emoji}`}
                            >
                                <Text style={styles.emoji}>{emoji}</Text>
                            </Pressable>
                        ))}
                    </View>

                    {isOwnMessage && (
                        <Pressable
                            onPress={() => { onDelete(); onClose(); }}
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
        fontSize: 28,
    },
    actionButton: {
        paddingVertical: Spacing.lg,
        alignItems: 'center',
        minHeight: 48,
        justifyContent: 'center',
        borderBottomWidth: 1,
    },
    deleteText: {
        fontSize: 16,
        fontWeight: '600',
    },
});
