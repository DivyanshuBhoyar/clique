import { ThemedText } from "@/components/themed-text";
import { Radius, Spacing } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";
import { StyleSheet, TouchableOpacity, View } from "react-native";

interface ConfessionReaction {
    emoji: string;
    count: number;
    hasReacted: boolean;
}

interface Confession {
    _id: string;
    content: string;
    createdAt: number;
    reactions: ConfessionReaction[];
}

interface ConfessionFeedProps {
    confessions: Confession[];
    onToggleReaction: (confessionId: string, emoji: string) => void;
    onLoadMore: () => void;
    hasMore: boolean;
}

const QUICK_REACTIONS = ["❤️", "😂", "😮", "🔥"];

function timeAgo(timestamp: number): string {
    const diff = Date.now() - timestamp;
    const minutes = Math.floor(diff / (1000 * 60));
    if (minutes < 1) return "just now";
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
}

export function ConfessionFeed({ confessions, onToggleReaction, onLoadMore, hasMore }: ConfessionFeedProps) {
    const theme = useTheme();

    if (confessions.length === 0) {
        return (
            <View style={styles.emptyState}>
                <ThemedText type="small" themeColor="textSecondary">
                    No confessions yet. Be the first to spill...
                </ThemedText>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            {confessions.map((confession) => (
                <View key={confession._id} style={[styles.card, { borderColor: theme.outline, backgroundColor: theme.surface }]}>
                    <ThemedText type="small" style={styles.content}>{confession.content}</ThemedText>

                    <View style={styles.metaRow}>
                        <ThemedText type="caption" themeColor="textTertiary">
                            {timeAgo(confession.createdAt)}
                        </ThemedText>
                    </View>

                    <View style={styles.reactionsRow}>
                        {confession.reactions.map((r) => (
                            <TouchableOpacity
                                key={r.emoji}
                                style={[
                                    styles.reactionChip,
                                    {
                                        backgroundColor: r.hasReacted ? theme.accentSoft : theme.backgroundElement,
                                        borderColor: r.hasReacted ? theme.accent : theme.outlineLight,
                                    },
                                ]}
                                onPress={() => onToggleReaction(confession._id, r.emoji)}
                            >
                                <ThemedText style={styles.reactionEmoji}>{r.emoji}</ThemedText>
                                <ThemedText type="caption">{r.count}</ThemedText>
                            </TouchableOpacity>
                        ))}

                        <View style={styles.quickReactions}>
                            {QUICK_REACTIONS.map((emoji) => {
                                const alreadyReacted = confession.reactions.find(
                                    (r) => r.emoji === emoji && r.hasReacted
                                );
                                if (alreadyReacted) return null;

                                return (
                                    <TouchableOpacity
                                        key={emoji}
                                        style={styles.quickBtn}
                                        onPress={() => onToggleReaction(confession._id, emoji)}
                                    >
                                        <ThemedText style={styles.quickEmoji}>{emoji}</ThemedText>
                                    </TouchableOpacity>
                                );
                            })}
                        </View>
                    </View>
                </View>
            ))}

            {hasMore && (
                <TouchableOpacity onPress={onLoadMore} style={styles.loadMore}>
                    <ThemedText type="small" themeColor="textSecondary">
                        Load more
                    </ThemedText>
                </TouchableOpacity>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        gap: Spacing.sm,
    },
    emptyState: {
        paddingVertical: Spacing.lg,
        alignItems: "center",
    },
    card: {
        borderWidth: 2,
        borderRadius: Radius.md,
        padding: Spacing.lg,
        gap: Spacing.sm,
    },
    content: {
        lineHeight: 20,
    },
    metaRow: {
        flexDirection: "row",
        justifyContent: "flex-end",
    },
    reactionsRow: {
        flexDirection: "row",
        flexWrap: "wrap",
        gap: Spacing.xs,
        alignItems: "center",
    },
    reactionChip: {
        flexDirection: "row",
        alignItems: "center",
        borderRadius: Radius.sm,
        paddingHorizontal: Spacing.sm,
        paddingVertical: Spacing.xs,
        gap: 3,
        borderWidth: 1.5,
    },
    reactionEmoji: {
        fontSize: 13,
    },
    quickReactions: {
        flexDirection: "row",
        gap: Spacing.xs,
    },
    quickBtn: {
        paddingHorizontal: 6,
        paddingVertical: 2,
    },
    quickEmoji: {
        fontSize: 14,
        opacity: 0.5,
    },
    loadMore: {
        paddingVertical: Spacing.sm,
        alignItems: "center",
    },
});
