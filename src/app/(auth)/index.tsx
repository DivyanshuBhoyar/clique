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
import {
    BookOpen,
    Camera,
    ChevronRight,
    Link2,
    MessageCircle,
    Music,
    Settings,
    Zap,
} from 'lucide-react-native';
import { useEffect, useState } from 'react';
import {
    KeyboardAvoidingView,
    Platform,
    Pressable,
    ScrollView,
    StyleSheet,
    TextInput,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AuthHeroCard } from '@/components/auth/auth-hero-card';
import { SquadHero } from '@/components/home/squad-hero';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { DashedSeparator } from '@/components/ui/dashed-separator';
import { Fab } from '@/components/ui/fab';
import { LoadingState } from '@/components/ui/loading-state';
import { LineHeight, Radius, Shadows, Spacing, Typography, Weight } from '@/constants/theme';
import { api } from '@/convex/_generated/api';
import { Id } from '@/convex/_generated/dataModel';
import { useTheme } from '@/hooks/use-theme';

/* ── Jump-In tile colour palette (one warm colour each) ── */
const JUMP_TILES = [
    { label: 'Chat', emoji: '💬', bg: '#F5E6C8', route: 'chat' },
    { label: 'Drops', emoji: '⚡', bg: '#FAD4A0', route: 'drops' },
    { label: 'Memories', emoji: '🏡', bg: '#F5C4C0', route: 'memories' },
    { label: 'Notes', emoji: '📖', bg: '#C8D8F0', route: 'notes' },
    { label: 'Vibes', emoji: '✨', bg: '#DDD0F0', route: 'vibes' },
    { label: 'Explore', emoji: '🔮', bg: '#E8E8E8', route: null, dashed: true },
] as const;

/* ── Activity type icons ── */
function activityIcon(type: string, color: string) {
    const props = { size: 16, color, strokeWidth: 2 };
    switch (type) {
        case 'drop': return <Music {...props} />;
        case 'memory': return <Camera {...props} />;
        case 'note': return <BookOpen {...props} />;
        case 'chat': return <MessageCircle {...props} />;
        case 'link': return <Link2 {...props} />;
        default: return <Zap {...props} />;
    }
}

/* Activity colour per type */
const ACTIVITY_COLORS: Record<string, string> = {
    drop: '#FAD4A0',
    memory: '#F5C4C0',
    note: '#C8D8F0',
    chat: '#F5E6C8',
    link: '#DDD0F0',
};

