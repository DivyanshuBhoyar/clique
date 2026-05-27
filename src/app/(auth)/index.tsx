/**
 * Squad Home — authenticated landing screen.
 *
 * Design (media__1777448162096.png):
 *  ┌─────────────────────────────────────────────────┐
 *  │  [<]    SQUAD HOME                    [⚙]      │  ← header
 *  │                                                  │
 *  │         🏠 (squad avatar)                        │
 *  │         The Cove                                 │
 *  │         your cozy little corner · 7 members     │
 *  │         [avatar][avatar][avatar] +2 more         │
 *  │         [cozy mode] [3 online ●]                │  ← badge row
 *  │  ─────────────────────────────────────────────  │
 *  │  Recent Activity                    See all →   │
 *  │  [♪] maya dropped a song                        │  ← activity rows
 *  │  [📸] new memory added                          │
 *  │  [💬] theo: found our new study spot           │
 *  │  ─────────────────────────────────────────────  │
 *  │  Jump In                                        │
 *  │  [Chat] [Drops] [Memories] [Notes] [Vibes]     │  ← 2x3 grid
 *  └─────────────────────────────────────────────────┘
 *
 * When user has squads → show home UI.
 * When user has no squads → show "Create or Join" CTA.
 */
import { useAuthActions } from '@convex-dev/auth/react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useMutation, useQuery } from 'convex/react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { HomeMiniHeader } from '@/components/home/home-mini-header';
import { HomeSettingsSheet } from '@/components/home/home-settings-sheet';
import { NoSquadsLanding } from '@/components/home/no-squads-landing';
import { RecentActivitySection } from '@/components/home/recent-activity-section';
import { SquadHero } from '@/components/home/squad-hero';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { DashedSeparator } from '@/components/ui/dashed-separator';
import { Fab } from '@/components/ui/fab';
import { LoadingState } from '@/components/ui/loading-state';
import { Radius, Shadows, Spacing, Typography } from '@/constants/theme';
import { api } from '@/convex/_generated/api';
import { Id } from '@/convex/_generated/dataModel';
import { useTheme } from '@/hooks/use-theme';
import { useToast } from '@/hooks/use-toast';
import { heavyImpact } from '@/utils/haptics';

