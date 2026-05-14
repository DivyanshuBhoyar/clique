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
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { HomeMiniHeader } from '@/components/home/home-mini-header';
import { HomeSettingsSheet } from '@/components/home/home-settings-sheet';
import { JumpInGrid } from '@/components/home/jump-in-grid';
import { NoSquadsLanding } from '@/components/home/no-squads-landing';
import { RecentActivitySection } from '@/components/home/recent-activity-section';
import { SquadHero } from '@/components/home/squad-hero';
import { ThemedView } from '@/components/themed-view';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { DashedSeparator } from '@/components/ui/dashed-separator';
import { Fab } from '@/components/ui/fab';
import { LoadingState } from '@/components/ui/loading-state';
import { Spacing } from '@/constants/theme';
import { api } from '@/convex/_generated/api';
import { Id } from '@/convex/_generated/dataModel';
import { useToast } from '@/hooks/use-toast';
import { heavyImpact } from '@/utils/haptics';

export default function HomeScreen() {
    const router = useRouter();
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
    }, [userSquads, hasRedirected, router]);

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
                <HomeMiniHeader onSettingsPress={() => setShowSettings(true)} />

                <ScrollView
                    contentContainerStyle={styles.scrollContent}
                    showsVerticalScrollIndicator={false}
                >
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
                        onOpenActivity={(type) => {
                            if (!activeSquad) return;
                            router.push(`/squad/${activeSquad._id}/${type}` as any);
                        }}
                    />

                    <DashedSeparator />

                    <JumpInGrid
                        onOpenRoute={(route) => {
                            if (!activeSquad) return;
                            router.push(`/squad/${activeSquad._id}/${route}` as any);
                        }}
                    />
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
                    onMembersPress={() => {
                        setShowSettings(false);
                        toast.info('Member list is coming next.');
                    }}
                    onSquadSettingsPress={() => {
                        setShowSettings(false);
                        toast.info('Squad settings are coming next.');
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

const styles = StyleSheet.create({
    container: { flex: 1 },
    safeArea: { flex: 1 },
    scrollContent: {
        paddingBottom: 100,
        gap: Spacing.xl,
    },
});
