import { Spacing } from '@/constants/theme';
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
                <View style={[styles.sheet, { backgroundColor: theme.background }]}>
                    {/* Reaction row */}
                    <View style={styles.reactionRow}>
                        {REACTIONS.map((emoji) => (
                            <Pressable
                                key={emoji}
                                onPress={() => { onReact(emoji); onClose(); }}
                                style={styles.reactionButton}
                            >
                                <Text style={styles.emoji}>{emoji}</Text>
                            </Pressable>
                        ))}
                    </View>

                    {/* Delete — only for own messages */}
                    {isOwnMessage && (
                        <Pressable
                            onPress={() => { onDelete(); onClose(); }}
                            style={[styles.actionButton, styles.deleteButton]}
                        >
                            <Text style={styles.deleteText}>Delete</Text>
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
        borderTopLeftRadius: 16,
        borderTopRightRadius: 16,
        paddingBottom: Spacing.five,
    },
    reactionRow: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        paddingVertical: Spacing.three,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(0,0,0,0.1)',
    },
    reactionButton: {
        padding: Spacing.two,
    },
    emoji: {
        fontSize: 28,
    },
    actionButton: {
        paddingVertical: Spacing.three,
        alignItems: 'center',
    },
    deleteButton: {
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(0,0,0,0.1)',
    },
    deleteText: {
        color: '#FF3B30',
        fontSize: 16,
        fontWeight: '600',
    },
});
