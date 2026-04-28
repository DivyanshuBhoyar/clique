import { useMutation, usePaginatedQuery, useQuery } from 'convex/react';
import { Link, useRouter, useGlobalSearchParams } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { EventCard } from '@/components/memories/event-card';
import { SegmentedControl } from '@/components/ui/segmented-control';
import { Fab } from '@/components/ui/fab';
import { WallCard } from '@/components/memories/wall-card';
import { SquadHeader } from '@/components/squad-header';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { api } from '@/convex/_generated/api';
import { Id } from '@/convex/_generated/dataModel';

const PAGE_SIZE = 20;
const TABS = ["Wall", "Events"] as const;

export default function MemoriesScreen() {
    const { id } = useGlobalSearchParams<{ id: string }>();
    const squadId = (typeof id === 'string' ? id : undefined) as Id<"squads"> | undefined;
    const router = useRouter();
    const theme = useTheme();
    const [activeTab, setActiveTab] = useState<number>(0);

    const squad = useQuery(api.squad.getSquad, squadId ? { id: squadId } : "skip");
    const currentUser = useQuery(api.users.current);
    const toggleReaction = useMutation(api.memories.toggleMemoryReaction);

    const wallQuery = usePaginatedQuery(
        api.memories.getWallMemories,
        squadId ? { squadId } : "skip",
        { initialNumItems: PAGE_SIZE },
    );

    const eventQuery = usePaginatedQuery(
        api.memories.getEventMemories,
        squadId ? { squadId } : "skip",
        { initialNumItems: PAGE_SIZE },
    );

    const handleToggleReaction = useCallback(
        (memoryId: string, emoji: string) => {
            toggleReaction({ memoryId: memoryId as Id<"memories">, emoji });
        },
        [toggleReaction],
    );

    const isLoading = activeTab === 0 ? wallQuery.results === undefined : activeTab === 1 ? eventQuery.results === undefined : false;

    if (isLoading) {
        return (
            <SafeAreaView style={[styles.loading, { backgroundColor: theme.background }]}>
                <ActivityIndicator size="large" color={theme.accent} />
            </SafeAreaView>
        );
    }

    const fabHref = activeTab === 1
        ? `/squad/${squadId}/memories/new?type=event`
        : `/squad/${squadId}/memories/new?type=wall`;

    return (
        <ThemedView style={styles.container}>
            <SafeAreaView style={styles.safeArea}>
                <SquadHeader name={squad?.name} disabled />
                <SegmentedControl tabs={TABS as unknown as string[]} activeIndex={activeTab} onSelect={setActiveTab} />

                {activeTab === 0 ? (
                    <WallList
                        items={wallQuery.results}
                        canLoadMore={wallQuery.status === "CanLoadMore"}
                        loadingMore={wallQuery.status === "LoadingMore"}
                        loadMore={() => wallQuery.loadMore(PAGE_SIZE)}
                        squadId={squadId}
                        currentUserId={currentUser?._id}
                        onToggleReaction={handleToggleReaction}
                    />
                ) : (
                    <EventList
                        items={eventQuery.results}
                        canLoadMore={eventQuery.status === "CanLoadMore"}
                        loadingMore={eventQuery.status === "LoadingMore"}
                        loadMore={() => eventQuery.loadMore(PAGE_SIZE)}
                        squadId={squadId}
                        currentUserId={currentUser?._id}
                        onToggleReaction={handleToggleReaction}
                    />
                )}

                {
                    // @ts-expect-error — dynamic route string
                    <Link href={fabHref} asChild>
                        <Fab accessibilityLabel="Add memory" />
                    </Link>
                }
            </SafeAreaView>
        </ThemedView>
    );
}

interface WallItem {
    _id: string;
    content?: string;
    nickname: string;
    avatarUrl?: string | null;
    createdAt: number;
    reactions: { emoji: string; userId: string }[];
    commentCount: number;
}

interface EventItem {
    _id: string;
    title?: string;
    coverUrl?: string | null;
    nickname: string;
    avatarUrl?: string | null;
    createdAt: number;
    reactions: { emoji: string; userId: string }[];
    reflectionCount: number;
    photoCount: number;
    linkCount: number;
}

