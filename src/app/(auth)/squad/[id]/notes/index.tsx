import { useMutation, usePaginatedQuery, useQuery } from 'convex/react';
import { Link, useRouter, useGlobalSearchParams } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { JournalCard } from '@/components/notes/journal-card';
import { NoteCard } from '@/components/notes/note-card';
import { SegmentedControl } from '@/components/ui/segmented-control';
import { Fab } from '@/components/ui/fab';
import { SharedNoteCard } from '@/components/notes/shared-note-card';
import { SquadHeader } from '@/components/squad-header';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { api } from '@/convex/_generated/api';
import { Doc, Id } from '@/convex/_generated/dataModel';

const PAGE_SIZE = 20;
const TABS = ["Mine", "Ours"] as const;

export default function NotesScreen() {
    const { id } = useGlobalSearchParams<{ id: string }>();
    const squadId = (typeof id === 'string' ? id : undefined) as Id<"squads"> | undefined;
    const router = useRouter();
    const theme = useTheme();
    const [activeTab, setActiveTab] = useState<number>(0);

    const squad = useQuery(api.squad.getSquad, squadId ? { id: squadId } : "skip");
    const createNote = useMutation(api.notes.createNote);

    const todayJournal = useQuery(
        api.notes.getTodayJournal,
        squadId ? { squadId } : "skip",
    );
    const {
        results: personalNotes,
        loadMore: loadMorePersonal,
        status: personalStatus,
    } = usePaginatedQuery(
        api.notes.getPersonalNotes,
        squadId ? { squadId } : "skip",
        { initialNumItems: PAGE_SIZE },
    );

    const {
        results: sharedNotes,
        loadMore: loadMoreShared,
        status: sharedStatus,
    } = usePaginatedQuery(
        api.notes.getSharedNotes,
        squadId ? { squadId } : "skip",
        { initialNumItems: PAGE_SIZE },
    );

    const handleJournalPress = useCallback(async () => {
        if (!squadId) return;

        if (todayJournal) {
            router.push(`/squad/${squadId}/notes/${todayJournal._id}`);
            return;
        }

        const today = new Date();
        const dateStr = today.toLocaleDateString('en-US', {
            month: 'short', day: 'numeric', year: 'numeric',
        });

        const noteId = await createNote({
            squadId,
            title: `Journal — ${dateStr}`,
            content: "",
            type: "journal",
        });

        router.push(`/squad/${squadId}/notes/${noteId}`);
    }, [squadId, todayJournal, createNote, router]);

    const handleNotePress = useCallback((noteId: string) => {
        if (!squadId) return;
        router.push(`/squad/${squadId}/notes/${noteId}`);
    }, [squadId, router]);

    const mineNotes = personalNotes?.filter((n) => n.type !== "journal") ?? [];
    const hasPastJournals = (personalNotes?.filter((n) => n.type === "journal").length ?? 0) > 0;
    const isInitialLoading = activeTab === 0
        ? personalNotes === undefined
        : sharedNotes === undefined;

    const fabHref = squadId
        ? activeTab === 0
            ? `/squad/${squadId}/notes/new`
            : `/squad/${squadId}/notes/new?type=shared`
        : undefined;

    if (isInitialLoading) {
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
                <SegmentedControl tabs={TABS as unknown as string[]} activeIndex={activeTab} onSelect={setActiveTab} />

                {activeTab === 0 ? (
                    <MineTab
                        notes={mineNotes}
                        todayJournal={todayJournal ?? null}
                        hasPastJournals={hasPastJournals}
                        onJournalPress={handleJournalPress}
                        onNotePress={handleNotePress}
                        onLoadMore={() => loadMorePersonal(PAGE_SIZE)}
                        canLoadMore={personalStatus === "CanLoadMore"}
                        loadingMore={personalStatus === "LoadingMore"}
                        squadId={squadId}
                    />
                ) : (
                    <OursTab
                        notes={sharedNotes}
                        onNotePress={handleNotePress}
                        onLoadMore={() => loadMoreShared(PAGE_SIZE)}
                        canLoadMore={sharedStatus === "CanLoadMore"}
                        loadingMore={sharedStatus === "LoadingMore"}
                    />
                )}

                {fabHref && (
                    // @ts-expect-error — dynamic route string not assignable to typed href
                    <Link href={fabHref} asChild>
                        <Fab accessibilityLabel="Create note" />
                    </Link>
                )}
            </SafeAreaView>
        </ThemedView>
    );
}

