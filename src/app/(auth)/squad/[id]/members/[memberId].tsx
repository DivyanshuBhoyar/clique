import { useMutation, useQuery } from 'convex/react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Crown, Mail, Sparkles, Trash2, UserRound } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { LoadingState } from '@/components/ui/loading-state';
import { NotFoundState } from '@/components/ui/not-found-state';
import { ScreenHeader } from '@/components/ui/screen-header';
import { UserAvatar } from '@/components/user-avatar';
import { Radius, Shadows, Spacing, Typography, Weight } from '@/constants/theme';
import { api } from '@/convex/_generated/api';
import { Id } from '@/convex/_generated/dataModel';
import { useTheme } from '@/hooks/use-theme';
import { useToast } from '@/hooks/use-toast';
import { heavyImpact } from '@/utils/haptics';
import { formatRelativeTime } from '@/utils/time';

export default function MemberProfileScreen() {
    const router = useRouter();
    const theme = useTheme();
    const toast = useToast();
    const { id, memberId } = useLocalSearchParams<{ id: string; memberId: string }>();
    const squadId = id as Id<'squads'>;
    const [showRemoveConfirm, setShowRemoveConfirm] = useState(false);

    const squad = useQuery(api.squad.getSquad, squadId ? { id: squadId } : 'skip');
    const currentUser = useQuery(api.users.current);
    const profile = useQuery(
        api.squad.getSquadMemberProfile,
        squadId && memberId ? { squadId, userId: memberId as Id<'users'> } : 'skip',
    );
    const removeMember = useMutation(api.squad.removeSquadMember);

    if (profile === undefined || squad === undefined || currentUser === undefined) return <LoadingState message="Opening profile…" />;
    if (profile === null) return <NotFoundState message="Member not found." />;

    const canRemoveMember = squad?.createdBy === currentUser?._id && !profile.isMe && !profile.isOwner;

    const handleRemoveMember = async () => {
        heavyImpact();
        setShowRemoveConfirm(false);
        try {
            await removeMember({ squadId, memberUserId: profile.userId });
            toast.success(`${profile.nickname} was removed from the squad`);
            router.replace(`/squad/${squadId}/members` as any);
        } catch (err: any) {
            toast.error(err.message ?? 'Could not remove member');
        }
    };

    return (
        <ThemedView style={styles.container}>
            <SafeAreaView style={styles.safeArea} edges={[]}>
                <ScreenHeader title={profile.nickname} onBack={() => router.back()} />

                <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
                    <View style={[styles.heroCard, { backgroundColor: theme.surface, borderColor: theme.outline, shadowColor: theme.shadow }]}>
                        <View style={styles.avatarWrap}>
                            <UserAvatar uri={profile.avatarUrl} size={88} fallbackText={profile.nickname} />
                            <View style={[styles.statusDot, { backgroundColor: profile.isOnline ? theme.success : theme.textTertiary, borderColor: theme.surface }]} />
                        </View>
                        <View style={styles.nameBlock}>
                            <View style={styles.nameRow}>
                                <ThemedText style={styles.nickname}>{profile.nickname}</ThemedText>
                                {profile.isOwner ? <Crown size={18} color={theme.accent} strokeWidth={2.5} /> : null}
                            </View>
                            {profile.name ? (
                                <ThemedText type="small" themeColor="textSecondary">{profile.name}</ThemedText>
                            ) : null}
                            <View style={[styles.onlinePill, { backgroundColor: profile.isOnline ? theme.successSoft : theme.backgroundElement, borderColor: theme.outlineLight }]}>
                                <ThemedText type="caption" style={{ color: profile.isOnline ? theme.success : theme.textSecondary, fontWeight: Weight.bold }}>
                                    {profile.isOnline ? '● Online now' : profile.lastActiveAt ? `Last active ${formatRelativeTime(profile.lastActiveAt)}` : 'Not active yet'}
                                </ThemedText>
                            </View>
                        </View>
                    </View>

                    <InfoCard icon={<Sparkles size={18} color={theme.text} strokeWidth={2.5} />} label="Current vibe">
                        <ThemedText type="bodyBold">
                            {profile.vibe ? `${profile.vibe} ${profile.vibeLabel ?? ''}` : 'No vibe set yet'}
                        </ThemedText>
                        {profile.statusText ? (
                            <ThemedText type="small" themeColor="textSecondary">{profile.statusText}</ThemedText>
                        ) : null}
                    </InfoCard>

                    <InfoCard icon={<UserRound size={18} color={theme.text} strokeWidth={2.5} />} label="Squad role">
                        <ThemedText type="bodyBold">{profile.isOwner ? 'Squad creator' : 'Member'}</ThemedText>
                        <ThemedText type="small" themeColor="textSecondary">Joined {formatRelativeTime(profile.joinedAt)}</ThemedText>
                    </InfoCard>

                    {profile.isMe && profile.email ? (
                        <InfoCard icon={<Mail size={18} color={theme.text} strokeWidth={2.5} />} label="Private account email">
                            <ThemedText type="small" selectable>{profile.email}</ThemedText>
                        </InfoCard>
                    ) : null}

                    {canRemoveMember ? (
                        <View style={[styles.dangerCard, { backgroundColor: theme.errorSoft, borderColor: theme.error }]}>
                            <View style={styles.dangerCopy}>
                                <ThemedText type="bodyBold" style={{ color: theme.error }}>Remove from squad</ThemedText>
                                <ThemedText type="caption" themeColor="textSecondary">
                                    They will lose access immediately and need the password to rejoin.
                                </ThemedText>
                            </View>
                            <Pressable
                                onPress={() => setShowRemoveConfirm(true)}
                                style={[styles.removeBtn, { backgroundColor: theme.surface, borderColor: theme.error }]}
                                accessibilityRole="button"
                                accessibilityLabel={`Remove ${profile.nickname} from squad`}
                            >
                                <Trash2 size={17} color={theme.error} strokeWidth={2.5} />
                                <ThemedText type="smallBold" style={{ color: theme.error }}>Remove</ThemedText>
                            </Pressable>
                        </View>
                    ) : null}
                </ScrollView>

                <ConfirmDialog
                    visible={showRemoveConfirm}
                    title="Remove member?"
                    message={`${profile.nickname} will lose access to this squad. Their previous posts stay visible.`}
                    confirmLabel="Remove"
                    destructive
                    onCancel={() => setShowRemoveConfirm(false)}
                    onConfirm={handleRemoveMember}
                />
            </SafeAreaView>
        </ThemedView>
    );
}

