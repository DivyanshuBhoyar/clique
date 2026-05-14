import { useQuery } from 'convex/react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Crown, UserRound } from 'lucide-react-native';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { LoadingState } from '@/components/ui/loading-state';
import { ScreenHeader } from '@/components/ui/screen-header';
import { UserAvatar } from '@/components/user-avatar';
import { Radius, Shadows, Spacing, Weight } from '@/constants/theme';
import { api } from '@/convex/_generated/api';
import { Id } from '@/convex/_generated/dataModel';
import { useTheme } from '@/hooks/use-theme';
import { formatRelativeTime } from '@/utils/time';

export default function MembersScreen() {
    const router = useRouter();
    const theme = useTheme();
    const { id } = useLocalSearchParams<{ id: string }>();
    const squadId = id as Id<'squads'>;

    const members = useQuery(api.squad.getSquadMembers, squadId ? { squadId } : 'skip');
    const onlineCount = members?.filter((member) => member.isOnline).length ?? 0;

    if (members === undefined) return <LoadingState message="Gathering the squad…" />;

    return (
        <ThemedView style={styles.container}>
            <SafeAreaView style={styles.safeArea} edges={[]}>
                <ScreenHeader
                    title="Members"
                    subtitle={`${members.length} friend${members.length !== 1 ? 's' : ''} · ${onlineCount} online`}
                    onBack={() => router.back()}
                />

                <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
                    {members.map((member) => (
                        <Pressable
                            key={member.userId}
                            onPress={() => router.push(`/squad/${squadId}/members/${member.userId}` as any)}
                            style={({ pressed }) => [
                                styles.card,
                                {
                                    backgroundColor: theme.surface,
                                    borderColor: theme.outline,
                                    shadowColor: theme.shadow,
                                    shadowOffset: Shadows.sm.offset,
                                    shadowOpacity: Shadows.sm.opacity,
                                    shadowRadius: Shadows.sm.radius,
                                },
                                pressed && styles.cardPressed,
                            ]}
                            accessibilityRole="button"
                            accessibilityLabel={`View ${member.nickname}'s profile`}
                        >
                            <View style={styles.avatarWrap}>
                                <UserAvatar uri={member.avatarUrl} size={48} fallbackText={member.nickname} />
                                <View style={[styles.statusDot, { backgroundColor: member.isOnline ? theme.success : theme.textTertiary, borderColor: theme.surface }]} />
                            </View>

                            <View style={styles.memberCopy}>
                                <View style={styles.nameRow}>
                                    <ThemedText type="bodyBold" numberOfLines={1}>{member.nickname}</ThemedText>
                                    {member.isOwner ? <Crown size={15} color={theme.accent} strokeWidth={2.5} /> : null}
                                    {member.isMe ? (
                                        <View style={[styles.mePill, { backgroundColor: theme.accentSoft, borderColor: theme.outlineLight }]}>
                                            <ThemedText type="caption" style={{ color: theme.text, fontWeight: Weight.bold }}>You</ThemedText>
                                        </View>
                                    ) : null}
                                </View>
                                <ThemedText type="caption" themeColor="textSecondary" numberOfLines={1}>
                                    {member.vibe ? `${member.vibe} ${member.vibeLabel ?? member.statusText ?? ''}` : member.statusText ?? 'Keeping it cozy'}
                                </ThemedText>
                                <ThemedText type="caption" themeColor="textTertiary">
                                    Joined {formatRelativeTime(member.joinedAt)} · {member.isOnline ? 'Online now' : member.lastActiveAt ? `Active ${formatRelativeTime(member.lastActiveAt)}` : 'Not active yet'}
                                </ThemedText>
                            </View>

                            <UserRound size={18} color={theme.textTertiary} strokeWidth={2} />
                        </Pressable>
                    ))}
                </ScrollView>
            </SafeAreaView>
        </ThemedView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    safeArea: { flex: 1 },
    content: {
        padding: Spacing.lg,
        gap: Spacing.md,
        paddingBottom: Spacing.xxxl,
    },
    card: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.md,
        borderWidth: 2,
        borderRadius: Radius.lg,
        padding: Spacing.md,
        elevation: 2,
    },
    cardPressed: {
        transform: [{ translateX: 1 }, { translateY: 1 }],
    },
    avatarWrap: {
        position: 'relative',
    },
    statusDot: {
        position: 'absolute',
        right: -1,
        bottom: -1,
        width: 14,
        height: 14,
        borderRadius: 7,
        borderWidth: 2,
    },
    memberCopy: {
        flex: 1,
        minWidth: 0,
        gap: 2,
    },
    nameRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.xs,
    },
    mePill: {
        borderWidth: 1,
        borderRadius: Radius.full,
        paddingHorizontal: Spacing.xs,
        paddingVertical: 1,
    },
});