export default function HomeScreen() {
    const router = useRouter();
    const { switcher } = useLocalSearchParams<{ switcher?: string }>();
    const { signOut } = useAuthActions();
    const toast = useToast();

    const [showJoinForm, setShowJoinForm] = useState(false);
    const [showSettings, setShowSettings] = useState(false);
    const [showSignOutConfirm, setShowSignOutConfirm] = useState(false);
    const [squadName, setSquadName] = useState('');
    const [password, setPassword] = useState('');
    const [nickname, setNickname] = useState('');
    const [isJoining, setIsJoining] = useState(false);
    const [hasRedirected, setHasRedirected] = useState(false);
    const [activeSquadIndex, setActiveSquadIndex] = useState(0);

    const joinSquad = useMutation(api.squad.joinSquad);
    const userSquads = useQuery(api.squad.getUserSquads);

    useEffect(() => {
        if (hasRedirected) return;
        if (switcher) return; // Skip auto-redirect when coming from squad switcher
        if (!userSquads) return;
        // Only auto-redirect if last remembered squad exists
        const redirect = async () => {
            const lastId = await AsyncStorage.getItem('lastSquadId');
            if (lastId && userSquads.some(e => e.squad?._id === lastId)) {
                setHasRedirected(true);
                router.replace(`/squad/${lastId}/chat` as any);
            }
        };
        redirect();
    }, [userSquads, hasRedirected, router, switcher]);

    const submitJoinSquad = async () => {
        if (!squadName || !password || !nickname) return;
        try {
            setIsJoining(true);
            const squadId = await joinSquad({ squadName, password, nickname });
            setShowJoinForm(false);
            setSquadName(''); setPassword(''); setNickname('');
            router.push(`/squad/${squadId}/chat` as any);
        } catch (error) {
            const message = error instanceof Error && error.message
                ? error.message
                : 'Wrong password or squad name';
            toast.error(message);
        } finally {
            setIsJoining(false);
        }
    };

    const activeEntry = userSquads?.[activeSquadIndex];
    const activeSquad = activeEntry?.squad;
    const activeSquadId = activeSquad?._id as Id<'squads'> | undefined;

    const squadMembers = useQuery(
        api.squad.getSquadMembers,
        activeSquadId ? { squadId: activeSquadId } : 'skip',
    );
    const recentActivity = useQuery(
        api.activity.getRecentActivity,
        activeSquadId ? { squadId: activeSquadId, limit: 4 } : 'skip',
    );
    const memberCount = squadMembers?.length ?? 0;

    /* ── No squads yet ─────────────────────────────────────────────── */
    if (userSquads === undefined) return <LoadingState />;

    if (userSquads.length === 0) {
        return (
            <ThemedView style={styles.container}>
                <SafeAreaView style={styles.safeArea} edges={['top']}>
                    <NoSquadsLanding
                        showJoinForm={showJoinForm}
                        squadName={squadName}
                        password={password}
                        nickname={nickname}
                        isJoining={isJoining}
                        onCreateSquad={() => router.push('/create-squad')}
                        onShowJoinForm={() => setShowJoinForm(true)}
                        onHideJoinForm={() => setShowJoinForm(false)}
                        onChangeSquadName={setSquadName}
                        onChangePassword={setPassword}
                        onChangeNickname={setNickname}
                        onSubmitJoin={submitJoinSquad}
                        onSignOut={() => signOut()}
                    />
                </SafeAreaView>
            </ThemedView>
        );
    }

    /* ── Has squads — full dashboard ───────────────────────────────── */
    return (
        <ThemedView style={styles.container}>
            <SafeAreaView style={styles.safeArea} edges={['top']}>
                <HomeMiniHeader onSettingsPress={() => setShowSettings(true)} onMessagesPress={() => router.push('/(auth)/dm' as any)} />

                <ScrollView
                    contentContainerStyle={styles.scrollContent}
                    showsVerticalScrollIndicator={false}
                >
                    {switcher ? (
                        <>
                            <SquadPickerList
                                userSquads={userSquads}
                                onSelect={(squadId) => router.push(`/squad/${squadId}/chat` as any)}
                                onCreate={() => router.push('/create-squad')}
                            />

                            <DashedSeparator />

                            <RecentActivitySection
                                items={recentActivity ?? []}
                                onOpenActivity={(item) => {
                                    if (!activeSquad) return;
                                    const base = `/squad/${activeSquad._id}/${item.route}`;
                                    const route = item.routeId ? `${base}/${item.routeId}` : base;
                                    router.push(route as any);
                                }}
                            />
                        </>
                    ) : (
                        <>
                            {/* Squad hero */}
                            <SquadHero
                                squadName={activeSquad?.name ?? 'Your Squad'}
                                memberCount={memberCount}
                                squadMembers={squadMembers}
                                userSquads={userSquads}
                                activeSquadIndex={activeSquadIndex}
                                onSwitchSquad={(squadId) => {
                                    const idx = userSquads.findIndex(e => e.squad?._id === squadId);
                                    if (idx >= 0) setActiveSquadIndex(idx);
                                    router.push(`/squad/${squadId}/chat` as any);
                                }}
                            />

                            <DashedSeparator />

                            <RecentActivitySection
                                items={recentActivity ?? []}
                                onOpenActivity={(item) => {
                                    if (!activeSquad) return;
                                    const base = `/squad/${activeSquad._id}/${item.route}`;
                                    const route = item.routeId ? `${base}/${item.routeId}` : base;
                                    router.push(route as any);
                                }}
                            />
                        </>
                    )}
                </ScrollView>

                <Fab
                    onPress={() => router.push('/create-squad')}
                    accessibilityLabel="Create new squad"
                />

                <HomeSettingsSheet
                    visible={showSettings}
                    squadName={activeSquad?.name ?? 'Your Squad'}
                    memberCount={memberCount}
                    onClose={() => setShowSettings(false)}
                    onCreateSquad={() => {
                        setShowSettings(false);
                        router.push('/create-squad');
                    }}
                    onSignOutPress={() => {
                        setShowSettings(false);
                        setShowSignOutConfirm(true);
                    }}
                />

                <ConfirmDialog
                    visible={showSignOutConfirm}
                    title="Sign out?"
                    message="You can always come back with your email and rejoin your squad."
                    confirmLabel="Sign out"
                    destructive
                    onCancel={() => setShowSignOutConfirm(false)}
                    onConfirm={() => {
                        heavyImpact();
                        setShowSignOutConfirm(false);
                        signOut();
                    }}
                />
            </SafeAreaView>
        </ThemedView>
    );
}

