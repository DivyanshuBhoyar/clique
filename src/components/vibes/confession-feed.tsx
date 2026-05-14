import { ThemedText } from '@/components/themed-text';
import { LinkPreviewCard } from '@/components/ui/link-preview-card';
import { LinkifiedText } from '@/components/ui/linkified-text';
import { LineHeight, Radius, Spacing, Typography, Weight } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { lightImpact } from '@/utils/haptics';
import { extractUrls } from '@/utils/links';
import { Pressable, StyleSheet, View } from 'react-native';

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
    onMoreReaction?: (confessionId: string) => void;
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

export function ConfessionFeed({ confessions, onToggleReaction, onMoreReaction, onLoadMore, hasMore }: ConfessionFeedProps) {
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
            {confessions.map((confession) => {
                const firstUrl = extractUrls(confession.content)[0]?.url;

                return (
                    <View key={confession._id} style={[styles.card, { borderColor: theme.outline, backgroundColor: theme.surface }]}> 
                        <LinkifiedText type="small" style={styles.content}>{confession.content}</LinkifiedText>
                        {firstUrl ? <LinkPreviewCard url={firstUrl} compact /> : null}

                        <View style={styles.metaRow}>
                            <ThemedText type="caption" themeColor="textTertiary">
                                {timeAgo(confession.createdAt)}
                            </ThemedText>
                        </View>

                        <View style={styles.reactionsRow}>
                            {confession.reactions.map((r) => (
                                <Pressable
                                    key={r.emoji}
                                    style={[
                                        styles.reactionChip,
                                        {
                                            backgroundColor: r.hasReacted ? theme.accentSoft : theme.backgroundElement,
                                            borderColor: r.hasReacted ? theme.accent : theme.outlineLight,
                                        },
                                    ]}
                                    onPress={() => { lightImpact(); onToggleReaction(confession._id, r.emoji); }}
                                >
                                    <ThemedText style={styles.reactionEmoji}>{r.emoji}</ThemedText>
                                    <ThemedText type="caption" style={{ fontWeight: r.hasReacted ? Weight.bold : Weight.regular }}>{r.count}</ThemedText>
                                </Pressable>
                            ))}

                            <View style={styles.quickReactions}>
                                {QUICK_REACTIONS.map((emoji) => {
                                    const alreadyReacted = confession.reactions.find(
                                        (r) => r.emoji === emoji && r.hasReacted
                                    );
                                    if (alreadyReacted) return null;

                                    return (
                                        <Pressable
                                            key={emoji}
                                            style={[styles.quickBtn, { borderColor: theme.outlineLight }]}
                                            onPress={() => { lightImpact(); onToggleReaction(confession._id, emoji); }}
                                        >
                                            <ThemedText style={styles.quickEmoji}>{emoji}</ThemedText>
                                        </Pressable>
                                    );
                                })}
                                {onMoreReaction ? (
                                    <Pressable
                                        style={[styles.quickBtn, styles.moreBtn, { borderColor: theme.dashedBorder }]}
                                        onPress={() => onMoreReaction(confession._id)}
                                        accessibilityRole="button"
                                        accessibilityLabel="Pick another confession reaction"
                                    >
                                        <ThemedText style={[styles.quickEmoji, { color: theme.textSecondary }]}>+</ThemedText>
                                    </Pressable>
                                ) : null}
                            </View>
                        </View>
                    </View>
                );
            })}

            {hasMore && (
                <Pressable onPress={onLoadMore} style={[styles.loadMore, { borderColor: theme.outlineLight }]}>
                    <ThemedText type="small" themeColor="textSecondary">Load more →</ThemedText>
                </Pressable>
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
        borderRadius: Radius.lg,
        padding: Spacing.lg,
        gap: Spacing.sm,
    },
    content: {
        lineHeight: LineHeight.subtitle,
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
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: Radius.full,
        paddingHorizontal: Spacing.sm,
        paddingVertical: Spacing.xs,
        gap: 3,
        borderWidth: 1.5,
    },
    reactionEmoji: {
        fontSize: Typography.small,
    },
    quickReactions: {
        flexDirection: "row",
        gap: Spacing.xs,
    },
    quickBtn: {
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: Radius.full,
        borderWidth: 1,
        minWidth: 28,
        alignItems: 'center',
    },
    moreBtn: {
        borderStyle: 'dashed',
    },
    quickEmoji: {
        fontSize: Typography.small,
        opacity: 0.5,
    },
    loadMore: {
        paddingVertical: Spacing.sm,
        alignItems: 'center',
        borderWidth: 1.5,
        borderRadius: Radius.full,
    },
});
