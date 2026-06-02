import { usePaginatedQuery } from 'convex/react';
import { useGlobalSearchParams, useRouter } from 'expo-router';
import { useCallback } from 'react';
import { Pressable, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { NoteCard } from '@/components/notes/note-card';
import { ThemedView } from '@/components/themed-view';
import { EmptyState } from '@/components/ui/empty-state';
import { LoadingState } from '@/components/ui/loading-state';
import { PaginatedList } from '@/components/ui/paginated-list';
import { ScreenHeader } from '@/components/ui/screen-header';
import { Spacing } from '@/constants/theme';
import { api } from '@/convex/_generated/api';
import { Id } from '@/convex/_generated/dataModel';
import { backOrReplace } from '@/utils/navigation';

const PAGE_SIZE = 20;
// Placeholder shown for encrypted journal entries in the list view.
// The full content is decrypted when the user opens the note.
const ENCRYPTED_PREVIEW = '🔒 Open to read';

export default function JournalsScreen() {
    const { id } = useGlobalSearchParams<{ id: string }>();
    const squadId = (typeof id === 'string' ? id : undefined) as Id<'squads'> | undefined;
    const router = useRouter();

    const { results: journals, loadMore, status } = usePaginatedQuery(
        api.notes.getJournals,
        squadId ? { squadId } : 'skip',
        { initialNumItems: PAGE_SIZE },
    );

    const handlePress = useCallback((noteId: string) => {
        if (!squadId) return;
        router.push(`/squad/${squadId}/notes/${noteId}`);
    }, [squadId, router]);

    if (journals === undefined) {
        return <LoadingState />;
    }

    return (
        <ThemedView style={styles.container}>
            <SafeAreaView style={styles.safeArea} edges={[]}>
                <ScreenHeader
                    title="Past Journals 📓"
                    onBack={() => backOrReplace(router, `/squad/${squadId}/notes`)}
                />
                <PaginatedList
                    data={journals}
                    keyExtractor={(item) => item._id}
                    status={status}
                    loadMore={loadMore}
                    pageSize={PAGE_SIZE}
                    contentContainerStyle={styles.listContent}
                    renderItem={({ item }) => (
                        <Pressable onPress={() => handlePress(item._id)} hitSlop={4} style={styles.cardLink}>
                            <NoteCard
                                title={item.title}
                                content={item.encrypted ? ENCRYPTED_PREVIEW : item.content}
                                updatedAt={item.updatedAt}
                                tag={item.tag}
                                type="journal"
                                pinned={item.pinned}
                            />
                        </Pressable>
                    )}
                    ListEmptyComponent={
                        <EmptyState
                            emoji="📓"
                            title="No journal entries yet"
                            subtitle="Go write today's entry!"
                            actionLabel="Write journal"
                            onAction={() => router.push(`/squad/${squadId}/notes/new?type=journal` as any)}
                        />
                    }
                />
            </SafeAreaView>
        </ThemedView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    safeArea: { flex: 1 },
    listContent: { paddingTop: Spacing.sm, paddingBottom: 80 },
    cardLink: {
        width: '100%',
        paddingHorizontal: Spacing.lg,
        paddingVertical: Spacing.xs,
    },
});
