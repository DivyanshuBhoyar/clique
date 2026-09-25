import { useMutation, useQuery } from 'convex/react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Crown, LockKeyhole, LogOut } from 'lucide-react-native';
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
import { backOrReplace } from '@/utils/navigation';

export default function SquadSettingsScreen() {
    const router = useRouter();
    const theme = useTheme();
    const toast = useToast();
    const { id } = useLocalSearchParams<{ id: string }>();
    const squadId = id as Id<'squads'>;

    const squad = useQuery(api.squad.getSquad, squadId ? { id: squadId } : 'skip');
    const currentUser = useQuery(api.users.current);
    const updateSquadSettings = useMutation(api.squad.updateSquadSettings);
    const leaveSquad = useMutation(api.squad.leaveSquad);

    const [name, setName] = useState('');
    const [password, setPassword] = useState('');
    const [saving, setSaving] = useState(false);
    const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);

    useEffect(() => {
        if (squad?.name) setName(squad.name);
    }, [squad?.name]);

    if (squad === undefined || currentUser === undefined) {
        return <LoadingState message="Opening Space Settings…" />;
    }

    const canManage = squad?.createdBy === currentUser?._id;

    const handleSave = async () => {
        if (!squad || saving || !canManage) return;
        const trimmedName = name.trim();
        const trimmedPassword = password.trim();
        if (!trimmedName) {
            toast.error('Space name is required');
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
            toast.success('Space Settings saved');
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
            toast.error(err.message ?? 'Failed to Leave Space');
        }
    };

    return (
        <ThemedView style={styles.container}>
            <SafeAreaView style={styles.safeArea} edges={[]}>
                <ScreenHeader title="Space Settings" onBack={() => backOrReplace(router, `/squad/${squadId}/chat`)} />

                <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
                    <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.outline, shadowColor: theme.shadow }]}>
                        <View style={styles.cardHeader}>
                            <View style={[styles.iconBox, { backgroundColor: theme.accentSoft, borderColor: theme.outlineLight }]}>
                                <Crown size={18} color={theme.text} strokeWidth={2.5} />
                            </View>
                            <View style={styles.cardTitleCopy}>
                                <ThemedText type="bodyBold">Space identity</ThemedText>
                                <ThemedText type="caption" themeColor="textSecondary">
                                    {canManage ? 'Rename your shared space.' : 'Only the Space creator can edit this.'}
                                </ThemedText>
                            </View>
                        </View>
                        <TextInput
                            value={name}
                            onChangeText={setName}
                            editable={canManage && !saving}
                            placeholder="Space name"
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
                                accessibilityLabel="Save space settings"
                            >
                                <ThemedText type="smallBold" style={{ color: theme.text }}>{saving ? 'Saving…' : 'Save changes'}</ThemedText>
                            </Pressable>
                        ) : null}
                    </View>

                    <View style={[styles.dangerZone, { borderTopColor: theme.outlineLight }]}>
                        <ThemedText type="caption" themeColor="textSecondary" style={styles.dangerLabel}>DANGER ZONE</ThemedText>
                        {canManage ? (
                            <ThemedText type="caption" themeColor="textSecondary">
                                Member management lives on the Members screen. Creators cannot leave until ownership transfer exists.
                            </ThemedText>
                        ) : null}
                        <Pressable
                            onPress={() => setShowLeaveConfirm(true)}
                            disabled={canManage}
                            style={[styles.leaveBtn, { borderColor: theme.error, backgroundColor: theme.errorSoft, opacity: canManage ? 0.5 : 1 }]}
                            accessibilityRole="button"
                            accessibilityLabel={canManage ? 'Space creators cannot leave yet' : 'Leave Space'}
                        >
                            <LogOut size={17} color={theme.error} strokeWidth={2.5} />
                            <ThemedText type="smallBold" style={{ color: theme.error }}>{canManage ? 'Creator cannot leave yet' : 'Leave Space'}</ThemedText>
                        </Pressable>
                    </View>
                </ScrollView>

                <ConfirmDialog
                    visible={showLeaveConfirm}
                    title="Leave Space?"
                    message="You'll need the space password to rejoin. Your existing posts stay visible to the group."
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
        shadowOffset: Shadows.sm.shadowOffset,
        shadowOpacity: Shadows.sm.shadowOpacity,
        shadowRadius: Shadows.sm.shadowRadius,
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