interface MineTabProps {
    notes: (Doc<"notes"> & { lastEditedByNickname?: string | null })[];
    todayJournal: Doc<"notes"> & { lastEditedByNickname?: string | null } | null;
    hasPastJournals: boolean;
    onJournalPress: () => void;
    onNotePress: (noteId: string) => void;
    onLoadMore: () => void;
    canLoadMore: boolean;
    loadingMore: boolean;
    squadId: Id<"squads"> | undefined;
}

function MineTab({ notes, todayJournal, hasPastJournals, onJournalPress, onNotePress, onLoadMore, canLoadMore, loadingMore, squadId }: MineTabProps) {
    const theme = useTheme();
    return (
        <FlatList
            data={notes}
            keyExtractor={(item) => item._id}
            ListHeaderComponent={
                <View style={styles.headerSection}>
                    <Pressable onPress={onJournalPress} hitSlop={4}>
                        <JournalCard
                            hasEntry={todayJournal != null}
                            lastUpdated={todayJournal?.updatedAt}
                        />
                    </Pressable>
                    {squadId && hasPastJournals && (
                        <Link href={`/squad/${squadId}/notes/journals` as any} style={styles.newNoteLink}>
                            <ThemedText type="linkPrimary">View past journals →</ThemedText>
                        </Link>
                    )}
                    {squadId && (
                        <Link href={`/squad/${squadId}/notes/new` as any} style={styles.newNoteLink}>
                            <ThemedText type="linkPrimary">+ New Note</ThemedText>
                        </Link>
                    )}
                </View>
            }
            renderItem={({ item }) => (
                <Pressable onPress={() => onNotePress(item._id)} hitSlop={4} style={styles.cardLink}>
                    <NoteCard
                        title={item.title} content={item.content} updatedAt={item.updatedAt}
                        tag={item.tag} type={item.type as "personal" | "journal"} pinned={item.pinned}
                    />
                </Pressable>
            )}
            ListEmptyComponent={
                <View style={styles.empty}>
                    <ThemedText type="small" themeColor="textSecondary">
                        No notes yet. Write your first one!
                    </ThemedText>
                </View>
            }
            initialNumToRender={10} maxToRenderPerBatch={5} windowSize={10}
            contentContainerStyle={styles.listContent} keyboardShouldPersistTaps="handled"
            onEndReached={canLoadMore ? onLoadMore : undefined} onEndReachedThreshold={0.5}
            ListFooterComponent={loadingMore ? <ActivityIndicator size="small" color={theme.accent} style={styles.loadingMore} /> : null}
        />
    );
}

interface OursTabProps {
    notes: (Doc<"notes"> & { lastEditedByNickname?: string | null })[];
    onNotePress: (noteId: string) => void;
    onLoadMore: () => void;
    canLoadMore: boolean;
    loadingMore: boolean;
}

function OursTab({ notes, onNotePress, onLoadMore, canLoadMore, loadingMore }: OursTabProps) {
    const theme = useTheme();
    return (
        <FlatList
            data={notes}
            keyExtractor={(item) => item._id}
            renderItem={({ item }) => (
                <Pressable onPress={() => onNotePress(item._id)} hitSlop={4} style={styles.cardLink}>
                    <SharedNoteCard
                        title={item.title} content={item.content} updatedAt={item.updatedAt}
                        tag={item.tag} lastEditedByNickname={item.lastEditedByNickname}
                    />
                </Pressable>
            )}
            ListEmptyComponent={
                <View style={styles.empty}>
                    <ThemedText type="small" themeColor="textSecondary">
                        No shared notes yet. Create one for the squad!
                    </ThemedText>
                </View>
            }
            initialNumToRender={10} maxToRenderPerBatch={5} windowSize={10}
            contentContainerStyle={styles.listContent} keyboardShouldPersistTaps="handled"
            onEndReached={canLoadMore ? onLoadMore : undefined} onEndReachedThreshold={0.5}
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
    headerSection: {
        paddingHorizontal: Spacing.lg,
        paddingTop: Spacing.sm,
        gap: Spacing.lg,
    },
    newNoteLink: {
        paddingVertical: Spacing.xs,
    },
    listContent: {
        paddingBottom: 80,
    },
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
    loadingMore: {
        paddingVertical: Spacing.lg,
    },
});