export default function HomeScreen() {
    const router = useRouter();
    const theme = useTheme();
    const { signOut } = useAuthActions();

    const [showJoinForm, setShowJoinForm] = useState(false);
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
        } catch {
            // error handled silently — user sees native alert via Convex
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
                    <ScrollView
                        contentContainerStyle={[styles.scrollContent, styles.centered]}
                        showsVerticalScrollIndicator={false}
                        keyboardShouldPersistTaps="handled"
                    >
                        <AuthHeroCard emoji="🏠" title="Homie Squad" subtitle="your cozy little corner ✨" />

                        <Pressable
                            style={[styles.bigBtn, { backgroundColor: theme.accent, borderColor: theme.outline }]}
                            onPress={() => router.push('/create-squad')}
                        >
                            <ThemedText style={{ fontSize: Typography.subtitle }}>🏠</ThemedText>
                            <ThemedText type="bodyBold">Create a New Squad</ThemedText>
                        </Pressable>

                        {!showJoinForm ? (
                            <Pressable
                                style={[styles.bigBtn, { backgroundColor: theme.surface, borderColor: theme.outline }]}
                                onPress={() => setShowJoinForm(true)}
                            >
                                <ThemedText style={{ fontSize: Typography.subtitle }}>🔑</ThemedText>
                                <ThemedText type="bodyBold">Join Squad by Name</ThemedText>
                            </Pressable>
                        ) : (
                            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
                                <View style={[styles.joinCard, { backgroundColor: theme.surface, borderColor: theme.outline }]}>
                                    <ThemedText type="bodyBold" style={{ marginBottom: Spacing.sm }}>Join a Squad 🔑</ThemedText>
                                    {[
                                        { label: 'Squad Name', value: squadName, setter: setSquadName, placeholder: 'e.g. Weekend Warriors', secure: false },
                                        { label: 'Password', value: password, setter: setPassword, placeholder: 'Secret password', secure: true },
                                        { label: 'Your Nickname', value: nickname, setter: setNickname, placeholder: 'What should we call you?', secure: false },
                                    ].map(({ label, value, setter, placeholder, secure }) => (
                                        <View key={label} style={{ gap: 4 }}>
                                            <ThemedText type="smallBold">{label}</ThemedText>
                                            <TextInput
                                                style={[styles.joinInput, { color: theme.text, borderColor: theme.outline, backgroundColor: theme.background }]}
                                                value={value}
                                                onChangeText={setter}
                                                placeholder={placeholder}
                                                placeholderTextColor={theme.placeholder}
                                                secureTextEntry={secure}
                                            />
                                        </View>
                                    ))}
                                    <View style={styles.joinActions}>
                                        <Pressable onPress={() => setShowJoinForm(false)} hitSlop={8}>
                                            <ThemedText type="small" themeColor="textSecondary">Cancel</ThemedText>
                                        </Pressable>
                                        <Pressable
                                            style={[styles.joinBtn, {
                                                backgroundColor: theme.accent,
                                                borderColor: theme.outline,
                                            }]}
                                            onPress={submitJoinSquad}
                                            disabled={isJoining}
                                        >
                                            <ThemedText type="bodyBold" style={{ color: theme.text }}>
                                                {isJoining ? 'Joining…' : 'Join!'}
                                            </ThemedText>
                                        </Pressable>
                                    </View>
                                </View>
                            </KeyboardAvoidingView>
                        )}

                        <Pressable onPress={() => signOut()} hitSlop={8} style={styles.signOutBtn}>
                            <ThemedText type="small" themeColor="textSecondary">Sign out</ThemedText>
                        </Pressable>
                    </ScrollView>
                </SafeAreaView>
            </ThemedView>
        );
    }

    /* ── Has squads — full dashboard ───────────────────────────────── */
    return (
        <ThemedView style={styles.container}>
            <SafeAreaView style={styles.safeArea} edges={['top']}>
                {/* Mini header */}
                <View style={[styles.miniHeader, { borderBottomColor: theme.outlineLight }]}>
                    <ThemedText
                        type="caption"
                        style={{ letterSpacing: 1.5, fontWeight: Weight.bold, color: theme.textSecondary }}
                    >
                        SQUAD HOME
                    </ThemedText>
                    <Pressable
                        hitSlop={8}
                        style={[styles.settingsBtn, { backgroundColor: theme.surface, borderColor: theme.outline }]}
                        onPress={() => signOut()}
                    >
                        <Settings size={18} color={theme.text} strokeWidth={2} />
                    </Pressable>
                </View>

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

                    {/* Recent Activity */}
                    <View style={styles.section}>
                        <View style={styles.sectionHeader}>
                            <ThemedText type="bodyBold">Recent Activity</ThemedText>
                            <Pressable hitSlop={8}>
                                <ThemedText type="small" style={{ color: theme.accent, fontWeight: Weight.semibold }}>
                                    See all →
                                </ThemedText>
                            </Pressable>
                        </View>

                        {[
                            { type: 'drop', label: 'maya dropped a song', sub: 'Sunset Lover · Petit Biscuit · 2m ago' },
                            { type: 'memory', label: 'new memory added', sub: 'beach day fits · 1h ago' },
                            { type: 'chat', label: 'theo: found our new study spot 📚', sub: '14m ago' },
                        ].map((item, i) => (
                            <Pressable
                                key={i}
                                style={[styles.activityRow, {
                                    backgroundColor: theme.surface,
                                    borderColor: theme.outline,
                                    shadowColor: theme.shadow,
                                    shadowOffset: Shadows.sm.offset,
                                    shadowOpacity: Shadows.sm.opacity,
                                    shadowRadius: Shadows.sm.radius,
                                    elevation: 2,
                                }]}
                                onPress={() => activeSquad && router.push(`/squad/${activeSquad._id}/${item.type}` as any)}
                            >
                                <View style={[styles.activityIcon, { backgroundColor: ACTIVITY_COLORS[item.type] ?? theme.backgroundElement }]}>
                                    {activityIcon(item.type, theme.text)}
                                </View>
                                <View style={styles.activityText}>
                                    <ThemedText type="small" style={{ fontWeight: Weight.semibold }} numberOfLines={1}>
                                        {item.label}
                                    </ThemedText>
                                    <ThemedText type="caption" themeColor="textSecondary" numberOfLines={1}>
                                        {item.sub}
                                    </ThemedText>
                                </View>
                                <ChevronRight size={14} color={theme.textTertiary} strokeWidth={2} />
                            </Pressable>
                        ))}
                    </View>

                    <DashedSeparator />

                    {/* Jump In grid */}
                    <View style={styles.section}>
                        <ThemedText type="bodyBold">Jump In</ThemedText>
                        <View style={styles.jumpGrid}>
                            {JUMP_TILES.map((tile) => {
                                const isDashed = 'dashed' in tile && tile.dashed;
                                return (
                                    <Pressable
                                        key={tile.label}
                                        style={[
                                            styles.jumpTile,
                                            {
                                                backgroundColor: isDashed ? theme.surface : tile.bg,
                                                borderColor: theme.outline,
                                                borderStyle: (tile as any).dashed ? 'dashed' : 'solid',
                                            },
                                        ]}
                                        onPress={() => {
                                            if (!activeSquad || !tile.route) return;
                                            router.push(`/squad/${activeSquad._id}/${tile.route}` as any);
                                        }}
                                    >
                                        <ThemedText style={styles.jumpEmoji}>{tile.emoji}</ThemedText>
                                        <ThemedText type="bodyBold" style={styles.jumpLabel}>{tile.label}</ThemedText>
                                        {isDashed && (
                                            <ThemedText type="caption" themeColor="textTertiary">
                                                discover more
                                            </ThemedText>
                                        )}
                                    </Pressable>
                                );
                            })}
                        </View>
                    </View>
                </ScrollView>

                <Fab
                    onPress={() => router.push('/create-squad')}
                    accessibilityLabel="Create new squad"
                />
            </SafeAreaView>
        </ThemedView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    safeArea: { flex: 1 },
    miniHeader: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: Spacing.lg,
        paddingVertical: Spacing.md,
        borderBottomWidth: 1,
        position: 'relative',
    },
    settingsBtn: {
        position: 'absolute',
        right: Spacing.lg,
        width: 36,
        height: 36,
        borderRadius: Radius.md,
        borderWidth: 2,
        alignItems: 'center',
        justifyContent: 'center',
    },
    scrollContent: {
        paddingBottom: 100,
        gap: Spacing.xl,
    },
    centered: {
        paddingHorizontal: Spacing.xl,
        justifyContent: 'center',
        flexGrow: 1,
        gap: Spacing.md,
    },
    bigBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: Spacing.sm,
        borderWidth: 2,
        borderRadius: Radius.lg,
        paddingVertical: Spacing.lg,
    },
    signOutBtn: { alignSelf: 'center', paddingVertical: Spacing.sm },
    joinCard: {
        borderWidth: 2,
        borderRadius: Radius.lg,
        padding: Spacing.xl,
        gap: Spacing.md,
    },
    joinInput: {
        borderWidth: 2,
        borderRadius: Radius.lg,
        paddingHorizontal: Spacing.lg,
        paddingVertical: Spacing.sm,
        fontSize: Typography.body,
    },
    joinActions: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: Spacing.xs,
    },
    joinBtn: {
        borderWidth: 2,
        borderRadius: Radius.full,
        paddingHorizontal: Spacing.xl,
        paddingVertical: Spacing.sm,
    },
    section: {
        gap: Spacing.md,
        paddingHorizontal: Spacing.lg,
    },
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    activityRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.md,
        borderWidth: 2,
        borderRadius: Radius.lg,
        paddingHorizontal: Spacing.lg,
        paddingVertical: Spacing.md,
    },
    activityIcon: {
        width: 36,
        height: 36,
        borderRadius: Radius.md,
        alignItems: 'center',
        justifyContent: 'center',
    },
    activityText: { flex: 1 },
    jumpGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: Spacing.md,
    },
    jumpTile: {
        width: '47%',
        borderWidth: 2,
        borderRadius: Radius.xl,
        paddingHorizontal: Spacing.lg,
        paddingVertical: Spacing.xl,
        gap: Spacing.xs,
    },
    jumpEmoji: { fontSize: Typography.heading },
    jumpLabel: { fontSize: Typography.body },
});
