/**
 * DropCard — the primary card for a single drop in list or detail view.
 *
 * Design from mockup:
 *   ┌──────────────────────────────────────┐  ← white bg, 2px border, 16px radius
 *   │ [Song 🎵 pill]          2 hours ago  │  ← header row
 *   │ Drop content                         │
 *   ├ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─  ┤  ← dashed separator
 *   │ @maya        ▲12▼ ❤️3 +   💬 4 🔖    │  ← compact context/actions row
 *   └──────────────────────────────────────┘
 *
 * The `truncate` prop limits content to 3 lines in the list view.
 */
import { Bookmark, MessageCircle } from 'lucide-react-native';
import { Pressable, StyleSheet, View } from 'react-native';

import { CategoryChip } from '@/components/drops/category-chip';
import { VoteButtons } from '@/components/drops/vote-buttons';
import { ThemedText } from '@/components/themed-text';
import { DashedSeparator } from '@/components/ui/dashed-separator';
import { EmojiReactionStack, EmojiReactionStrip } from '@/components/ui/emoji-reaction-strip';
import { UserAvatar } from '@/components/user-avatar';
import { LineHeight, Radius, Shadows, Spacing, Typography } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { formatRelativeTime } from '@/utils/time';

interface Reaction {
    emoji: string;
    userId: string;
}

interface DropCardProps {
    dropId: string;
    category: string;
    nickname: string;
    avatarUrl?: string | null;
    content: string;
    createdAt: number;
    commentCount: number;
    reactions: Reaction[];
    currentUserId?: string;
    onToggleReaction: (dropId: string, emoji: string) => void;
    onAddReaction?: (dropId: string) => void;
    truncate?: boolean;
    upvotes: number;
    downvotes: number;
    userVote: 'up' | 'down' | null;
    onVote: (dropId: string, value: 'up' | 'down') => void;
    isBookmarked?: boolean;
    onToggleBookmark?: (dropId: string) => void;
}

export function DropCard({
    dropId,
    category,
    nickname,
    avatarUrl,
    content,
    createdAt,
    commentCount,
    reactions,
    currentUserId,
    onToggleReaction,
    onAddReaction,
    truncate,
    upvotes,
    downvotes,
    userVote,
    onVote,
    isBookmarked,
    onToggleBookmark,
}: DropCardProps) {
    const theme = useTheme();
    const time = formatRelativeTime(createdAt);
    const isDetail = !truncate;

    // Convert raw reactions [{emoji, userId}] → grouped [{emoji, count, reacted}]
    const groupedReactions = (() => {
        const map = new Map<string, { count: number; reacted: boolean }>();
        for (const r of reactions) {
            const ex = map.get(r.emoji) ?? { count: 0, reacted: false };
            ex.count++;
            if (r.userId === currentUserId) ex.reacted = true;
            map.set(r.emoji, ex);
        }
        return [...map.entries()].map(([emoji, { count, reacted }]) => ({ emoji, count, reacted }));
    })();

    return (
        <View
            style={[
                styles.card,
                {
                    backgroundColor: theme.surface,
                    borderColor: theme.outline,
                    shadowColor: theme.shadow,
                    shadowOffset: Shadows.sm.offset,
                    shadowOpacity: Shadows.sm.opacity,
                    shadowRadius: Shadows.sm.radius,
                    elevation: 3,
                },
            ]}
        >
            {/* Header: category chip + time */}
            <View style={styles.header}>
                <CategoryChip category={category} />
                <ThemedText type="caption" themeColor="textSecondary">{time}</ThemedText>
            </View>

            {/* Content */}
            <ThemedText
                style={styles.content}
                numberOfLines={truncate ? 3 : undefined}
                selectable={!truncate}
            >
                {content}
            </ThemedText>

            <DashedSeparator />

            {isDetail && (groupedReactions.length > 0 || onAddReaction) && (
                <View style={styles.detailReactionsRow}>
                    <EmojiReactionStrip
                        reactions={groupedReactions}
                        onToggle={(emoji) => onToggleReaction(dropId, emoji)}
                        onAdd={onAddReaction ? () => onAddReaction(dropId) : undefined}
                        wrap
                    />
                </View>
            )}

            {/* Footer: author context + compact social actions. */}
            <View style={styles.footer} onStartShouldSetResponder={() => true}>
                <View style={styles.authorRow}>
                    <UserAvatar uri={avatarUrl} size={20} fallbackText={nickname} />
                    <ThemedText type="caption" themeColor="textSecondary" numberOfLines={1}>
                        @{nickname}
                    </ThemedText>
                </View>

                <View style={styles.footerActions}>
                    <VoteButtons
                        upvotes={upvotes}
                        downvotes={downvotes}
                        userVote={userVote}
                        onVote={(value) => onVote(dropId, value)}
                    />
                    {!isDetail && (groupedReactions.length > 0 || onAddReaction) && (
                        <View style={styles.listReactionsStack}>
                            <EmojiReactionStack
                                reactions={groupedReactions}
                                onToggle={(emoji) => onToggleReaction(dropId, emoji)}
                                onAdd={onAddReaction ? () => onAddReaction(dropId) : undefined}
                            />
                        </View>
                    )}
                    {commentCount >= 0 && (
                        <View style={styles.commentPill}>
                            <MessageCircle size={13} color={theme.textSecondary} strokeWidth={2} />
                            <ThemedText type="caption" themeColor="textSecondary">
                                {commentCount}
                            </ThemedText>
                        </View>
                    )}
                    <Pressable
                        onPress={() => onToggleBookmark?.(dropId)}
                        hitSlop={8}
                        style={styles.bookmarkButton}
                        accessibilityRole="button"
                        accessibilityLabel={isBookmarked ? 'Remove bookmark' : 'Bookmark'}
                    >
                        <Bookmark
                            size={16}
                            color={isBookmarked ? theme.accent : theme.textSecondary}
                            fill={isBookmarked ? theme.accent : 'none'}
                            strokeWidth={2}
                        />
                    </Pressable>
                </View>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    card: {
        width: '100%',
        padding: Spacing.lg,
        borderWidth: 2,
        borderRadius: Radius.lg,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: Spacing.sm,
    },
    content: {
        fontSize: Typography.body,
        lineHeight: LineHeight.body,
        marginBottom: Spacing.sm,
    },
    authorRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.xs,
        flex: 1,
        minWidth: 0,
    },
    footer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: Spacing.sm,
    },
    footerActions: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'flex-end',
        gap: Spacing.xs,
        flexShrink: 1,
        maxWidth: '72%',
    },
    detailReactionsRow: {
        paddingTop: Spacing.md,
        paddingBottom: Spacing.md,
    },
    listReactionsStack: {
        maxWidth: 86,
        flexShrink: 1,
    },
    bookmarkButton: {
        width: 28,
        height: 36,
        alignItems: 'flex-end',
        justifyContent: 'center',
    },
    commentPill: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 3,
    },
});
