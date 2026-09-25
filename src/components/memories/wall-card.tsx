/**
 * WallCard — quote/memory card for the Wall tab.
 *
 * Design from mockup:
 *   ┌──────────────────────────────────────┐  ← white bg, 2px border, Radius.lg
 *   │ " (decorative, large, faded)         │
 *   │  Content text (3 lines max in list)  │
 *   ├─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─  ┤  ← DashedSeparator
 *   │ 😊 avatar @nick · 2h  💬 4 comments │
 *   │ ❤️3  🔥  +                           │  ← EmojiReactionStrip
 *   └──────────────────────────────────────┘
 */
import { MessageCircle } from 'lucide-react-native';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { DashedSeparator } from '@/components/ui/dashed-separator';
import { EmojiReactionStrip } from '@/components/ui/emoji-reaction-strip';
import { UserAvatar } from '@/components/user-avatar';
import { BorderWidth, LineHeight, Radius, Shadows, Spacing, Typography, Weight } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { formatRelativeTime } from '@/utils/time';

interface Reaction {
    emoji: string;
    userId: string;
}

interface WallCardProps {
    memoryId?: string;
    content: string;
    nickname: string;
    avatarUrl?: string | null;
    createdAt: number;
    reactions: Reaction[];
    commentCount: number;
    currentUserId?: string;
    onToggleReaction: (emoji: string) => void;
    onAddReaction?: () => void;
    truncate?: boolean;
    isBookmarked?: boolean;
    onToggleBookmark?: (memoryId: string) => void;
}

export function WallCard({
    memoryId,
    content,
    nickname,
    avatarUrl,
    createdAt,
    reactions,
    commentCount,
    currentUserId,
    onToggleReaction,
    onAddReaction,
    truncate,
}: WallCardProps) {
    const theme = useTheme();

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
                    borderColor: theme.cardBorder,
                    shadowColor: theme.shadow,
                    shadowOffset: Shadows.sm.shadowOffset,
                    shadowOpacity: Shadows.sm.shadowOpacity,
                    shadowRadius: Shadows.sm.shadowRadius,
                    elevation: 3,
                },
            ]}
        >
            {/* Decorative quote mark */}
            <ThemedText style={[styles.quoteMark, { color: theme.accent }]}>&ldquo;</ThemedText>

            {/* Memory content */}
            <ThemedText style={styles.text} numberOfLines={truncate ? 3 : undefined}>
                {content}
            </ThemedText>

            <DashedSeparator />

            {/* Footer: author + comment count + bookmark */}
            <View style={styles.footer}>
                <View style={styles.metaRow}>
                    <UserAvatar uri={avatarUrl} size={18} fallbackText={nickname} />
                    <ThemedText type="caption" themeColor="textSecondary">
                        {nickname} · {formatRelativeTime(createdAt)}
                    </ThemedText>
                </View>

                <View style={styles.footerRight}>
                    {commentCount > 0 && (
                        <View style={styles.commentPill}>
                            <MessageCircle size={12} color={theme.textSecondary} strokeWidth={2} />
                            <ThemedText type="caption" themeColor="textSecondary">
                                {commentCount}
                            </ThemedText>
                        </View>
                    )}
                    {/* Bookmark button deferred — no bookmarks view exists for memories yet. */}
                </View>
            </View>

            {/* Reactions */}
            {(groupedReactions.length > 0 || onAddReaction) && (
                <View style={styles.reactionsWrap}>
                    <EmojiReactionStrip
                        reactions={groupedReactions}
                        onToggle={onToggleReaction}
                        onAdd={onAddReaction}
                        compact
                    />
                </View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    card: {
        width: '100%',
        padding: Spacing.lg,
        borderWidth: BorderWidth.thin,
        borderRadius: Radius.lg,
    },
    quoteMark: {
        position: 'absolute',
        top: -4,
        left: Spacing.md,
        fontSize: Typography.hero,
        fontWeight: Weight.black,
        opacity: 0.15,
        lineHeight: LineHeight.hero,
    },
    text: {
        fontSize: Typography.body,
        lineHeight: LineHeight.subtitle,
        marginTop: Spacing.xs,
        marginBottom: Spacing.sm,
    },
    footer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    metaRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.xs,
    },
    commentPill: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 3,
    },
    footerRight: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    reactionsWrap: {
        marginTop: Spacing.sm,
    },
});
