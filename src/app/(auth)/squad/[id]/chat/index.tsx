import { useMutation, useQuery } from 'convex/react';
import { Link, useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CreateChannelModal } from '@/components/chat/create-channel-modal';
import { SquadHeader } from '@/components/squad-header';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Radius, Shadows, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { api } from '@/convex/_generated/api';
import { Id } from '@/convex/_generated/dataModel';

type ChannelType = 'topic' | 'mood' | 'ephemeral';

const TYPE_EMOJI: Record<string, string> = {
    main: '💬',
    mood: '🎭',
    topic: '💭',
    ephemeral: '⏳',
};

export default function ChatScreen() {
    const router = useRouter();
    const theme = useTheme();
    const { id } = useLocalSearchParams<{ id: string }>();
    const squadId = id as Id<"squads">;

    const channels = useQuery(api.channel.getChannelsWithUnread, squadId ? { squadId } : "skip");
    const squad = useQuery(api.squad.getSquad, squadId ? { id: squadId } : "skip");
    const createChannel = useMutation(api.channel.createChannel);
    const leaveSquad = useMutation(api.squad.leaveSquad);

    const [showCreate, setShowCreate] = useState(false);
    const [defaultType, setDefaultType] = useState<ChannelType>('topic');
    const [search, setSearch] = useState('');

    const handleCreate = async (args: { name: string; type: ChannelType; expiresAt?: number }) => {
        await createChannel({ squadId, name: args.name, type: args.type, expiresAt: args.expiresAt });
    };

    const handleLeave = async () => {
        try {
            await leaveSquad({ squadId });
        } finally {
            router.replace('/');
        }
    };

    if (channels === undefined) {
        return (
            <SafeAreaView style={[styles.loading, { backgroundColor: theme.background }]}>
                <ActivityIndicator size="large" color={theme.accent} />
            </SafeAreaView>
        );
    }

    const matchesSearch = (name: string) =>
        search.length === 0 || name.toLowerCase().includes(search.toLowerCase());

    const mainChannels = channels.filter(c => c.type === 'main' && matchesSearch(c.name));
    const topicChannels = channels.filter(c => c.type === 'topic' && matchesSearch(c.name));
    const moodChannels = channels.filter(c => c.type === 'mood' && matchesSearch(c.name));
    const ephemeralChannels = channels.filter(c => c.type === 'ephemeral' && matchesSearch(c.name));

    const hasResults = mainChannels.length > 0 || topicChannels.length > 0
        || moodChannels.length > 0 || ephemeralChannels.length > 0;

    return (
        <ThemedView style={styles.container}>
            <SafeAreaView style={styles.safeArea}>
                <SquadHeader name={squad?.name} />
                <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
                    {/* Search */}
                    <View style={[styles.searchBar, { backgroundColor: theme.inputBackground }]}>
                        <ThemedText themeColor="textTertiary" style={styles.searchIcon}>🔍</ThemedText>
                        <TextInput
                            style={[styles.searchInput, { color: theme.text }]}
                            placeholder="Search channels..."
                            placeholderTextColor={theme.placeholder}
                            value={search}
                            onChangeText={setSearch}
                        />
                    </View>

                    {/* Lounge Hero */}
                    {mainChannels.map(channel => (
                        <Link key={channel._id} href={`/squad/${squadId}/chat/${channel._id}` as any} style={[
                            styles.heroCard,
                            {
                                backgroundColor: theme.surface,
                                shadowColor: theme.shadow,
                                shadowOffset: Shadows.md.offset,
                                shadowOpacity: Shadows.md.opacity,
                                shadowRadius: Shadows.md.radius,
                                elevation: 3,
                            },
                        ]}>
                            <View style={styles.heroHeader}>
                                <View style={[styles.iconCircle, { backgroundColor: theme.accentSoft }]}>
                                    <ThemedText style={styles.iconEmoji}>💬</ThemedText>
                                </View>
                                <View style={styles.heroTitleRow}>
                                    <ThemedText type="heading">Lounge</ThemedText>
                                    {channel.unreadCount > 0 && (
                                        <View style={[styles.unreadDot, { backgroundColor: theme.accent }]}>
                                            <ThemedText type="caption" style={{ color: '#fff', fontWeight: '700' }}>
                                                {channel.unreadCount}
                                            </ThemedText>
                                        </View>
                                    )}
                                </View>
                            </View>
                            {channel.recentMessages.length > 0 && (
                                <View style={styles.heroMessages}>
                                    {channel.recentMessages.slice(0, 2).map((msg, i) => (
                                        <ThemedText key={i} type="small" numberOfLines={1} themeColor="textSecondary">
                                            {msg.nickname}: {msg.content}
                                        </ThemedText>
                                    ))}
                                </View>
                            )}
                        </Link>
                    ))}

                    {/* Mood Rooms */}
                    {moodChannels.length > 0 && (
                        <View style={styles.section}>
                            <View style={styles.sectionHeader}>
                                <View style={styles.sectionTitleRow}>
                                    <ThemedText>🎭</ThemedText>
                                    <ThemedText type="caption" style={{ letterSpacing: 0.5, color: theme.textSecondary }}>MOOD ROOMS</ThemedText>
                                </View>
                                <Pressable onPress={() => { setDefaultType('mood'); setShowCreate(true); }} hitSlop={8}>
                                    <ThemedText type="small" style={{ color: theme.accent, fontWeight: '600' }}>+ New</ThemedText>
                                </Pressable>
                            </View>
                            {moodChannels.map(channel => (
                                <ChannelCard key={channel._id} channel={channel} squadId={squadId} theme={theme} type="mood" />
                            ))}
                        </View>
                    )}

                    {/* Topic Threads */}
                    {topicChannels.length > 0 && (
                        <View style={styles.section}>
                            <View style={styles.sectionHeader}>
                                <View style={styles.sectionTitleRow}>
                                    <ThemedText>💭</ThemedText>
                                    <ThemedText type="caption" style={{ letterSpacing: 0.5, color: theme.textSecondary }}>TOPIC THREADS</ThemedText>
                                </View>
                                <Pressable onPress={() => { setDefaultType('topic'); setShowCreate(true); }} hitSlop={8}>
                                    <ThemedText type="small" style={{ color: theme.accent, fontWeight: '600' }}>+ New</ThemedText>
                                </Pressable>
                            </View>
                            {topicChannels.map(channel => (
                                <ChannelCard key={channel._id} channel={channel} squadId={squadId} theme={theme} type="topic" />
                            ))}
                        </View>
                    )}

                    {/* Ephemeral Rooms */}
                    {ephemeralChannels.length > 0 && (
                        <View style={styles.section}>
                            <View style={styles.sectionHeader}>
                                <View style={styles.sectionTitleRow}>
                                    <ThemedText>⏳</ThemedText>
                                    <ThemedText type="caption" style={{ letterSpacing: 0.5, color: theme.textSecondary }}>EPHEMERAL</ThemedText>
                                </View>
                                <Pressable onPress={() => { setDefaultType('ephemeral'); setShowCreate(true); }} hitSlop={8}>
                                    <ThemedText type="small" style={{ color: theme.accent, fontWeight: '600' }}>+ New</ThemedText>
                                </Pressable>
                            </View>
                            {ephemeralChannels.map(channel => (
                                <EphemeralChannelCard key={channel._id} channel={channel} squadId={squadId} theme={theme} />
                            ))}
                        </View>
                    )}

                    {/* No results for search */}
                    {search.length > 0 && !hasResults && (
                        <View style={styles.emptySection}>
                            <ThemedText type="small" themeColor="textSecondary">
                                No channels match &quot;{search}&quot;
                            </ThemedText>
                        </View>
                    )}

                    {/* Empty state (no search active) */}
                    {search.length === 0 && topicChannels.length === 0 && moodChannels.length === 0 && ephemeralChannels.length === 0 && (
                        <View style={styles.emptySection}>
                            <ThemedText style={{ fontSize: 36, marginBottom: Spacing.sm }}>🚀</ThemedText>
                            <ThemedText type="small" themeColor="textSecondary">Create a channel to get started</ThemedText>
                            <Pressable
                                onPress={() => { setDefaultType('topic'); setShowCreate(true); }}
                                style={[styles.createBtn, { backgroundColor: theme.accent }]}
                            >
                                <ThemedText type="smallBold" style={{ color: '#fff' }}>+ Create Channel</ThemedText>
                            </Pressable>
                        </View>
                    )}

                    <Pressable onPress={handleLeave} style={[styles.leave, { borderTopColor: theme.outlineLight }]}>
                        <ThemedText type="small" style={{ color: theme.error }}>Leave Squad</ThemedText>
                    </Pressable>
                </ScrollView>
            </SafeAreaView>

            <CreateChannelModal
                visible={showCreate}
                defaultType={defaultType}
                onClose={() => setShowCreate(false)}
                onCreate={handleCreate}
            />
        </ThemedView>
    );
}

