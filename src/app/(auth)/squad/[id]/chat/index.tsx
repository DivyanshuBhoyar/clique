import { useMutation, useQuery } from 'convex/react';
import { Link, useLocalSearchParams, useRouter } from 'expo-router';
import { Users } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ChannelCard } from '@/components/chat/channel-card';
import { CreateChannelModal } from '@/components/chat/create-channel-modal';
import { EphemeralChannelCard } from '@/components/chat/ephemeral-channel-card';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { LoadingState } from '@/components/ui/loading-state';
import { ScreenHeader } from '@/components/ui/screen-header';
import { SearchBar } from '@/components/ui/search-bar';
import { Radius, Shadows, Spacing, Typography, Weight } from '@/constants/theme';
import { api } from '@/convex/_generated/api';
import { Id } from '@/convex/_generated/dataModel';
import { useTheme } from '@/hooks/use-theme';
import { useToast } from '@/hooks/use-toast';

type ChannelType = 'topic' | 'mood' | 'ephemeral';

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
    const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);
    const [defaultType, setDefaultType] = useState<ChannelType>('topic');
    const [search, setSearch] = useState('');
    const toast = useToast();

    const handleCreate = async (args: { name: string; type: ChannelType; expiresAt?: number }) => {
        try {
            await createChannel({ squadId, name: args.name, type: args.type, expiresAt: args.expiresAt });
            toast.success('Channel created');
        } catch (err: any) {
            toast.error(err.message ?? 'Failed to create channel');
        }
    };

    const handleLeave = async () => {
        try {
            await leaveSquad({ squadId });
            router.replace('/');
        } catch (err: any) {
            toast.error(err.message ?? 'Failed to leave squad');
        }
    };

    if (channels === undefined) {
        return <LoadingState message="Warming up the group chat…" />;
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
            <SafeAreaView style={styles.safeArea} edges={[]}>
                <ScreenHeader
                    title={squad ? `🏠 ${squad.name}` : 'Squad Name'}
                    rightIcon={Users}
                    onRightPress={() => router.push(`/squad/${squadId}/members` as any)}
                />
                <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
                    <View style={styles.searchWrap}>
                        <SearchBar
                            value={search}
                            onChangeText={setSearch}
                            placeholder="Search channels…"
                        />
                    </View>

                    {mainChannels.map(channel => (
                        <Link key={channel._id} href={`/squad/${squadId}/chat/${channel._id}` as any} style={[
                            styles.heroCard,
                            {
                                backgroundColor: theme.accent,
                                borderWidth: 2,
                                borderColor: theme.outline,
                                shadowColor: theme.shadow,
                                shadowOffset: Shadows.md.offset,
                                shadowOpacity: Shadows.md.opacity,
                                shadowRadius: Shadows.md.radius,
                                elevation: 3,
                            },
                        ]}>
                            <View style={styles.heroHeader}>
                                <View style={[styles.iconCircle, { backgroundColor: theme.surface, borderWidth: 2, borderColor: theme.outline }]}>
                                    <ThemedText style={styles.iconEmoji}>💬</ThemedText>
                                </View>
                                <View style={styles.heroTitleRow}>
                                    <ThemedText type="heading">Lounge</ThemedText>
                                    {channel.unreadCount > 0 && (
                                        <View style={[styles.unreadDot, { backgroundColor: theme.accent }]}>
                                            <ThemedText type="caption" style={{ color: '#fff', fontWeight: Weight.bold }}>
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

                    {moodChannels.length > 0 && (
                        <ChannelSection
                            emoji="🎭" label="MOOD ROOMS"
                            channels={moodChannels}
                            squadId={squadId}
                            type="mood"
                            onCreate={() => { setDefaultType('mood'); setShowCreate(true); }}
                        />
                    )}

                    {topicChannels.length > 0 && (
                        <ChannelSection
                            emoji="💭" label="TOPIC THREADS"
                            channels={topicChannels}
                            squadId={squadId}
                            type="topic"
                            onCreate={() => { setDefaultType('topic'); setShowCreate(true); }}
                        />
                    )}

                    {ephemeralChannels.length > 0 && (
                        <View style={styles.section}>
                            <View style={styles.sectionHeader}>
                                <View style={styles.sectionTitleRow}>
                                    <ThemedText>⏳</ThemedText>
                                    <ThemedText type="caption" style={{ letterSpacing: 0.5, color: theme.textSecondary }}>EPHEMERAL</ThemedText>
                                </View>
                                <Pressable onPress={() => { setDefaultType('ephemeral'); setShowCreate(true); }} hitSlop={8}>
                                    <ThemedText type="small" style={{ color: theme.accent, fontWeight: Weight.semibold }}>+ New</ThemedText>
                                </Pressable>
                            </View>
                            {ephemeralChannels.map(channel => (
                                <EphemeralChannelCard key={channel._id} channel={channel} squadId={squadId} />
                            ))}
                        </View>
                    )}

                    {search.length > 0 && !hasResults && (
                        <View style={styles.emptySection}>
                            <ThemedText type="small" themeColor="textSecondary">
                                No channels match &quot;{search}&quot;
                            </ThemedText>
                        </View>
                    )}

                    {search.length === 0 && topicChannels.length === 0 && moodChannels.length === 0 && ephemeralChannels.length === 0 && (
                        <View style={styles.emptySection}>
                            <ThemedText style={{ fontSize: Typography.title, marginBottom: Spacing.sm }}>🚀</ThemedText>
                            <ThemedText type="small" themeColor="textSecondary">Create a channel to get started</ThemedText>
                            <Pressable
                                onPress={() => { setDefaultType('topic'); setShowCreate(true); }}
                                style={[styles.createBtn, {
                                    backgroundColor: theme.accent,
                                    borderColor: theme.outline,
                                    borderWidth: 2,
                                }]}
                            >
                                <ThemedText type="smallBold" style={{ color: theme.text }}>+ Create Channel</ThemedText>
                            </Pressable>
                        </View>
                    )}

                    <Pressable onPress={() => setShowLeaveConfirm(true)} style={[styles.leave, { borderTopColor: theme.outlineLight }]}>
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

            <ConfirmDialog
                visible={showLeaveConfirm}
                title="Leave Squad"
                message="Are you sure? You'll need the password to rejoin."
                confirmLabel="Leave"
                destructive
                onConfirm={handleLeave}
                onCancel={() => setShowLeaveConfirm(false)}
            />
        </ThemedView>
    );
}

function ChannelSection({ emoji, label, channels, squadId, type, onCreate }: {
    emoji: string;
    label: string;
    channels: any[];
    squadId: Id<"squads">;
    type: string;
    onCreate: () => void;
}) {
    const theme = useTheme();
    return (
        <View style={styles.section}>
            <View style={styles.sectionHeader}>
                <View style={styles.sectionTitleRow}>
                    <ThemedText>{emoji}</ThemedText>
                    <ThemedText type="caption" style={{ letterSpacing: 0.5, color: theme.textSecondary }}>{label}</ThemedText>
                </View>
                <Pressable onPress={onCreate} hitSlop={8}>
                    <ThemedText type="small" style={{ color: theme.accent, fontWeight: Weight.semibold }}>+ New</ThemedText>
                </Pressable>
            </View>
            {channels.map(channel => (
                <ChannelCard key={channel._id} channel={channel} squadId={squadId} type={type} />
            ))}
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    safeArea: { flex: 1 },
    content: { paddingHorizontal: Spacing.lg, paddingTop: Spacing.lg, paddingBottom: Spacing.xxxl },
    searchWrap: { marginBottom: Spacing.xl },
    heroCard: { borderRadius: Radius.lg, padding: Spacing.xl, marginBottom: Spacing.xl },
    heroHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, marginBottom: Spacing.sm },
    heroTitleRow: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    heroMessages: { gap: 2 },
    iconCircle: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
    iconEmoji: { fontSize: Typography.body },
    unreadDot: { width: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
    section: { marginBottom: Spacing.xl },
    sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.sm },
    sectionTitleRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs },
    emptySection: { alignItems: 'center', paddingVertical: Spacing.xxxl, gap: Spacing.sm },
    createBtn: { marginTop: Spacing.sm, paddingHorizontal: Spacing.xl, paddingVertical: Spacing.sm, borderRadius: Radius.md, minHeight: 44, alignItems: 'center', justifyContent: 'center' },
    leave: { marginTop: Spacing.lg, paddingTop: Spacing.lg, borderTopWidth: 1.5, alignItems: 'center' },
});
