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
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { HomeMiniHeader } from '@/components/home/home-mini-header';
import { HomeSettingsSheet } from '@/components/home/home-settings-sheet';
import { NoSquadsLanding, SquadJoinForm } from '@/components/home/no-squads-landing';
import { RecentActivitySection } from '@/components/home/recent-activity-section';
import { SquadHero } from '@/components/home/squad-hero';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { AnimatedPressable } from '@/components/ui/animated-pressable';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { DashedSeparator } from '@/components/ui/dashed-separator';
import { Fab } from '@/components/ui/fab';
import { LoadingState } from '@/components/ui/loading-state';
import { LineHeight, Radius, Shadows, Spacing, Typography } from '@/constants/theme';
import { api } from '@/convex/_generated/api';
import { Id } from '@/convex/_generated/dataModel';
import { useTheme } from '@/hooks/use-theme';
import { useToast } from '@/hooks/use-toast';
import { useWebPushNotifications } from '@/hooks/use-web-push-notifications';
import { heavyImpact } from '@/utils/haptics';

const WEB_PUSH_DISMISS_KEY = 'webPushBannerDismissedAt';

async function shouldShowWebPushBanner(): Promise<boolean> {
    if (typeof window === 'undefined' || typeof Notification === 'undefined') return false;
    if (Notification.permission === 'granted' || Notification.permission === 'denied') return false;
    const dismissedAt = await AsyncStorage.getItem(WEB_PUSH_DISMISS_KEY);
    if (dismissedAt) {
        const elapsed = Date.now() - Number(dismissedAt);
        if (!Number.isNaN(elapsed) && elapsed < 7 * 24 * 60 * 60 * 1000) return false;
    }
    return true;
}

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
    const [showWebPushBanner, setShowWebPushBanner] = useState(false);
    const [webPushBusy, setWebPushBusy] = useState(false);

    const webPush = useWebPushNotifications(Platform.OS === 'web' && showWebPushBanner);

    const joinSquad = useMutation(api.squad.joinSquad);
    const userSquads = useQuery(api.squad.getUserSquads);
    const squadsUnreadSummary = useQuery(api.channel.getSquadsUnreadSummary);

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
                : 'Wrong password or Space name';
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

    useEffect(() => {
        if (Platform.OS !== 'web') return;
        let cancelled = false;
        void shouldShowWebPushBanner().then((show) => {
            if (!cancelled) setShowWebPushBanner(show);
        });
        return () => {
            cancelled = true;
        };
    }, []);

    /* ── No spaces yet ─────────────────────────────────────────────── */
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

                {Platform.OS === 'web' && showWebPushBanner && (
                    <View style={styles.bannerWrap}>
                        <WebPushBannerCard
                            standalone={webPush.standalone}
                            busy={webPushBusy}
                            onEnable={async () => {
                                setWebPushBusy(true);
                                await webPush.enable();
                                setWebPushBusy(false);
                                // Hide when permission settled (subscribed or blocked).
                                if (webPush.status.state === 'subscribed' || webPush.status.state === 'denied') {
                                    setShowWebPushBanner(false);
                                }
                            }}
                            onDismiss={async () => {
                                await AsyncStorage.setItem(WEB_PUSH_DISMISS_KEY, String(Date.now()));
                                setShowWebPushBanner(false);
                            }}
                        />
                    </View>
                )}

                <ScrollView
                    contentContainerStyle={styles.scrollContent}
                    showsVerticalScrollIndicator={false}
                >
                    {switcher ? (
                        <>
                            <SquadPickerList
                                userSquads={userSquads}
                                squadsUnreadSummary={squadsUnreadSummary ?? []}
                                onSelect={(squadId) => router.push(`/squad/${squadId}/chat` as any)}
                                onCreate={() => router.push('/create-squad')}
                                onJoin={() => setShowJoinForm(true)}
                            />

                            {showJoinForm && (
                                <View style={{ paddingHorizontal: Spacing.lg }}>
                                    <SquadJoinForm
                                        squadName={squadName}
                                        password={password}
                                        nickname={nickname}
                                        isJoining={isJoining}
                                        onCancel={() => setShowJoinForm(false)}
                                        onChangeSquadName={setSquadName}
                                        onChangePassword={setPassword}
                                        onChangeNickname={setNickname}
                                        onSubmit={submitJoinSquad}
                                    />
                                </View>
                            )}

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
                                squadAvatarUrl={activeSquad?.avatarUrl}
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
                    accessibilityLabel="Create new space"
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
                    message="You can always come back with your email and rejoin your space."
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

function WebPushBannerCard({
    standalone,
    busy,
    onEnable,
    onDismiss,
}: {
    standalone: boolean;
    busy: boolean;
    onEnable: () => void;
    onDismiss: () => void;
}) {
    const theme = useTheme();

    const needsInstall = !standalone && isIosSafari();

    return (
        <View style={[styles.bannerCard, { backgroundColor: theme.surfaceAccent, borderColor: theme.outline }]}>
            <ThemedText type="smallBold" style={styles.bannerTitle}>
                {needsInstall ? 'Enable notifications on iPhone' : 'Stay in the loop'}
            </ThemedText>
            <ThemedText type="caption" themeColor="textSecondary" style={styles.bannerBody}>
                {needsInstall
                    ? 'Tap Share → “Add to Home Screen”, open Clique from your Home Screen, then enable notifications here.'
                    : 'Get a gentle ping when your space needs you — even when this tab is closed.'}
            </ThemedText>
            <View style={styles.bannerActions}>
                <Pressable
                    onPress={onEnable}
                    disabled={busy}
                    accessibilityRole="button"
                    accessibilityLabel="Enable browser notifications"
                    style={[styles.bannerPrimary, { backgroundColor: theme.accent }]}
                >
                    <ThemedText type="smallBold" style={{ color: theme.text }}>
                        {busy ? 'Asking…' : 'Enable'}
                    </ThemedText>
                </Pressable>
                <Pressable
                    onPress={onDismiss}
                    accessibilityRole="button"
                    accessibilityLabel="Not now"
                    style={styles.bannerSecondary}
                >
                    <ThemedText type="small" themeColor="textSecondary">
                        Not now
                    </ThemedText>
                </Pressable>
            </View>
        </View>
    );
}

function isIosSafari() {
    if (typeof navigator === 'undefined') return false;
    const ua = navigator.userAgent;
    return /iPhone|iPad|iPod/.test(ua) && /Safari/.test(ua) && !/CriOS|FxiOS|OPiOS/.test(ua);
}

function SquadPickerList({ userSquads, squadsUnreadSummary, onSelect, onCreate, onJoin }: {
    userSquads: { squad: { _id: string; name: string; avatarUrl?: string | null } | null }[];
    squadsUnreadSummary: { squadId: string; hasUnread: boolean }[];
    onSelect: (squadId: string) => void;
    onCreate: () => void;
    onJoin: () => void;
}) {
    const theme = useTheme();
    const unreadSet = new Set(squadsUnreadSummary.filter(s => s.hasUnread).map(s => s.squadId));
    return (
        <View style={switcherStyles.container}>
            <ThemedText type="title" style={switcherStyles.heading}>Your Spaces</ThemedText>
            <ThemedText type="small" themeColor="textSecondary" style={switcherStyles.subtitle}>
                Pick a space to jump into
            </ThemedText>

            <View style={switcherStyles.list}>
                {userSquads.map((entry) => {
                    if (!entry.squad) return null;
                    const hasUnread = unreadSet.has(entry.squad._id);
                    return (
                        <AnimatedPressable
                            key={entry.squad._id}
                            onPress={() => onSelect(entry.squad!._id)}
                            pressedScale={0.98}
                            pressedTranslateY={1}
                            style={[
                                switcherStyles.card,
                                {
                                    backgroundColor: theme.surface,
                                    borderColor: theme.outline,
                                    shadowColor: theme.shadow,
                                },
                            ]}
                        >
                            <View>
                                <View style={[switcherStyles.cardIcon, { backgroundColor: theme.accent, borderColor: theme.outline }]}>
                                    {entry.squad.avatarUrl ? (
                                        <Image source={{ uri: entry.squad.avatarUrl }} style={switcherStyles.cardIconImage} contentFit="cover" />
                                    ) : (
                                        <ThemedText style={{ fontSize: Typography.title, lineHeight: LineHeight.title }}>🏠</ThemedText>
                                    )}
                                </View>
                                {hasUnread ? (
                                    <View style={[switcherStyles.badge, { backgroundColor: theme.error, borderColor: theme.surface }]} />
                                ) : null}
                            </View>
                            <ThemedText type="bodyBold" style={{ flex: 1 }}>{entry.squad.name}</ThemedText>
                            <ThemedText themeColor="textTertiary">→</ThemedText>
                        </AnimatedPressable>
                    );
                })}

                <AnimatedPressable
                    onPress={onCreate}
                    pressedScale={0.98}
                    pressedTranslateY={1}
                    style={[
                        switcherStyles.createCard,
                        { backgroundColor: theme.accent, borderColor: theme.outline, shadowColor: theme.shadow },
                    ]}
                >
                    <ThemedText style={{ fontSize: Typography.title, lineHeight: LineHeight.title }}>🚀</ThemedText>
                    <View style={{ flex: 1 }}>
                        <ThemedText type="smallBold">Start something new</ThemedText>
                        <ThemedText type="caption" themeColor="textSecondary">Create a space</ThemedText>
                    </View>
                    <ThemedText style={{ fontSize: Typography.body }}>→</ThemedText>
                </AnimatedPressable>

                <AnimatedPressable
                    onPress={onJoin}
                    pressedScale={0.98}
                    pressedTranslateY={1}
                    style={[
                        switcherStyles.createCard,
                        { backgroundColor: theme.surface, borderColor: theme.outline, shadowColor: theme.shadow },
                    ]}
                >
                    <ThemedText style={{ fontSize: Typography.title, lineHeight: LineHeight.title }}>🔑</ThemedText>
                    <View style={{ flex: 1 }}>
                        <ThemedText type="smallBold">Join a space</ThemedText>
                        <ThemedText type="caption" themeColor="textSecondary">Enter name & password</ThemedText>
                    </View>
                    <ThemedText style={{ fontSize: Typography.body }}>→</ThemedText>
                </AnimatedPressable>
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
        shadowOffset: Shadows.md.shadowOffset,
        shadowOpacity: Shadows.md.shadowOpacity,
        shadowRadius: Shadows.md.shadowRadius,
        elevation: 3,
    },
    cardIcon: {
        width: 44,
        height: 44,
        borderRadius: Radius.md,
        borderWidth: 2,
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
    },
    cardIconImage: {
        width: 44,
        height: 44,
    },
    badge: {
        position: 'absolute',
        top: -3,
        right: -3,
        width: 11,
        height: 11,
        borderRadius: 6,
        borderWidth: 2,
    },
    createCard: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: Spacing.lg,
        borderWidth: 2,
        borderRadius: Radius.lg,
        gap: Spacing.md,
        shadowOffset: Shadows.sm.shadowOffset,
        shadowOpacity: Shadows.sm.shadowOpacity,
        shadowRadius: Shadows.sm.shadowRadius,
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
    bannerWrap: {
        paddingHorizontal: Spacing.lg,
        paddingTop: Spacing.md,
    },
    bannerCard: {
        borderWidth: 2,
        borderRadius: Radius.lg,
        padding: Spacing.md,
        gap: Spacing.xs,
        shadowOffset: Shadows.sm.shadowOffset,
        shadowOpacity: Shadows.sm.shadowOpacity,
        shadowRadius: Shadows.sm.shadowRadius,
        elevation: 2,
    },
    bannerTitle: {},
    bannerBody: {
        lineHeight: LineHeight.small,
    },
    bannerActions: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.md,
        marginTop: Spacing.xs,
    },
    bannerPrimary: {
        minHeight: 40,
        paddingHorizontal: Spacing.lg,
        borderRadius: Radius.md,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 2,
        borderColor: 'transparent',
    },
    bannerSecondary: {
        minHeight: 40,
        paddingHorizontal: Spacing.md,
        alignItems: 'center',
        justifyContent: 'center',
    },
});