function WallList({
    items, canLoadMore, loadingMore, loadMore, squadId, currentUserId, onToggleReaction,
}: {
    items: WallItem[]; canLoadMore: boolean; loadingMore: boolean; loadMore: () => void;
    squadId: Id<"squads"> | undefined; currentUserId?: string;
    onToggleReaction: (memoryId: string, emoji: string) => void;
}) {
    const router = useRouter();
    const theme = useTheme();
    const handleEndReached = useCallback(() => { if (canLoadMore) loadMore(); }, [canLoadMore, loadMore]);

    if (items.length === 0) {
        return (
            <View style={styles.empty}>
                <ThemedText type="small" themeColor="textSecondary">No memories yet. Drop one!</ThemedText>
                <Link href={`/squad/${squadId}/memories/new` as any}>
                    <ThemedText type="linkPrimary">Drop a memory</ThemedText>
                </Link>
            </View>
        );
    }

    return (
        <FlatList
            data={items}
            keyExtractor={(item) => item._id}
            renderItem={({ item }) => (
                <Pressable
                    onPress={() => router.push(`/squad/${squadId}/memories/${item._id}` as any)}
                    style={styles.cardLink}
                >
                    <WallCard
                        content={item.content ?? ''} nickname={item.nickname} avatarUrl={item.avatarUrl}
                        createdAt={item.createdAt} reactions={item.reactions} commentCount={item.commentCount}
                        currentUserId={currentUserId} onToggleReaction={(emoji) => onToggleReaction(item._id, emoji)} truncate
                    />
                </Pressable>
            )}
            initialNumToRender={10} maxToRenderPerBatch={5} windowSize={10}
            contentContainerStyle={styles.listContent} keyboardShouldPersistTaps="handled"
            onEndReached={handleEndReached} onEndReachedThreshold={0.5}
            ListFooterComponent={loadingMore ? <ActivityIndicator size="small" color={theme.accent} style={styles.loadingMore} /> : null}
        />
    );
}

function EventList({
    items, canLoadMore, loadingMore, loadMore, squadId, currentUserId, onToggleReaction,
}: {
    items: EventItem[]; canLoadMore: boolean; loadingMore: boolean; loadMore: () => void;
    squadId: Id<"squads"> | undefined; currentUserId?: string;
    onToggleReaction: (memoryId: string, emoji: string) => void;
}) {
    const router = useRouter();
    const theme = useTheme();
    const handleEndReached = useCallback(() => { if (canLoadMore) loadMore(); }, [canLoadMore, loadMore]);

    if (items.length === 0) {
        return (
            <View style={styles.empty}>
                <ThemedText type="small" themeColor="textSecondary">No events yet. Start one!</ThemedText>
                <Link href={`/squad/${squadId}/memories/new` as any}>
                    <ThemedText type="linkPrimary">Start an event</ThemedText>
                </Link>
            </View>
        );
    }

    return (
        <FlatList
            data={items}
            keyExtractor={(item) => item._id}
            renderItem={({ item }) => (
                <Pressable
                    onPress={() => router.push(`/squad/${squadId}/memories/${item._id}` as any)}
                    style={styles.cardLink}
                >
                    <EventCard
                        title={item.title ?? ''} coverUrl={item.coverUrl} avatarUrl={item.avatarUrl}
                        nickname={item.nickname} createdAt={item.createdAt}
                        reflectionCount={item.reflectionCount} photoCount={item.photoCount} linkCount={item.linkCount}
                        reactions={item.reactions} currentUserId={currentUserId}
                        onToggleReaction={(emoji) => onToggleReaction(item._id, emoji)}
                    />
                </Pressable>
            )}
            initialNumToRender={10} maxToRenderPerBatch={5} windowSize={10}
            contentContainerStyle={styles.listContent} keyboardShouldPersistTaps="handled"
            onEndReached={handleEndReached} onEndReachedThreshold={0.5}
            ListFooterComponent={loadingMore ? <ActivityIndicator size="small" color={theme.accent} style={styles.loadingMore} /> : null}
        />
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    safeArea: {
        flex: 1,
    },
    loading: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    empty: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        gap: Spacing.lg,
    },
    listContent: {
        paddingHorizontal: Spacing.lg,
        paddingTop: Spacing.sm,
        paddingBottom: 80,
    },
    cardLink: {
        width: '100%',
        marginBottom: Spacing.lg,
    },
    loadingMore: {
        paddingVertical: Spacing.lg,
    },
});
