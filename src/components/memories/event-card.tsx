/**
 * EventCard — memory event card showing cover image / fallback gradient,
 * title, author, content stats, and reactions.
 *
 * Design from mockup:
 *   ┌──────────────────────────────────────┐
 *   │ [cover image or colour gradient]     │  ← 100px tall hero
 *   │ 🎉 Event / Trip          [badge]     │
 *   ├──────────────────────────────────────┤
 *   │ Title                                │
 *   │ 👤 by @nick  ·  2 reflections · 4📸 │
 *   │ ❤️2  🔥  +                           │
 *   └──────────────────────────────────────┘
 */
import { Image } from 'expo-image';
import { Bookmark, BookOpen, Camera, Link2 } from 'lucide-react-native';
import { GestureResponderEvent, Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { EmojiReactionStrip } from '@/components/ui/emoji-reaction-strip';
import { UserAvatar } from '@/components/user-avatar';
import { Radius, Shadows, Spacing, Typography, Weight } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { formatRelativeTime } from '@/utils/time';

interface Reaction {
    emoji: string;
    userId: string;
}

interface EventCardProps {
    memoryId?: string;
    title: string;
    coverUrl?: string | null;
    avatarUrl?: string | null;
    nickname: string;
    createdAt: number;
    reflectionCount: number;
    photoCount: number;
    linkCount: number;
    reactions: Reaction[];
    currentUserId?: string;
    onToggleReaction: (emoji: string) => void;
    onAddReaction?: () => void;
    isBookmarked?: boolean;
    onToggleBookmark?: (memoryId: string) => void;
}

// Warm pastel gradient cover fallback colours (index by title.length)
const COVER_COLORS = ['#F5C542', '#F4A261', '#E76F51', '#2A9D8F', '#457B9D'];

export function EventCard({
    memoryId,
    title,
    coverUrl,
    avatarUrl,
    nickname,
    createdAt,
    reflectionCount,
    photoCount,
    linkCount,
    reactions,
    currentUserId,
    onToggleReaction,
    onAddReaction,
    isBookmarked,
    onToggleBookmark,
}: EventCardProps) {
    const theme = useTheme();
    const fallbackColor = COVER_COLORS[title.length % COVER_COLORS.length];

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
            {/* Cover banner */}
            <View style={[styles.cover, { backgroundColor: fallbackColor }]}>
                {coverUrl ? (
                    <Image source={{ uri: coverUrl }} style={styles.coverImage} contentFit="cover" />
                ) : (
                    <ThemedText style={styles.coverEmoji}>🎉</ThemedText>
                )}
                {/* Event label */}
                <View style={[styles.eventBadge, { backgroundColor: 'rgba(0,0,0,0.45)' }]}>
                    <ThemedText style={styles.eventBadgeText}>Event / Trip</ThemedText>
                </View>
            </View>

            {/* Body */}
            <View style={styles.body}>
                <ThemedText style={styles.title} numberOfLines={1}>{title}</ThemedText>

                <View style={styles.authorRow}>
                    <UserAvatar uri={avatarUrl} size={16} fallbackText={nickname} />
                    <ThemedText type="caption" themeColor="textSecondary">
                        @{nickname} · {formatRelativeTime(createdAt)}
                    </ThemedText>
                </View>

                {/* Stats row */}
                {(reflectionCount > 0 || photoCount > 0 || linkCount > 0) && (
                    <View style={styles.statsRow}>
                        {reflectionCount > 0 && (
                            <View style={styles.statPill}>
                                <BookOpen size={11} color={theme.textSecondary} strokeWidth={2} />
                                <ThemedText type="caption" themeColor="textSecondary">{reflectionCount}</ThemedText>
                            </View>
                        )}
                        {photoCount > 0 && (
                            <View style={styles.statPill}>
                                <Camera size={11} color={theme.textSecondary} strokeWidth={2} />
                                <ThemedText type="caption" themeColor="textSecondary">{photoCount}</ThemedText>
                            </View>
                        )}
                        {linkCount > 0 && (
                            <View style={styles.statPill}>
                                <Link2 size={11} color={theme.textSecondary} strokeWidth={2} />
                                <ThemedText type="caption" themeColor="textSecondary">{linkCount}</ThemedText>
                            </View>
                        )}
                    </View>
                )}

                {/* Reactions */}
                {(groupedReactions.length > 0 || onAddReaction) && (
                    <EmojiReactionStrip
                        reactions={groupedReactions}
                        onToggle={onToggleReaction}
                        onAdd={onAddReaction}
                        compact
                    />
                )}

                {/* Bookmark */}
                {onToggleBookmark && memoryId && (
                    <View style={styles.bookmarkRow}>
                        <Pressable
                            onPress={(e: GestureResponderEvent) => { e.stopPropagation(); onToggleBookmark(memoryId); }}
                            hitSlop={8}
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
                )}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    card: {
        width: '100%',
        borderWidth: 2,
        borderRadius: Radius.lg,
        overflow: 'hidden',
    },
    cover: {
        height: 100,
        justifyContent: 'center',
        alignItems: 'center',
    },
    coverImage: {
        flex: 1,
        width: '100%',
    },
    coverEmoji: {
        fontSize: Typography.title,
    },
    eventBadge: {
        position: 'absolute',
        bottom: 8,
        left: 10,
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 10,
    },
    eventBadgeText: {
        color: '#fff',
        fontSize: Typography.caption,
        fontWeight: Weight.bold,
    },
    body: {
        padding: Spacing.lg,
        gap: Spacing.xs,
    },
    title: {
        fontSize: Typography.body,
        fontWeight: Weight.bold,
    },
    authorRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.xs,
    },
    statsRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.sm,
    },
    statPill: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 3,
    },
    bookmarkRow: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
    },
});
