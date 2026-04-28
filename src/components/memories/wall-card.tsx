import { DropReactions } from '@/components/drops/drop-reactions';
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

interface WallCardProps {
    content: string;
    nickname: string;
    avatarUrl?: string | null;
    createdAt: number;
    reactions: Reaction[];
    commentCount: number;
    currentUserId?: string;
    onToggleReaction: (emoji: string) => void;
    truncate?: boolean;
}

export function WallCard({
    content,
    nickname,
    avatarUrl,
    createdAt,
    reactions,
    commentCount,
    currentUserId,
    onToggleReaction,
    truncate,
}: WallCardProps) {
    const theme = useTheme();

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
            <ThemedText style={styles.quoteMark} themeColor="accent">"</ThemedText>
            <ThemedText style={styles.text} numberOfLines={truncate ? 3 : undefined}>
                {content}
            </ThemedText>

            <View style={styles.footer}>
                <View style={styles.meta}>
                    <View style={styles.metaRow}>
                        <UserAvatar uri={avatarUrl} size={18} fallbackText={nickname} />
                        <ThemedText type="caption" themeColor="textSecondary">
                            {nickname} · {formatRelativeTime(createdAt)}
                        </ThemedText>
                    </View>
                    {commentCount > 0 && (
                        <ThemedText type="caption" themeColor="textSecondary">
                            {commentCount} comment{commentCount !== 1 ? 's' : ''}
                        </ThemedText>
                    )}
                </View>
                <DropReactions
                    reactions={reactions}
                    currentUserId={currentUserId}
                    onToggle={onToggleReaction}
                />
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    card: {
        width: '100%',
        padding: Spacing.lg,
        borderWidth: 2,
        borderRadius: Radius.md,
    },
    quoteMark: {
        position: 'absolute',
        top: -4,
        left: Spacing.sm,
        fontSize: 48,
        fontWeight: '700',
        opacity: 0.2,
        lineHeight: 48,
    },
    text: {
        fontSize: 15,
        lineHeight: 22,
        marginBottom: Spacing.sm,
    },
    footer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-end',
    },
    meta: {
        gap: 2,
    },
    metaRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.xs,
    },
});
