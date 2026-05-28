import { useMutation, useQuery } from 'convex/react';
import { useGlobalSearchParams, useRouter } from 'expo-router';
import { Globe, Users } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ChannelCard } from '@/components/chat/channel-card';
import { CreateChannelModal } from '@/components/chat/create-channel-modal';
import { EphemeralChannelCard } from '@/components/chat/ephemeral-channel-card';
import { LoungeHeroCard } from '@/components/chat/lounge-hero-card';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { LoadingState } from '@/components/ui/loading-state';
import { ScreenHeader } from '@/components/ui/screen-header';
import { SearchBar } from '@/components/ui/search-bar';
import { Radius, Spacing, Typography } from '@/constants/theme';
import { api } from '@/convex/_generated/api';
import { Id } from '@/convex/_generated/dataModel';
import { useTheme } from '@/hooks/use-theme';
import { useToast } from '@/hooks/use-toast';

type ChannelType = 'topic' | 'mood' | 'ephemeral' | 'private';

export default function ChatScreen() {
    const router = useRouter();
    const theme = useTheme();
    const { id } = useGlobalSearchParams<{ id: string }>();
    const squadId = id as Id<"squads">;

    const channels = useQuery(api.channel.getChannelsWithUnread, squadId ? { squadId } : "skip");
    const squad = useQuery(api.squad.getSquad, squadId ? { id: squadId } : "skip");
    const squadMembers = useQuery(api.squad.getSquadMembers, squadId ? { squadId } : "skip");
    const createChannel = useMutation(api.channel.createChannel);
    const leaveSquad = useMutation(api.squad.leaveSquad);

    const [showCreate, setShowCreate] = useState(false);
    const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);
    const [defaultType, setDefaultType] = useState<ChannelType>('topic');
    const [search, setSearch] = useState('');
    const toast = useToast();

    const handleCreate = async (args: { name: string; type: ChannelType; emoji?: string; expiresAt?: number; memberIds?: any[] }) => {
        try {
            await createChannel({ squadId, name: args.name, type: args.type, emoji: args.emoji, expiresAt: args.expiresAt, memberIds: args.memberIds });
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
    const privateChannels = channels.filter(c => c.type === 'private' && matchesSearch(c.name));
    const ephemeralChannels = channels.filter(c => c.type === 'ephemeral' && matchesSearch(c.name));

    const hasResults = mainChannels.length > 0 || topicChannels.length > 0
        || moodChannels.length > 0 || ephemeralChannels.length > 0 || privateChannels.length > 0;

    return (
        <ThemedView style={styles.container}>
            <SafeAreaView style={styles.safeArea} edges={[]}>
                <ScreenHeader
                    title={squad ? `🏠 ${squad.name}` : 'Squad Name'}
                    leftIcon={Globe}
                    onLeftPress={() => router.navigate('/?switcher=1' as any)}
                    rightIcon={Users}
                    onRightPress={() => router.push(`/squad/${squadId}/members` as any)}
                />
                <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
                    <View style={styles.searchWrap}>
                        <SearchBar
                            value={search}
                            onChangeText={setSearch}
                            placeholder="Search channels…"
                            variant="soft"
                        />
                    </View>

                    {mainChannels.map(channel => (
                        <LoungeHeroCard
                            key={channel._id}
                            channel={channel}
                            squadId={squadId}
                            members={squadMembers ?? []}
                        />
                    ))}

                    {moodChannels.length > 0 && (
                        <ChannelSection
                            emoji="🎭" label="Mood rooms"
                            channels={moodChannels}
                            squadId={squadId}
                            type="mood"
                            onCreate={() => { setDefaultType('mood'); setShowCreate(true); }}
                        />
                    )}
                    {topicChannels.length > 0 && (
                        <ChannelSection
                            emoji="💭" label="Topic threads"
                            channels={topicChannels}
                            squadId={squadId}
                            type="topic"
                            onCreate={() => { setDefaultType('topic'); setShowCreate(true); }}
                        />
                    )}
                    {privateChannels.length > 0 && (
                        <ChannelSection
                            emoji="🔒" label="Private rooms"
                            channels={privateChannels}
                            squadId={squadId}
                            type="private"
                            onCreate={() => { setDefaultType('private'); setShowCreate(true); }}
                        />
                    )}

                    {ephemeralChannels.length > 0 && (
                        <View style={styles.section}>
                            <View style={styles.sectionHeader}>
                                <View style={styles.sectionTitleRow}>
                                    <View style={[styles.sectionEmoji, { backgroundColor: theme.errorSoft }]}> 
                                        <ThemedText type="caption">⏳</ThemedText>
                                    </View>
                                    <View>
                                        <ThemedText type="bodyBold" style={styles.sectionTitle}>Ephemeral</ThemedText>
                                        <ThemedText type="caption" themeColor="textSecondary">{ephemeralChannels.length} temporary room{ephemeralChannels.length !== 1 ? 's' : ''}</ThemedText>
                                    </View>
                                </View>
                                <Pressable onPress={() => { setDefaultType('ephemeral'); setShowCreate(true); }} hitSlop={8} style={[styles.newButton, { backgroundColor: theme.surfaceAccent }]}> 
                                    <ThemedText type="smallBold" style={{ color: theme.accentDark }}>+ New</ThemedText>
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
                squadId={squadId}
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
                    <View style={[styles.sectionEmoji, { backgroundColor: theme.surfaceAccent }]}> 
                        <ThemedText type="caption">{emoji}</ThemedText>
                    </View>
                    <View>
                        <ThemedText type="bodyBold" style={styles.sectionTitle}>{label}</ThemedText>
                        <ThemedText type="caption" themeColor="textSecondary">{channels.length} room{channels.length !== 1 ? 's' : ''}</ThemedText>
                    </View>
                </View>
                <Pressable onPress={onCreate} hitSlop={8} style={[styles.newButton, { backgroundColor: theme.surfaceAccent }]}> 
                    <ThemedText type="smallBold" style={{ color: theme.accentDark }}>+ New</ThemedText>
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
    searchWrap: { marginBottom: Spacing.lg },
    section: { marginBottom: Spacing.xl },
    sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.md },
    sectionTitleRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
    sectionEmoji: { width: 32, height: 32, borderRadius: Radius.full, alignItems: 'center', justifyContent: 'center' },
    sectionTitle: { color: '#202124' },
    newButton: { minHeight: 36, borderRadius: Radius.full, paddingHorizontal: Spacing.md, alignItems: 'center', justifyContent: 'center' },
    emptySection: { alignItems: 'center', paddingVertical: Spacing.xxxl, gap: Spacing.sm },
    createBtn: { marginTop: Spacing.sm, paddingHorizontal: Spacing.xl, paddingVertical: Spacing.sm, borderRadius: Radius.md, minHeight: 44, alignItems: 'center', justifyContent: 'center' },
    leave: { marginTop: Spacing.lg, paddingTop: Spacing.lg, borderTopWidth: 1.5, alignItems: 'center' },
});
