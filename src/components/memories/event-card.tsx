import { DropReactions } from '@/components/drops/drop-reactions';
import { ThemedText } from '@/components/themed-text';
import { UserAvatar } from '@/components/user-avatar';
import { useTheme } from '@/hooks/use-theme';
import { Radius, Shadows, Spacing } from '@/constants/theme';
import { formatRelativeTime } from '@/utils/time';
import { Image } from 'expo-image';
import { StyleSheet, View } from 'react-native';

interface Reaction {
    emoji: string;
    userId: string;
}

interface EventCardProps {
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
}

const COVER_COLORS = ['#6366f1', '#ec4899', '#f59e0b', '#10b981', '#3b82f6'];

export function EventCard({
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
}: EventCardProps) {
    const theme = useTheme();
    const fallbackColor = coverUrl ? undefined : COVER_COLORS[title.length % COVER_COLORS.length];

    const stats: string[] = [];
    if (reflectionCount > 0) stats.push(`${reflectionCount} reflection${reflectionCount !== 1 ? 's' : ''}`);
    if (photoCount > 0) stats.push(`${photoCount} photo${photoCount !== 1 ? 's' : ''}`);
    if (linkCount > 0) stats.push(`${linkCount} link${linkCount !== 1 ? 's' : ''}`);

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
            <View style={[styles.cover, fallbackColor ? { backgroundColor: fallbackColor } : undefined]}>
                {coverUrl ? (
                    <Image source={{ uri: coverUrl }} style={styles.coverImage} contentFit="cover" />
                ) : (
                    <ThemedText style={styles.coverFallbackTitle} numberOfLines={1}>{title}</ThemedText>
                )}
            </View>

            <View style={styles.body}>
                <ThemedText type="smallBold" style={styles.title} numberOfLines={1}>{title}</ThemedText>

                <View style={styles.authorRow}>
                    <UserAvatar uri={avatarUrl} size={18} fallbackText={nickname} />
                    <ThemedText type="caption" themeColor="textSecondary">
                        by {nickname} · {formatRelativeTime(createdAt)}
                    </ThemedText>
                </View>

                {stats.length > 0 && (
                    <ThemedText type="caption" themeColor="textSecondary" style={styles.stats}>
                        {stats.join(' · ')}
                    </ThemedText>
                )}

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
        borderWidth: 2,
        borderRadius: Radius.md,
        overflow: 'hidden',
    },
    cover: {
        height: 80,
        justifyContent: 'center',
        alignItems: 'center',
    },
    coverImage: {
        flex: 1,
        width: '100%',
    },
    coverFallbackTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: '#fff',
        paddingHorizontal: Spacing.lg,
    },
    body: {
        padding: Spacing.lg,
        gap: Spacing.xs,
    },
    authorRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.xs,
    },
    title: {
        fontSize: 15,
    },
    stats: {
        marginTop: 2,
    },
});
