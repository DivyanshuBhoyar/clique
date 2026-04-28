import { usePaginatedQuery } from 'convex/react';
import { useGlobalSearchParams, useRouter } from 'expo-router';
import { useCallback } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { NoteCard } from '@/components/notes/note-card';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { api } from '@/convex/_generated/api';
import { Id } from '@/convex/_generated/dataModel';

const PAGE_SIZE = 20;

export default function JournalsScreen() {
    const { id } = useGlobalSearchParams<{ id: string }>();
    const squadId = (typeof id === 'string' ? id : undefined) as Id<"squads"> | undefined;
    const router = useRouter();
    const theme = useTheme();

    const {
        results: journals,
        loadMore,
        status,
    } = usePaginatedQuery(
        api.notes.getJournals,
        squadId ? { squadId } : "skip",
        { initialNumItems: PAGE_SIZE },
    );

    const handlePress = useCallback((noteId: string) => {
        if (!squadId) return;
        router.push(`/squad/${squadId}/notes/${noteId}`);
    }, [squadId, router]);

    if (journals === undefined) {
        return (
            <SafeAreaView style={[styles.loading, { backgroundColor: theme.background }]}>
                <ActivityIndicator size="large" color={theme.accent} />
            </SafeAreaView>
        );
    }

    return (
        <ThemedView style={styles.container}>
            <SafeAreaView style={styles.safeArea} edges={['bottom']}>
                <FlatList
                    data={journals}
                    keyExtractor={(item) => item._id}
                    renderItem={({ item }) => (
                        <Pressable onPress={() => handlePress(item._id)} hitSlop={4} style={styles.cardLink}>
                            <NoteCard
                                title={item.title}
                                content={item.content}
                                updatedAt={item.updatedAt}
                                tag={item.tag}
                                type="journal"
                                pinned={item.pinned}
                            />
                        </Pressable>
                    )}
                    ListEmptyComponent={
                        <View style={styles.empty}>
                            <ThemedText type="small" themeColor="textSecondary">
                                No journal entries yet.
                            </ThemedText>
                        </View>
                    }
                    initialNumToRender={10}
                    maxToRenderPerBatch={5}
                    windowSize={10}
                    contentContainerStyle={styles.listContent}
                    keyboardShouldPersistTaps="handled"
                    onEndReached={status === "CanLoadMore" ? () => loadMore(PAGE_SIZE) : undefined}
                    onEndReachedThreshold={0.5}
                    ListFooterComponent={
                        status === "LoadingMore"
                            ? <ActivityIndicator size="small" color={theme.accent} style={styles.loadingMore} />
                            : null
                    }
                />
            </SafeAreaView>
        </ThemedView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    safeArea: { flex: 1 },
    loading: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    listContent: { paddingBottom: 80, paddingTop: Spacing.sm },
    cardLink: {
        width: '100%',
        paddingHorizontal: Spacing.lg,
        paddingVertical: Spacing.xs,
    },
    empty: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: Spacing.six,
    },
    loadingMore: { paddingVertical: Spacing.lg },
});
