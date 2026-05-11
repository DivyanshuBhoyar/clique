import { ThemedText } from '@/components/themed-text';
import { UserAvatar } from '@/components/user-avatar';
import { Radius, Shadows, Spacing, Weight } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { StyleSheet, View } from 'react-native';

interface SquadVibeMember {
    userId: string;
    nickname: string;
    avatarUrl?: string | null;
    vibe: string;
    vibeLabel: string | null;
    vibeUpdatedAt: number;
}

interface SquadVibeCardProps {
    member: SquadVibeMember;
}

function timeAgo(timestamp: number): string {
    const diff = Date.now() - timestamp;
    const mins = Math.floor(diff / 60_000);
    if (mins < 1) return 'now';
    if (mins < 60) return `${mins}m`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h`;
    return '1d';
}

export function SquadVibeCard({ member }: SquadVibeCardProps) {
    const theme = useTheme();

    return (
        <View
            style={[
                styles.card,
                {
                    backgroundColor: theme.surface,
                    borderColor: theme.outline,
                    shadowColor: theme.shadow,
                },
            ]}
        >
            <UserAvatar
                uri={member.avatarUrl}
                size={52}
                fallbackText={member.nickname}
                vibeEmoji={member.vibe}
            />

            <View style={styles.content}>
                <ThemedText type="bodyBold" numberOfLines={1}>
                    {member.nickname}
                    {member.vibeLabel ? (
                        <ThemedText style={{ fontWeight: Weight.regular }}>
                            {' · '}{member.vibeLabel} {member.vibe}
                        </ThemedText>
                    ) : (
                        <ThemedText style={{ fontWeight: Weight.regular }}>
                            {' '}{member.vibe}
                        </ThemedText>
                    )}
                </ThemedText>
            </View>

            <ThemedText
                type="small"
                themeColor="textSecondary"
                style={styles.timestamp}
            >
                {timeAgo(member.vibeUpdatedAt)}
            </ThemedText>
        </View>
    );
}

const styles = StyleSheet.create({
    card: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.md,
        borderWidth: 2,
        borderRadius: Radius.xl,
        padding: Spacing.lg,
        shadowOffset: Shadows.sm.offset,
        shadowOpacity: Shadows.sm.opacity,
        shadowRadius: Shadows.sm.radius,
    },
    content: {
        flex: 1,
    },
    timestamp: {
        flexShrink: 0,
    },
});
