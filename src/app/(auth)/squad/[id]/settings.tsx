import { useMutation, useQuery } from 'convex/react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Crown, LockKeyhole, LogOut, Users } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { LoadingState } from '@/components/ui/loading-state';
import { ScreenHeader } from '@/components/ui/screen-header';
import { Radius, Shadows, Spacing, Typography, Weight } from '@/constants/theme';
import { api } from '@/convex/_generated/api';
import { Id } from '@/convex/_generated/dataModel';
import { useTheme } from '@/hooks/use-theme';
import { useToast } from '@/hooks/use-toast';
import { heavyImpact } from '@/utils/haptics';

export default function SquadSettingsScreen() {
    const router = useRouter();
    const theme = useTheme();
    const toast = useToast();
    const { id } = useLocalSearchParams<{ id: string }>();
    const squadId = id as Id<'squads'>;

    const squad = useQuery(api.squad.getSquad, squadId ? { id: squadId } : 'skip');
    const currentUser = useQuery(api.users.current);
    const members = useQuery(api.squad.getSquadMembers, squadId ? { squadId } : 'skip');
    const updateSquadSettings = useMutation(api.squad.updateSquadSettings);
    const leaveSquad = useMutation(api.squad.leaveSquad);

    const [name, setName] = useState('');
    const [password, setPassword] = useState('');
    const [saving, setSaving] = useState(false);
    const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);

    useEffect(() => {
        if (squad?.name) setName(squad.name);
    }, [squad?.name]);

    if (squad === undefined || currentUser === undefined || members === undefined) {
        return <LoadingState message="Opening squad settings…" />;
    }

    const currentMember = members.find((member) => member.userId === currentUser?._id);
    const canManage = squad?.createdBy === currentUser?._id;
    const memberCount = members.length;

    const handleSave = async () => {
        if (!squad || saving || !canManage) return;
        const trimmedName = name.trim();
        const trimmedPassword = password.trim();
        if (!trimmedName) {
            toast.error('Squad name is required');
            return;
        }

        setSaving(true);
        try {
            await updateSquadSettings({
                squadId,
                name: trimmedName !== squad.name ? trimmedName : undefined,
                password: trimmedPassword.length > 0 ? trimmedPassword : undefined,
            });
            setPassword('');
            toast.success('Squad settings saved');
        } catch (err: any) {
            toast.error(err.message ?? 'Could not save settings');
        } finally {
            setSaving(false);
        }
    };

    const handleLeave = async () => {
        heavyImpact();
        setShowLeaveConfirm(false);
        try {
            await leaveSquad({ squadId });
            router.replace('/');
        } catch (err: any) {
            toast.error(err.message ?? 'Failed to leave squad');
        }
    };

    return (
        <ThemedView style={styles.container}>
            <SafeAreaView style={styles.safeArea} edges={[]}>
                <ScreenHeader title="Squad settings" onBack={() => router.back()} />

                <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
                    <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.outline, shadowColor: theme.shadow }]}>
                        <View style={styles.cardHeader}>
                            <View style={[styles.iconBox, { backgroundColor: theme.accentSoft, borderColor: theme.outlineLight }]}>
                                <Crown size={18} color={theme.text} strokeWidth={2.5} />
                            </View>
                            <View style={styles.cardTitleCopy}>
                                <ThemedText type="bodyBold">Squad identity</ThemedText>
                                <ThemedText type="caption" themeColor="textSecondary">
                                    {canManage ? 'Rename your shared space.' : 'Only the squad creator can edit this.'}
                                </ThemedText>
                            </View>
                        </View>
                        <TextInput
                            value={name}
                            onChangeText={setName}
                            editable={canManage && !saving}
                            placeholder="Squad name"
                            placeholderTextColor={theme.placeholder}
                            style={[styles.input, { color: theme.text, backgroundColor: theme.backgroundElement, borderColor: theme.outline }]}
                        />
                    </View>

                    <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.outline, shadowColor: theme.shadow }]}>
                        <View style={styles.cardHeader}>
                            <View style={[styles.iconBox, { backgroundColor: theme.accentSoft, borderColor: theme.outlineLight }]}>
                                <LockKeyhole size={18} color={theme.text} strokeWidth={2.5} />
                            </View>
                            <View style={styles.cardTitleCopy}>
                                <ThemedText type="bodyBold">Join password</ThemedText>
                                <ThemedText type="caption" themeColor="textSecondary">
                                    Leave blank to keep the current password.
                                </ThemedText>
                            </View>
                        </View>
                        <TextInput
                            value={password}
                            onChangeText={setPassword}
                            editable={canManage && !saving}
                            secureTextEntry
                            placeholder={canManage ? 'New password' : 'Creator only'}
                            placeholderTextColor={theme.placeholder}
                            style={[styles.input, { color: theme.text, backgroundColor: theme.backgroundElement, borderColor: theme.outline }]}
                        />

                        {canManage ? (
                            <Pressable
                                onPress={handleSave}
                                disabled={saving}
                                style={({ pressed }) => [
                                    styles.primaryBtn,
                                    { backgroundColor: theme.accent, borderColor: theme.outline, opacity: saving ? 0.65 : 1 },
                                    pressed && !saving && styles.pressed,
                                ]}
                                accessibilityRole="button"
                                accessibilityLabel="Save squad settings"
                            >
                                <ThemedText type="smallBold" style={{ color: theme.text }}>{saving ? 'Saving…' : 'Save changes'}</ThemedText>
                            </Pressable>
                        ) : null}
                    </View>

                    <Pressable
                        onPress={() => router.push(`/squad/${squadId}/members` as any)}
                        style={({ pressed }) => [
                            styles.memberBtn,
                            { backgroundColor: theme.surface, borderColor: theme.outlineLight },
                            pressed && styles.pressed,
                        ]}
                        accessibilityRole="button"
                        accessibilityLabel="Open member list"
                    >
                        <Users size={18} color={theme.text} strokeWidth={2.5} />
                        <View style={styles.memberCopy}>
                            <ThemedText type="bodyBold">Members</ThemedText>
                            <ThemedText type="caption" themeColor="textSecondary">
                                {memberCount} friend{memberCount !== 1 ? 's' : ''} · you are @{currentMember?.nickname ?? 'you'}
                            </ThemedText>
                        </View>
                    </Pressable>

                    <View style={[styles.dangerZone, { borderTopColor: theme.outlineLight }]}>
                        <ThemedText type="caption" themeColor="textSecondary" style={styles.dangerLabel}>DANGER ZONE</ThemedText>
                        <Pressable
                            onPress={() => setShowLeaveConfirm(true)}
                            style={[styles.leaveBtn, { borderColor: theme.error, backgroundColor: theme.errorSoft }]}
                            accessibilityRole="button"
                            accessibilityLabel="Leave squad"
                        >
                            <LogOut size={17} color={theme.error} strokeWidth={2.5} />
                            <ThemedText type="smallBold" style={{ color: theme.error }}>Leave Squad</ThemedText>
                        </Pressable>
                    </View>
                </ScrollView>

                <ConfirmDialog
                    visible={showLeaveConfirm}
                    title="Leave Squad?"
                    message="You'll need the squad password to rejoin. Your existing posts stay visible to the group."
                    confirmLabel="Leave"
                    destructive
                    onCancel={() => setShowLeaveConfirm(false)}
                    onConfirm={handleLeave}
                />
            </SafeAreaView>
        </ThemedView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    safeArea: { flex: 1 },
    content: {
        padding: Spacing.lg,
        gap: Spacing.lg,
        paddingBottom: Spacing.xxxl,
    },
    card: {
        gap: Spacing.md,
        borderWidth: 2,
        borderRadius: Radius.xl,
        padding: Spacing.lg,
        shadowOffset: Shadows.sm.offset,
        shadowOpacity: Shadows.sm.opacity,
        shadowRadius: Shadows.sm.radius,
        elevation: 2,
    },
    cardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.md,
    },
    iconBox: {
        width: 40,
        height: 40,
        borderRadius: Radius.md,
        borderWidth: 1.5,
        alignItems: 'center',
        justifyContent: 'center',
    },
    cardTitleCopy: { flex: 1, gap: 2 },
    input: {
        minHeight: 46,
        borderWidth: 1.5,
        borderRadius: Radius.md,
        paddingHorizontal: Spacing.md,
        fontSize: Typography.body,
        fontWeight: Weight.medium,
    },
    primaryBtn: {
        minHeight: 46,
        borderWidth: 2,
        borderRadius: Radius.md,
        alignItems: 'center',
        justifyContent: 'center',
    },
    pressed: {
        transform: [{ translateX: 1 }, { translateY: 1 }],
    },
    memberBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.md,
        borderWidth: 1.5,
        borderRadius: Radius.lg,
        padding: Spacing.lg,
    },
    memberCopy: { flex: 1, gap: 2 },
    dangerZone: {
        gap: Spacing.sm,
        borderTopWidth: 1.5,
        paddingTop: Spacing.lg,
    },
    dangerLabel: {
        letterSpacing: 0.6,
        fontWeight: Weight.bold,
    },
    leaveBtn: {
        minHeight: 46,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: Spacing.sm,
        borderWidth: 1.5,
        borderRadius: Radius.md,
    },
});