function InfoCard({ icon, label, children }: { icon: React.ReactNode; label: string; children: React.ReactNode }) {
    const theme = useTheme();
    return (
        <View style={[styles.infoCard, { backgroundColor: theme.surface, borderColor: theme.outlineLight }]}>
            <View style={[styles.infoIcon, { backgroundColor: theme.accentSoft, borderColor: theme.outlineLight }]}>{icon}</View>
            <View style={styles.infoCopy}>
                <ThemedText type="caption" themeColor="textSecondary" style={styles.infoLabel}>{label}</ThemedText>
                {children}
            </View>
        </View>
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
    heroCard: {
        alignItems: 'center',
        gap: Spacing.md,
        borderWidth: 2,
        borderRadius: Radius.xl,
        padding: Spacing.xl,
        shadowOffset: Shadows.md.offset,
        shadowOpacity: Shadows.md.opacity,
        shadowRadius: Shadows.md.radius,
        elevation: 3,
    },
    avatarWrap: { position: 'relative' },
    statusDot: {
        position: 'absolute',
        right: 4,
        bottom: 4,
        width: 18,
        height: 18,
        borderRadius: 9,
        borderWidth: 3,
    },
    nameBlock: { alignItems: 'center', gap: Spacing.xs },
    nameRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs },
    nickname: { fontSize: Typography.heading, fontWeight: Weight.extrabold },
    onlinePill: {
        marginTop: Spacing.xs,
        borderWidth: 1.5,
        borderRadius: Radius.full,
        paddingHorizontal: Spacing.md,
        paddingVertical: Spacing.xs,
    },
    infoCard: {
        flexDirection: 'row',
        gap: Spacing.md,
        borderWidth: 1.5,
        borderRadius: Radius.lg,
        padding: Spacing.md,
    },
    infoIcon: {
        width: 38,
        height: 38,
        borderRadius: Radius.md,
        borderWidth: 1.5,
        alignItems: 'center',
        justifyContent: 'center',
    },
    infoCopy: { flex: 1, gap: 2 },
    infoLabel: { textTransform: 'uppercase', letterSpacing: 0.4, fontWeight: Weight.bold },
    dangerCard: {
        gap: Spacing.md,
        borderWidth: 1.5,
        borderRadius: Radius.lg,
        padding: Spacing.md,
    },
    dangerCopy: { gap: 2 },
    removeBtn: {
        minHeight: 46,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: Spacing.sm,
        borderWidth: 1.5,
        borderRadius: Radius.md,
    },
});
