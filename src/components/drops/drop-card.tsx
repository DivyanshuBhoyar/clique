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
import { useEffect } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';

import { CategoryChip } from '@/components/drops/category-chip';
import { VoteButtons } from '@/components/drops/vote-buttons';
import { ThemedText } from '@/components/themed-text';
import { EmojiReactionStack, EmojiReactionStrip } from '@/components/ui/emoji-reaction-strip';
import { LinkPreviewCard } from '@/components/ui/link-preview-card';
import { LinkifiedText } from '@/components/ui/linkified-text';
import { UserAvatar } from '@/components/user-avatar';
import { BorderWidth, LineHeight, Radius, Shadows, Spacing, Typography } from '@/constants/theme';
import { useReduceMotion } from '@/hooks/use-reduce-motion';
import { useTheme } from '@/hooks/use-theme';
import { extractUrls } from '@/utils/links';
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

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

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
    const reduceMotion = useReduceMotion();
    const time = formatRelativeTime(createdAt);
    const isDetail = !truncate;
    const firstUrl = extractUrls(content)[0]?.url;

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

    const bookmarkScale = useSharedValue(1);

    useEffect(() => {
        if (!isBookmarked) {
            bookmarkScale.value = withTiming(1, { duration: 120 });
            return;
        }
        bookmarkScale.value = reduceMotion
            ? withTiming(1.15, { duration: 120 }, () => {
                  bookmarkScale.value = withTiming(1, { duration: 120 });
              })
            : withSpring(1.22, { damping: 10, stiffness: 400, mass: 0.5 }, () => {
                  bookmarkScale.value = withSpring(1, { damping: 12, stiffness: 300, mass: 0.5 });
              });
    }, [isBookmarked, reduceMotion, bookmarkScale]);

    const bookmarkStyle = useAnimatedStyle(() => ({
        transform: [{ scale: bookmarkScale.value }],
    }));

    const bookmarkPressScale = useSharedValue(1);
    const bookmarkPressStyle = useAnimatedStyle(() => ({
        transform: [{ scale: bookmarkPressScale.value }],
    }));

    const handleBookmarkPressIn = () => {
        bookmarkPressScale.value = reduceMotion
            ? withTiming(0.88, { duration: 80 })
            : withSpring(0.85, { damping: 14, stiffness: 350, mass: 0.6 });
    };

    const handleBookmarkPressOut = () => {
        bookmarkPressScale.value = reduceMotion
            ? withTiming(1, { duration: 80 })
            : withSpring(1, { damping: 14, stiffness: 350, mass: 0.6 });
    };

    return (
        <View
            style={[
                styles.card,
                !isDetail && styles.listCard,
                {
                    backgroundColor: theme.surfaceWarm,
                    borderColor: isDetail ? theme.randomBg : theme.tabBarBorder,
                    shadowColor: theme.shadow,
                    shadowOffset: Shadows.sm.shadowOffset,
                    shadowOpacity: isDetail ? 0.05 : 0.01,
                    shadowRadius: Shadows.sm.shadowRadius,
                    elevation: isDetail ? 3 : 0,
                },
            ]}
        >
            {/* Header: category chip + time */}
            <View style={styles.header}>
                <CategoryChip category={category} />
                <ThemedText type="caption" themeColor="textSecondary" style={styles.timeText}>
                    {time}
                </ThemedText>
            </View>

            {/* Content */}
            <LinkifiedText
                style={styles.content}
                numberOfLines={truncate ? 3 : undefined}
                selectable={!truncate}
                linkColor={theme.featureAccentDark}
            >
                {content}
            </LinkifiedText>

            {firstUrl ? (
                <View style={styles.previewWrap} onStartShouldSetResponder={() => true}>
                    <LinkPreviewCard url={firstUrl} compact={truncate} soft={!isDetail} />
                </View>
            ) : null}

            <View
                style={[
                    styles.separator,
                    {
                        backgroundColor: isDetail ? theme.outlineLight : theme.tabBarBorder,
                        opacity: isDetail ? 0.85 : 0.55,
                    },
                ]}
            />

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
                        {nickname}
                    </ThemedText>
                </View>

                <View style={styles.footerActions}>
                    <VoteButtons
                        upvotes={upvotes}
                        downvotes={downvotes}
                        userVote={userVote}
                        onVote={(value) => onVote(dropId, value)}
                    />
                    <View style={styles.socialActions}>
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
                                <ThemedText type="caption" themeColor="textSecondary" style={styles.counterText}>
                                    {commentCount}
                                </ThemedText>
                            </View>
                        )}
                        <AnimatedPressable
                            onPress={() => onToggleBookmark?.(dropId)}
                            onPressIn={handleBookmarkPressIn}
                            onPressOut={handleBookmarkPressOut}
                            hitSlop={8}
                            style={[styles.bookmarkButton, bookmarkPressStyle]}
                            accessibilityRole="button"
                            accessibilityLabel={isBookmarked ? 'Remove bookmark' : 'Bookmark'}
                        >
                            <Animated.View style={bookmarkStyle}>
                                <Bookmark
                                    size={16}
                                    color={isBookmarked ? theme.accent : theme.textSecondary}
                                    fill={isBookmarked ? theme.accent : 'none'}
                                    strokeWidth={2}
                                />
                            </Animated.View>
                        </AnimatedPressable>
                    </View>
                </View>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    card: {
        width: '100%',
        paddingHorizontal: Spacing.lg,
        paddingVertical: Spacing.md,
        borderWidth: BorderWidth.thin,
        borderRadius: Radius.xl,
    },
    listCard: {
        paddingVertical: Spacing.md,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: Spacing.md,
        marginBottom: Spacing.md,
    },
    timeText: {
        flexShrink: 0,
        fontVariant: ['tabular-nums'],
    },
    content: {
        fontSize: Typography.body,
        lineHeight: LineHeight.body,
    },
    previewWrap: {
        marginTop: Spacing.sm,
    },
    separator: {
        height: StyleSheet.hairlineWidth,
        opacity: 0.85,
        marginTop: Spacing.md,
        marginBottom: Spacing.xs,
    },
    authorRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.xs,
        flex: 1,
        minWidth: 0,
        minHeight: 28,
    },
    footer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: Spacing.md,
        minHeight: 30,
    },
    footerActions: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'flex-end',
        gap: Spacing.md,
        flexShrink: 1,
        maxWidth: '76%',
        minHeight: 30,
    },
    detailReactionsRow: {
        paddingBottom: Spacing.md,
    },
    listReactionsStack: {
        maxWidth: 86,
        flexShrink: 1,
    },
    socialActions: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.xs,
        minHeight: 30,
    },
    bookmarkButton: {
        width: 28,
        minHeight: 30,
        alignItems: 'center',
        justifyContent: 'center',
    },
    commentPill: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: Spacing.xs,
        minHeight: 30,
        minWidth: 34,
    },
    counterText: {
        fontVariant: ['tabular-nums'],
    },
});
