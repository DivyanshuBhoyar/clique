import { CategoryChip } from '@/components/drops/category-chip';
import { DropReactions } from '@/components/drops/drop-reactions';
import { VoteButtons } from '@/components/drops/vote-buttons';
import { ThemedText } from '@/components/themed-text';
import { UserAvatar } from '@/components/user-avatar';
import { useTheme } from '@/hooks/use-theme';
import { Radius, Shadows, Spacing } from '@/constants/theme';
import { formatRelativeTime } from '@/utils/time';
import { StyleSheet, View } from 'react-native';

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
    truncate?: boolean;
    upvotes: number;
    downvotes: number;
    userVote: "up" | "down" | null;
    onVote: (dropId: string, value: "up" | "down") => void;
}

type CategoryKey = 'song' | 'movie' | 'book' | 'lifehack' | 'quote' | 'random';

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
    truncate,
    upvotes,
    downvotes,
    userVote,
    onVote,
}: DropCardProps) {
    const theme = useTheme();
    const time = formatRelativeTime(createdAt);
    const catKey = category as CategoryKey;
    const tintColor = theme[`${catKey}Bg` as keyof typeof theme] ?? theme.surface;

    return (
        <View
            style={[
                styles.card,
                {
                    backgroundColor: theme.surface,
                    borderColor: theme.outline,
                    borderLeftColor: tintColor,
                    shadowColor: theme.shadow,
                    shadowOffset: Shadows.sm.offset,
                    shadowOpacity: Shadows.sm.opacity,
                    shadowRadius: Shadows.sm.radius,
                    elevation: 3,
                },
            ]}
        >
            <View style={styles.header}>
                <CategoryChip category={category} />
                <ThemedText type="caption" themeColor="textSecondary">{time}</ThemedText>
            </View>

            <View style={styles.authorRow}>
                <UserAvatar uri={avatarUrl} size={20} fallbackText={nickname} />
                <ThemedText type="smallBold">by {nickname}</ThemedText>
            </View>

            <ThemedText style={styles.content} numberOfLines={truncate ? 2 : undefined}>{content}</ThemedText>

            <View style={styles.actionsRow}>
                <VoteButtons
                    upvotes={upvotes}
                    downvotes={downvotes}
                    userVote={userVote}
                    onVote={(value) => onVote(dropId, value)}
                />
                <DropReactions
                    reactions={reactions}
                    currentUserId={currentUserId}
                    onToggle={(emoji) => onToggleReaction(dropId, emoji)}
                />
            </View>

            {commentCount >= 0 && (
                <ThemedText type="caption" themeColor="textSecondary" style={styles.commentHint}>
                    {commentCount} comment{commentCount !== 1 ? 's' : ''}
                </ThemedText>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    card: {
        width: '100%',
        padding: Spacing.lg,
        borderWidth: 2,
        borderRadius: Radius.md,
        borderLeftWidth: 4,
        overflow: 'hidden',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: Spacing.xs,
    },
    authorRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.xs,
        marginBottom: Spacing.sm,
    },
    content: {
        fontSize: 15,
        lineHeight: 22,
        marginBottom: Spacing.sm,
    },
    actionsRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.lg,
    },
    commentHint: {
        marginTop: Spacing.xs,
    },
});