function formatTimeRemaining(ms: number): string {
    if (ms <= 0) return 'Expired';
    const minutes = Math.floor(ms / 60000);
    if (minutes < 60) return `${minutes}m left`;
    const hours = Math.floor(minutes / 60);
    const remainMin = minutes % 60;
    if (hours < 24) return remainMin > 0 ? `${hours}h ${remainMin}m left` : `${hours}h left`;
    const days = Math.floor(hours / 24);
    return `${days}d left`;
}

function iconBgForType(type: string, theme: ReturnType<typeof useTheme>) {
    if (type === 'mood') return theme.surfaceWarm;
    if (type === 'topic') return theme.accentSoft;
    return theme.errorSoft;
}

function ChannelCard({ channel, squadId, theme, type }: {
    channel: { _id: string; name: string; unreadCount: number; recentMessages?: Array<{ nickname: string; content: string }> };
    squadId: Id<"squads">;
    theme: ReturnType<typeof useTheme>;
    type: string;
}) {
    const emoji = TYPE_EMOJI[type] ?? '💬';
    const iconBg = iconBgForType(type, theme);
    const preview = channel.recentMessages?.[0];

    return (
        <Link href={`/squad/${squadId}/chat/${channel._id}` as any} style={[
            styles.channelCard,
            {
                backgroundColor: theme.surface,
                shadowColor: theme.shadow,
                shadowOffset: Shadows.sm.offset,
                shadowOpacity: Shadows.sm.opacity,
                shadowRadius: Shadows.sm.radius,
                elevation: 2,
            },
        ]}>
            <View style={styles.channelCardInner}>
                <View style={[styles.iconCircle, { backgroundColor: iconBg }]}>
                    <ThemedText style={styles.iconEmoji}>{emoji}</ThemedText>
                </View>
                <View style={styles.channelCardContent}>
                    <View style={styles.channelRow}>
                        <ThemedText type="smallBold">{channel.name}</ThemedText>
                        {channel.unreadCount > 0 && (
                            <View style={[styles.unreadDot, { backgroundColor: theme.accent }]}>
                                <ThemedText type="caption" style={{ color: '#fff', fontWeight: '700' }}>
                                    {channel.unreadCount}
                                </ThemedText>
                            </View>
                        )}
                    </View>
                    {preview && (
                        <ThemedText type="caption" themeColor="textSecondary" numberOfLines={2}>
                            {preview.nickname}: {preview.content}
                        </ThemedText>
                    )}
                </View>
            </View>
        </Link>
    );
}

