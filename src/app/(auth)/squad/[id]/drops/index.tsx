import { useMutation, usePaginatedQuery, useQuery } from 'convex/react';
import { Link, useRouter, useGlobalSearchParams } from 'expo-router';
import { useCallback } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { DropCard } from '@/components/drops/drop-card';
import { Fab } from '@/components/ui/fab';
import { SquadHeader } from '@/components/squad-header';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { api } from '@/convex/_generated/api';
import { Id } from '@/convex/_generated/dataModel';
import { useDropVote } from '@/hooks/use-vote-mutation';

const PAGE_SIZE = 20;

export default function DropsScreen() {
    const { id } = useGlobalSearchParams<{ id: string }>();
    const squadId = (typeof id === 'string' ? id : undefined) as Id<"squads"> | undefined;
    const router = useRouter();
    const theme = useTheme();

    const squad = useQuery(api.squad.getSquad, squadId ? { id: squadId } : "skip");
    const currentUser = useQuery(api.users.current);
    const toggleReaction = useMutation(api.drops.toggleDropReaction);
    const dropVote = useDropVote();

    const {
        results: drops,
        loadMore,
        status,
    } = usePaginatedQuery(
        api.drops.getDrops,
        squadId ? { squadId } : "skip",
        { initialNumItems: PAGE_SIZE },
    );

    const canLoadMore = status === "CanLoadMore";
    const loadingMore = status === "LoadingMore";

    const handleToggleReaction = useCallback(
        async (dropId: string, emoji: string) => {
            await toggleReaction({
                dropId: dropId as Id<"drops">,
                emoji,
            });
        },
        [toggleReaction],
    );

    const handleVote = useCallback(
        (dropId: string, value: "up" | "down") => {
            dropVote({ dropId: dropId as Id<"drops">, value });
        },
        [dropVote],
    );

    const handleEndReached = useCallback(() => {
        if (canLoadMore) {
            loadMore(PAGE_SIZE);
        }
    }, [canLoadMore, loadMore]);

    if (drops === undefined) {
        return (
            <SafeAreaView style={[styles.loading, { backgroundColor: theme.background }]}>
                <ActivityIndicator size="large" color={theme.accent} />
            </SafeAreaView>
        );
    }

    return (
        <ThemedView style={styles.container}>
            <SafeAreaView style={styles.safeArea}>
                <SquadHeader name={squad?.name} disabled />
                {drops.length === 0 ? (
                    <View style={styles.empty}>
                        <ThemedText type="small" themeColor="textSecondary">
                            No drops yet. Be the first!
                        </ThemedText>
                        <Link href={`/squad/${squadId}/drops/new` as any}>
                            <ThemedText type="linkPrimary">Drop something</ThemedText>
                        </Link>
                    </View>
                ) : (
                    <FlatList
                        data={drops}
                        keyExtractor={(item) => item._id}
                        renderItem={({ item }) => (
                            <Pressable
                                onPress={() => router.push(`/squad/${squadId}/drops/${item._id}` as any)}
                                style={styles.cardLink}
                            >
                                <DropCard
                                    dropId={item._id} category={item.category} nickname={item.nickname}
                                    avatarUrl={item.avatarUrl} content={item.content} createdAt={item.createdAt}
                                    commentCount={item.commentCount} reactions={item.reactions}
                                    currentUserId={currentUser?._id} onToggleReaction={handleToggleReaction}
                                    truncate upvotes={item.upvotes} downvotes={item.downvotes}
                                    userVote={item.userVote} onVote={handleVote}
                                />
                            </Pressable>
                        )}
                        initialNumToRender={10} maxToRenderPerBatch={5} windowSize={10}
                        contentContainerStyle={styles.listContent} keyboardShouldPersistTaps="handled"
                        onEndReached={handleEndReached} onEndReachedThreshold={0.5}
                        ListFooterComponent={loadingMore ? (
                            <ActivityIndicator size="small" color={theme.accent} style={styles.loadingMore} />
                        ) : null}
                    />
                )}

                <Link href={`/squad/${squadId}/drops/new` as any} asChild>
                    <Fab accessibilityLabel="Create drop" />
                </Link>
            </SafeAreaView>
        </ThemedView>
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
        paddingTop: Spacing.lg,
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