function SquadPickerList({ userSquads, onSelect, onCreate }: {
    userSquads: { squad: { _id: string; name: string } | null }[];
    onSelect: (squadId: string) => void;
    onCreate: () => void;
}) {
    const theme = useTheme();
    return (
        <View style={switcherStyles.container}>
            <ThemedText type="title" style={switcherStyles.heading}>Your Squads</ThemedText>
            <ThemedText type="small" themeColor="textSecondary" style={switcherStyles.subtitle}>
                Pick a squad to jump into
            </ThemedText>

            <View style={switcherStyles.list}>
                {userSquads.map((entry) => {
                    if (!entry.squad) return null;
                    return (
                        <Pressable
                            key={entry.squad._id}
                            onPress={() => onSelect(entry.squad!._id)}
                            style={[
                                switcherStyles.card,
                                {
                                    backgroundColor: theme.surface,
                                    borderColor: theme.outline,
                                    shadowColor: theme.shadow,
                                },
                            ]}
                        >
                            <View style={[switcherStyles.cardIcon, { backgroundColor: theme.accent, borderColor: theme.outline }]}>
                                <ThemedText style={{ fontSize: Typography.title }}>🏠</ThemedText>
                            </View>
                            <ThemedText type="bodyBold" style={{ flex: 1 }}>{entry.squad.name}</ThemedText>
                            <ThemedText themeColor="textTertiary">→</ThemedText>
                        </Pressable>
                    );
                })}

                <Pressable
                    onPress={onCreate}
                    style={[
                        switcherStyles.createCard,
                        { backgroundColor: theme.accent, borderColor: theme.outline, shadowColor: theme.shadow },
                    ]}
                >
                    <ThemedText style={{ fontSize: Typography.title }}>🚀</ThemedText>
                    <View style={{ flex: 1 }}>
                        <ThemedText type="smallBold">Start something new</ThemedText>
                        <ThemedText type="caption" themeColor="textSecondary">Create or join a squad</ThemedText>
                    </View>
                    <ThemedText style={{ fontSize: Typography.body }}>→</ThemedText>
                </Pressable>
            </View>
        </View>
    );
}

const switcherStyles = StyleSheet.create({
    container: {
        paddingHorizontal: Spacing.lg,
        paddingTop: Spacing.xxxl,
    },
    heading: {
        textAlign: 'center',
        marginBottom: Spacing.xs,
    },
    subtitle: {
        textAlign: 'center',
        marginBottom: Spacing.xl,
    },
    list: {
        gap: Spacing.md,
    },
    card: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: Spacing.lg,
        borderWidth: 2,
        borderRadius: Radius.lg,
        gap: Spacing.md,
        shadowOffset: Shadows.md.offset,
        shadowOpacity: Shadows.md.opacity,
        shadowRadius: Shadows.md.radius,
        elevation: 3,
    },
    cardIcon: {
        width: 44,
        height: 44,
        borderRadius: Radius.md,
        borderWidth: 2,
        alignItems: 'center',
        justifyContent: 'center',
    },
    createCard: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: Spacing.lg,
        borderWidth: 2,
        borderRadius: Radius.lg,
        gap: Spacing.md,
        shadowOffset: Shadows.sm.offset,
        shadowOpacity: Shadows.sm.opacity,
        shadowRadius: Shadows.sm.radius,
        elevation: 2,
    },
});

const styles = StyleSheet.create({
    container: { flex: 1 },
    safeArea: { flex: 1 },
    scrollContent: {
        paddingBottom: 100,
        gap: Spacing.xl,
    },
});
