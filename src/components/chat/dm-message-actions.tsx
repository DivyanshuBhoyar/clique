/**
 * DM Message Actions — bottom sheet for long-pressed messages.
 * Supports: quick-react strip, Reply, Copy, Delete (own messages only).
 */
import { Radius, Spacing, Typography, Weight } from "@/constants/theme";
import { useMostUsedEmojis } from "@/hooks/use-most-used-emojis";
import { useTheme } from "@/hooks/use-theme";
import { heavyImpact, lightImpact } from "@/utils/haptics";
import { ClipboardCopy, Plus, Reply, Trash2 } from "lucide-react-native";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";

interface DmMessageActionsProps {
    visible: boolean;
    isOwnMessage: boolean;
    onClose: () => void;
    onCopy: () => void;
    onReply: () => void;
    onDelete?: () => void;
    onReact?: (emoji: string) => void;
    onMoreReactions?: () => void;
}

export function DmMessageActions({
    visible,
    isOwnMessage,
    onClose,
    onCopy,
    onReply,
    onDelete,
    onReact,
    onMoreReactions,
}: DmMessageActionsProps) {
    const theme = useTheme();
    const { mostUsedEmojis, recordEmojiUsage } = useMostUsedEmojis(5);

    if (!visible) return null;

    return (
        <Modal transparent animationType="fade" onRequestClose={onClose}>
            <Pressable style={styles.overlay} onPress={onClose}>
                <View style={[styles.sheet, { backgroundColor: theme.surface, borderColor: theme.outline }]}>
                    {/* Quick emoji reactions */}
                    {onReact && (
                        <View style={[styles.quickReactRow, { borderBottomColor: theme.outlineLight }]}>
                            {mostUsedEmojis.map((emoji) => (
                                <Pressable
                                    key={emoji}
                                    onPress={() => {
                                        lightImpact();
                                        recordEmojiUsage(emoji);
                                        onReact(emoji);
                                        onClose();
                                    }}
                                    style={({ pressed }) => [
                                        styles.quickEmoji,
                                        { backgroundColor: pressed ? theme.backgroundElement : "transparent" },
                                    ]}
                                    accessibilityRole="button"
                                    accessibilityLabel={`React with ${emoji}`}
                                >
                                    <Text style={styles.quickEmojiText}>{emoji}</Text>
                                </Pressable>
                            ))}
                            {onMoreReactions && (
                                <Pressable
                                    onPress={() => {
                                        lightImpact();
                                        onMoreReactions();
                                        onClose();
                                    }}
                                    style={({ pressed }) => [
                                        styles.quickEmoji,
                                        { backgroundColor: pressed ? theme.backgroundElement : "transparent" },
                                    ]}
                                    accessibilityRole="button"
                                    accessibilityLabel="Open full emoji picker"
                                >
                                    <Plus size={24} color={theme.textSecondary} strokeWidth={2.5} />
                                </Pressable>
                            )}
                        </View>
                    )}

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

                    <Pressable
                        onPress={() => { onCopy(); onClose(); }}
                        style={[styles.actionRow, { borderBottomColor: theme.outlineLight }]}
                        accessibilityRole="button"
                        accessibilityLabel="Copy message text"
                    >
                        <ClipboardCopy size={18} color={theme.text} strokeWidth={2} />
                        <Text style={{ color: theme.text, fontSize: Typography.body, fontWeight: Weight.medium }}>
                            Copy
                        </Text>
                    </Pressable>

                    {isOwnMessage && onDelete && (
                        <Pressable
                            onPress={() => { heavyImpact(); onDelete(); onClose(); }}
                            style={[styles.actionRow, { borderBottomColor: theme.outlineLight }]}
                            accessibilityRole="button"
                            accessibilityLabel="Delete message"
                        >
                            <Trash2 size={18} color={theme.error} strokeWidth={2} />
                            <Text style={{ color: theme.error, fontSize: Typography.body, fontWeight: Weight.semibold }}>
                                Delete
                            </Text>
                        </Pressable>
                    )}

                    <Pressable onPress={onClose} style={styles.cancelRow}>
                        <Text style={{ color: theme.textSecondary, fontSize: Typography.body }}>
                            Cancel
                        </Text>
                    </Pressable>
                </View>
            </Pressable>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        justifyContent: "flex-end",
        backgroundColor: "rgba(0,0,0,0.35)",
    },
    sheet: {
        borderTopLeftRadius: Radius.xl,
        borderTopRightRadius: Radius.xl,
        borderTopWidth: 2,
        paddingBottom: Spacing.xxxl,
    },
    quickReactRow: {
        flexDirection: "row",
        justifyContent: "space-around",
        paddingHorizontal: Spacing.lg,
        paddingVertical: Spacing.md,
        borderBottomWidth: 1,
    },
    quickEmoji: {
        width: 44,
        height: 44,
        borderRadius: Radius.full,
        alignItems: "center",
        justifyContent: "center",
    },
    quickEmojiText: {
        fontSize: 26,
    },
    actionRow: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: Spacing.sm,
        paddingVertical: Spacing.lg,
        borderBottomWidth: 1,
        minHeight: 48,
    },
    cancelRow: {
        paddingVertical: Spacing.lg,
        alignItems: "center",
        minHeight: 48,
    },
});
