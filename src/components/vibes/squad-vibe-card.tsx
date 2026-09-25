import { ThemedText } from '@/components/themed-text';
import { UserAvatar } from '@/components/user-avatar';
import { Radius, Shadows, Spacing, Weight } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { MessageCircle } from 'lucide-react-native';
import { Pressable, StyleSheet, View } from 'react-native';

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
    onChat?: () => void;
    hasDmBadge?: boolean;
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

export function SquadVibeCard({ member, onChat, hasDmBadge }: SquadVibeCardProps) {
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
                        <ThemedText style={styles.regularText}>
                            {' · '}{member.vibeLabel} {member.vibe}
                        </ThemedText>
                    ) : (
                        <ThemedText style={styles.regularText}>
                            {' '}{member.vibe}
                        </ThemedText>
                    )}
                </ThemedText>
            </View>

            {onChat && (
                <View>
                    <Pressable
                        onPress={onChat}
                        hitSlop={8}
                        accessibilityRole="button"
                        accessibilityLabel={`Message ${member.nickname}`}
                        style={({ pressed }) => [
                            styles.chatBtn,
                            { borderColor: theme.outline, backgroundColor: theme.background },
                            pressed && { transform: [{ scale: 0.92 }] },
                        ]}
                    >
                        <MessageCircle size={16} color={theme.text} strokeWidth={2} />
                    </Pressable>
                    {hasDmBadge ? (
                        <View style={[styles.badge, { backgroundColor: theme.error, borderColor: theme.surface }]} />
                    ) : null}
                </View>
            )}

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
        shadowOffset: Shadows.sm.shadowOffset,
        shadowOpacity: Shadows.sm.shadowOpacity,
        shadowRadius: Shadows.sm.shadowRadius,
    },
    content: {
        flex: 1,
    },
    regularText: {
        fontWeight: Weight.regular,
    },
    timestamp: {
        flexShrink: 0,
    },
    chatBtn: {
        width: 32,
        height: 32,
        borderRadius: Radius.sm,
        borderWidth: 1.5,
        alignItems: 'center',
        justifyContent: 'center',
    },
    badge: {
        position: 'absolute',
        top: -2,
        right: -2,
        width: 9,
        height: 9,
        borderRadius: 5,
        borderWidth: 1.5,
    },
});