function EphemeralChannelCard({ channel, squadId, theme }: {
    channel: { _id: string; name: string; unreadCount: number; expiresAt?: number; isExpired?: boolean };
    squadId: Id<"squads">;
    theme: ReturnType<typeof useTheme>;
}) {
    const remaining = channel.expiresAt ? channel.expiresAt - Date.now() : 0;
    const expired = channel.isExpired ?? remaining <= 0;

    return (
        <Link href={`/squad/${squadId}/chat/${channel._id}` as any} style={[
            styles.channelCard,
            {
                backgroundColor: expired ? theme.backgroundElement : theme.surface,
                shadowColor: theme.shadow,
                shadowOffset: Shadows.sm.offset,
                shadowOpacity: Shadows.sm.opacity,
                shadowRadius: Shadows.sm.radius,
                elevation: 2,
            },
            expired && { opacity: 0.6 },
        ]}>
            <View style={styles.channelCardInner}>
                <View style={[styles.iconCircle, { backgroundColor: theme.errorSoft }]}>
                    <ThemedText style={styles.iconEmoji}>⏳</ThemedText>
                </View>
                <View style={styles.channelCardContent}>
                    <View style={styles.channelRow}>
                        <ThemedText type="smallBold">{channel.name}</ThemedText>
                        <View style={styles.channelRowRight}>
                            {channel.unreadCount > 0 && (
                                <View style={[styles.unreadDot, { backgroundColor: theme.accent }]}>
                                    <ThemedText type="caption" style={{ color: '#fff', fontWeight: '700' }}>
                                        {channel.unreadCount}
                                    </ThemedText>
                                </View>
                            )}
                            <View style={[styles.timerBadge, { backgroundColor: expired ? theme.errorSoft : theme.warningSoft }]}>
                                <ThemedText type="caption" style={{ color: expired ? theme.error : theme.warning, fontWeight: '600' }}>
                                    {formatTimeRemaining(remaining)}
                                </ThemedText>
                            </View>
                        </View>
                    </View>
                </View>
            </View>
        </Link>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    loading: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    safeArea: { flex: 1 },
    content: { paddingHorizontal: Spacing.lg, paddingTop: Spacing.lg, paddingBottom: Spacing.xxxl },

    // Search
    searchBar: {
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: Radius.lg,
        paddingHorizontal: Spacing.md,
        paddingVertical: Spacing.sm,
        marginBottom: Spacing.xl,
        gap: Spacing.sm,
    },
    searchIcon: { fontSize: 16 },
    searchInput: {
        flex: 1,
        fontSize: 14,
        lineHeight: 20,
        padding: 0,
    },

    // Hero / Lounge
    heroCard: {
        borderRadius: Radius.lg,
        padding: Spacing.xl,
        marginBottom: Spacing.xl,
    },
    heroHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.md,
        marginBottom: Spacing.sm,
    },
    heroTitleRow: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    heroMessages: { gap: 2 },

    // Icon circle
    iconCircle: {
        width: 36,
        height: 36,
        borderRadius: 18,
        alignItems: 'center',
        justifyContent: 'center',
    },
    iconEmoji: { fontSize: 18 },

    // Unread
    unreadDot: {
        width: 22,
        height: 22,
        borderRadius: 11,
        alignItems: 'center',
        justifyContent: 'center',
    },

    // Sections
    section: { marginBottom: Spacing.xl },
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: Spacing.sm,
    },
    sectionTitleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.xs,
    },

    // Channel cards
    channelCard: {
        borderRadius: Radius.lg,
        padding: Spacing.md,
        marginBottom: Spacing.sm,
    },
    channelCardInner: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.md,
    },
    channelCardContent: { flex: 1, gap: 2 },
    channelRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    channelRowRight: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.xs,
    },

    // Ephemeral
    timerBadge: {
        paddingHorizontal: Spacing.sm,
        paddingVertical: 2,
        borderRadius: Radius.sm,
    },

    // Empty
    emptySection: {
        alignItems: 'center',
        paddingVertical: Spacing.xxxl,
        gap: Spacing.sm,
    },
    createBtn: {
        marginTop: Spacing.sm,
        paddingHorizontal: Spacing.xl,
        paddingVertical: Spacing.sm,
        borderRadius: Radius.md,
        minHeight: 44,
        alignItems: 'center',
        justifyContent: 'center',
    },
    leave: {
        marginTop: Spacing.lg,
        paddingTop: Spacing.lg,
        borderTopWidth: 1.5,
        alignItems: 'center',
    },
});
