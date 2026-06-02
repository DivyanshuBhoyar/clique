import { useMutation, usePaginatedQuery, useQuery } from 'convex/react';
import { Link, useGlobalSearchParams, useRouter } from 'expo-router';
import { Globe, Plus, SlidersHorizontal } from 'lucide-react-native';
import { useCallback, useMemo, useRef, useState } from 'react';
import {
    ActivityIndicator,
    KeyboardAvoidingView,
    Modal,
    Platform,
    Pressable,
    StyleSheet,
    TextInput,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { JournalCard } from '@/components/notes/journal-card';
import { NoteCard } from '@/components/notes/note-card';
import { SharedNoteCard } from '@/components/notes/shared-note-card';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { EmptyState } from '@/components/ui/empty-state';
import { Fab } from '@/components/ui/fab';
import { FilterChips } from '@/components/ui/filter-chips';
import { LoadingState } from '@/components/ui/loading-state';
import { PaginatedList } from '@/components/ui/paginated-list';
import { ScreenHeader } from '@/components/ui/screen-header';
import { SearchBar } from '@/components/ui/search-bar';
import { Radius, Spacing, Weight } from '@/constants/theme';
import { api } from '@/convex/_generated/api';
import { Doc, Id } from '@/convex/_generated/dataModel';
import { useBookmarkToggle } from '@/hooks/use-bookmark-mutation';
import { useJournalKey } from '@/hooks/use-journal-key';
import { useTheme } from '@/hooks/use-theme';

const PAGE_SIZE = 20;
const FEED_CHIPS = [
    { label: 'All', key: 'all' as const },
    { label: 'Pinned', emoji: '📌', key: 'pinned' as const },
    { label: 'Recent', key: 'recent' as const },
    { label: 'Mine', key: 'mine' as const },
];

type NotesFeedFilter = (typeof FEED_CHIPS)[number]['key'];
type FeedNote = Doc<'notes'> & {
    ownerNickname: string;
    ownerAvatarUrl: string | null;
    isMine: boolean;
    isBookmarked?: boolean;
    collaborators: {
        userId: Id<'users'>;
        nickname: string;
        avatarUrl: string | null;
    }[];
    collaboratorCount: number;
};

export default function NotesScreen() {
    const { id } = useGlobalSearchParams<{ id: string }>();
    const squadId = (typeof id === 'string' ? id : undefined) as Id<'squads'> | undefined;
    const router = useRouter();
    const theme = useTheme();
    const [activeFilter, setActiveFilter] = useState(0);
    const [searchText, setSearchText] = useState('');
    const { status: keyStatus, setup: setupKey, unlock: unlockKey } = useJournalKey();

    // Journal password modal state
    const [showSetupModal, setShowSetupModal] = useState(false);
    const [showUnlockModal, setShowUnlockModal] = useState(false);
    const [passwordInput, setPasswordInput] = useState('');
    const [confirmInput, setConfirmInput] = useState('');
    const [modalWorking, setModalWorking] = useState(false);
    const [modalError, setModalError] = useState<string | null>(null);
    // Callback to run after modal resolves (e.g. open journal after unlock)
    const pendingActionRef = useRef<(() => void) | null>(null);

    const createNote = useMutation(api.notes.createNote);
    const toggleNotePin = useMutation(api.notes.toggleNotePin);
    const bookmarkToggle = useBookmarkToggle();
    const selectedFilter: NotesFeedFilter = FEED_CHIPS[activeFilter]?.key ?? 'all';
    const normalizedSearch = searchText.trim();

    const todayJournal = useQuery(api.notes.getTodayJournal, squadId ? { squadId } : 'skip');
    const {
        results: feedNotes,
        loadMore,
        status,
    } = usePaginatedQuery(
        api.notes.getNotesFeed,
        squadId
            ? {
                squadId,
                filter: selectedFilter,
                searchText: normalizedSearch.length > 0 ? normalizedSearch : undefined,
            }
            : 'skip',
        { initialNumItems: PAGE_SIZE },
    );

    const openJournal = useCallback(async () => {
        if (!squadId) return;
        if (todayJournal) {
            router.push(`/squad/${squadId}/notes/${todayJournal._id}`);
            return;
        }
        const today = new Date();
        const dateStr = today.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
        const noteId = await createNote({ squadId, title: `Journal — ${dateStr}`, content: '', type: 'journal', encrypted: true });
        router.push(`/squad/${squadId}/notes/${noteId}`);
    }, [squadId, todayJournal, createNote, router]);

    const handleJournalPress = useCallback(() => {
        if (keyStatus === 'unlocked') {
            openJournal();
        } else if (keyStatus === 'not_setup') {
            setPasswordInput('');
            setConfirmInput('');
            setModalError(null);
            setShowSetupModal(true);
            pendingActionRef.current = openJournal;
        } else if (keyStatus === 'locked') {
            setPasswordInput('');
            setModalError(null);
            setShowUnlockModal(true);
            pendingActionRef.current = openJournal;
        }
        // 'loading' state: ignore tap until ready
    }, [keyStatus, openJournal]);

    const handleSetupSubmit = useCallback(async () => {
        if (passwordInput.length < 4) {
            setModalError('Password must be at least 4 characters.');
            return;
        }
        if (passwordInput !== confirmInput) {
            setModalError('Passwords do not match.');
            return;
        }
        setModalWorking(true);
        setModalError(null);
        try {
            await setupKey(passwordInput);
            setShowSetupModal(false);
            pendingActionRef.current?.();
            pendingActionRef.current = null;
        } catch {
            setModalError('Setup failed. Please try again.');
        } finally {
            setModalWorking(false);
        }
    }, [passwordInput, confirmInput, setupKey]);

    const handleUnlockSubmit = useCallback(async () => {
        setModalWorking(true);
        setModalError(null);
        try {
            const ok = await unlockKey(passwordInput);
            if (!ok) {
                setModalError('Wrong password. Try again.');
                setModalWorking(false);
                return;
            }
            setShowUnlockModal(false);
            pendingActionRef.current?.();
            pendingActionRef.current = null;
        } catch {
            setModalError('Something went wrong. Please try again.');
        } finally {
            setModalWorking(false);
        }
    }, [passwordInput, unlockKey]);

    const handleNotePress = useCallback((noteId: string) => {
        if (!squadId) return;
        router.push(`/squad/${squadId}/notes/${noteId}`);
    }, [squadId, router]);

    const handleTogglePin = useCallback(async (noteId: string) => {
        await toggleNotePin({ noteId: noteId as Id<'notes'> });
    }, [toggleNotePin]);

    const isInitialLoading = feedNotes === undefined;
    const showJournalHero = selectedFilter === 'mine' && normalizedSearch.length === 0;

    const visibleNotes: FeedNote[] = useMemo(() => {
        const list = (feedNotes ?? []) as FeedNote[];
        if (!showJournalHero) return list;
        return list.filter((note) => note.type !== 'journal');
    }, [feedNotes, showJournalHero]);

    const fabHref = squadId
        ? selectedFilter === 'mine'
            ? `/squad/${squadId}/notes/new`
            : `/squad/${squadId}/notes/new?type=shared`
        : undefined;

    if (isInitialLoading) {
        return <LoadingState message="Finding the notes worth rereading…" />;
    }

    const journalLockBadgeLabel =
        keyStatus === 'not_setup' ? '🔒 Lock your journals' :
        keyStatus === 'locked'    ? '🔑 Journals are locked' :
        null;

    return (
        <ThemedView style={styles.container}>
            <SafeAreaView style={styles.safeArea} edges={[]}>
                <ScreenHeader
                    title="Notes 📝"
                    leftIcon={Globe}
                    onLeftPress={() => router.navigate('/?switcher=1' as any)}
                    rightIcon={Plus}
                    onRightPress={() => {
                        if (!squadId) return;
                        router.push(
                            `/squad/${squadId}/notes/new${selectedFilter === 'mine' ? '' : '?type=shared'}` as any,
                        );
                    }}
                />

                <PaginatedList
                    data={visibleNotes}
                    keyExtractor={(item) => item._id}
                    status={status}
                    loadMore={loadMore}
                    pageSize={PAGE_SIZE}
                    contentContainerStyle={styles.listContent}
                    ListHeaderComponent={
                        <View>
                            <View style={styles.searchRowWrap}>
                                <SearchBar
                                    value={searchText}
                                    onChangeText={setSearchText}
                                    placeholder="Search notes..."
                                    rightAction={
                                        <Pressable
                                            onPress={() => setActiveFilter((prev) => (prev + 1) % FEED_CHIPS.length)}
                                            accessibilityRole="button"
                                            accessibilityLabel="Notes filters"
                                            style={[
                                                styles.searchActionBtn,
                                                {
                                                    backgroundColor: theme.surface,
                                                    borderColor: theme.outline,
                                                },
                                            ]}
                                        >
                                            <SlidersHorizontal size={18} color={theme.text} strokeWidth={2.2} />
                                        </Pressable>
                                    }
                                />
                            </View>

                            <FilterChips
                                chips={FEED_CHIPS.map(({ label, emoji }) => ({ label, emoji }))}
                                activeIndex={activeFilter}
                                onSelect={setActiveFilter}
                            />

                            {showJournalHero && (
                                <View style={styles.heroSection}>
                                    {journalLockBadgeLabel && (
                                        <Pressable
                                            onPress={handleJournalPress}
                                            style={[styles.lockBadge, { backgroundColor: theme.surface, borderColor: theme.outline }]}
                                        >
                                            <ThemedText type="small" style={{ fontWeight: Weight.bold }}>
                                                {journalLockBadgeLabel}
                                            </ThemedText>
                                            <ThemedText type="caption" themeColor="textSecondary">
                                                {keyStatus === 'not_setup'
                                                    ? 'Set a password to keep your journal private.'
                                                    : 'Tap to enter your journal password.'}
                                            </ThemedText>
                                        </Pressable>
                                    )}

                                    <Pressable onPress={handleJournalPress} hitSlop={4}>
                                        <JournalCard hasEntry={todayJournal != null} lastUpdated={todayJournal?.updatedAt} />
                                    </Pressable>

                                    {squadId && (
                                        <Link href={`/squad/${squadId}/notes/journals` as any}>
                                            <ThemedText
                                                type="small"
                                                style={{ color: theme.accent, fontWeight: Weight.bold }}
                                            >
                                                View past journals →
                                            </ThemedText>
                                        </Link>
                                    )}
                                </View>
                            )}
                        </View>
                    }
                    renderItem={({ item }) => (
                        <Pressable onPress={() => handleNotePress(item._id)} hitSlop={4} style={styles.cardLink}>
                            {item.type === 'shared' ? (
                                <SharedNoteCard
                                    noteId={item._id}
                                    title={item.title}
                                    content={item.content}
                                    updatedAt={item.updatedAt}
                                    tag={item.tag}
                                    pinned={item.pinned}
                                    ownerNickname={item.ownerNickname}
                                    collaborators={item.collaborators}
                                    collaboratorCount={item.collaboratorCount}
                                    isBookmarked={item.isBookmarked}
                                    onTogglePin={item.isMine ? handleTogglePin : undefined}
                                    onToggleBookmark={(noteId) => bookmarkToggle({ targetType: "note", noteId: noteId as any })}
                                />
                            ) : (
                                <NoteCard
                                    noteId={item._id}
                                    title={item.title}
                                    content={item.type === 'journal' && item.encrypted ? '🔒 Open to read' : item.content}
                                    updatedAt={item.updatedAt}
                                    tag={item.tag}
                                    type={item.type as 'personal' | 'journal' | 'friend'}
                                    pinned={item.pinned}
                                    ownerNickname={item.ownerNickname}
                                    collaborators={item.collaborators}
                                    collaboratorCount={item.collaboratorCount}
                                    isBookmarked={item.isBookmarked}
                                    onTogglePin={item.isMine ? handleTogglePin : undefined}
                                    onToggleBookmark={(noteId) => bookmarkToggle({ targetType: "note", noteId: noteId as any })}
                                />
                            )}
                        </Pressable>
                    )}
                    ListEmptyComponent={
                        <EmptyState
                            emoji="📝"
                            title="No notes found"
                            subtitle={
                                normalizedSearch.length > 0
                                    ? 'Try a different search term.'
                                    : selectedFilter === 'pinned'
                                        ? 'Pin a note to keep it at the top.'
                                        : selectedFilter === 'mine'
                                            ? 'Write your first note!'
                                            : 'Create a note for your squad.'
                            }
                            actionLabel={normalizedSearch.length > 0 ? undefined : 'Create note'}
                            onAction={normalizedSearch.length > 0 ? undefined : () => {
                                router.push(`/squad/${squadId}/notes/new${selectedFilter === 'mine' ? '' : '?type=shared'}` as any);
                            }}
                        />
                    }
                />

                {fabHref && (
                    <Link href={fabHref as any} asChild>
                        <Fab accessibilityLabel="Create note" />
                    </Link>
                )}
            </SafeAreaView>

            {/* Journal password setup modal */}
            <Modal visible={showSetupModal} animationType="slide" transparent onRequestClose={() => !modalWorking && setShowSetupModal(false)}>
                <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.modalOverlay}>
                    <View style={[styles.modalSheet, { backgroundColor: theme.background, borderColor: theme.outline }]}>
                        <ThemedText type="heading" style={styles.modalTitle}>Lock your journals 🔒</ThemedText>
                        <ThemedText type="small" themeColor="textSecondary" style={styles.modalSubtitle}>
                            Set a password to encrypt your journal entries. There is no recovery — if you forget it, your journals cannot be read.
                        </ThemedText>

                        <TextInput
                            style={[styles.passwordInput, { color: theme.text, borderColor: theme.outline, backgroundColor: theme.surface }]}
                            placeholder="Password"
                            placeholderTextColor={theme.placeholder}
                            secureTextEntry
                            value={passwordInput}
                            onChangeText={setPasswordInput}
                            autoFocus
                            editable={!modalWorking}
                        />
                        <TextInput
                            style={[styles.passwordInput, { color: theme.text, borderColor: theme.outline, backgroundColor: theme.surface }]}
                            placeholder="Confirm password"
                            placeholderTextColor={theme.placeholder}
                            secureTextEntry
                            value={confirmInput}
                            onChangeText={setConfirmInput}
                            editable={!modalWorking}
                            onSubmitEditing={handleSetupSubmit}
                        />

                        {modalError && (
                            <ThemedText type="caption" style={[styles.modalError, { color: theme.accent }]}>
                                {modalError}
                            </ThemedText>
                        )}

                        <Pressable
                            onPress={handleSetupSubmit}
                            disabled={modalWorking}
                            style={[styles.modalButton, { backgroundColor: theme.accent }]}
                        >
                            {modalWorking
                                ? <ActivityIndicator color={theme.text} size="small" />
                                : <ThemedText type="smallBold">Set password & encrypt</ThemedText>
                            }
                        </Pressable>

                        {!modalWorking && (
                            <Pressable onPress={() => setShowSetupModal(false)} style={styles.modalCancel}>
                                <ThemedText type="small" themeColor="textSecondary">Not now</ThemedText>
                            </Pressable>
                        )}
                    </View>
                </KeyboardAvoidingView>
            </Modal>

            {/* Journal unlock modal (new device) */}
            <Modal visible={showUnlockModal} animationType="slide" transparent onRequestClose={() => !modalWorking && setShowUnlockModal(false)}>
                <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.modalOverlay}>
                    <View style={[styles.modalSheet, { backgroundColor: theme.background, borderColor: theme.outline }]}>
                        <ThemedText type="heading" style={styles.modalTitle}>Unlock journals 🔑</ThemedText>
                        <ThemedText type="small" themeColor="textSecondary" style={styles.modalSubtitle}>
                            Enter your journal password to unlock on this device.
                        </ThemedText>

                        <TextInput
                            style={[styles.passwordInput, { color: theme.text, borderColor: theme.outline, backgroundColor: theme.surface }]}
                            placeholder="Password"
                            placeholderTextColor={theme.placeholder}
                            secureTextEntry
                            value={passwordInput}
                            onChangeText={setPasswordInput}
                            autoFocus
                            editable={!modalWorking}
                            onSubmitEditing={handleUnlockSubmit}
                        />

                        {modalError && (
                            <ThemedText type="caption" style={[styles.modalError, { color: theme.accent }]}>
                                {modalError}
                            </ThemedText>
                        )}

                        <Pressable
                            onPress={handleUnlockSubmit}
                            disabled={modalWorking}
                            style={[styles.modalButton, { backgroundColor: theme.accent }]}
                        >
                            {modalWorking
                                ? <ActivityIndicator color={theme.text} size="small" />
                                : <ThemedText type="smallBold">Unlock</ThemedText>
                            }
                        </Pressable>

                        {!modalWorking && (
                            <Pressable onPress={() => setShowUnlockModal(false)} style={styles.modalCancel}>
                                <ThemedText type="small" themeColor="textSecondary">Cancel</ThemedText>
                            </Pressable>
                        )}
                    </View>
                </KeyboardAvoidingView>
            </Modal>
        </ThemedView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    safeArea: { flex: 1 },
    searchRowWrap: {
        paddingHorizontal: Spacing.lg,
        paddingTop: Spacing.md,
    },
    searchActionBtn: {
        width: 44,
        height: 44,
        borderWidth: 2,
        borderRadius: Radius.md,
        alignItems: 'center',
        justifyContent: 'center',
    },
    heroSection: {
        paddingHorizontal: Spacing.lg,
        paddingTop: Spacing.sm,
        gap: Spacing.md,
    },
    lockBadge: {
        borderWidth: 1.5,
        borderRadius: Radius.md,
        padding: Spacing.md,
        gap: Spacing.xs,
    },
    listContent: {
        paddingBottom: 100,
    },
    cardLink: {
        width: '100%',
        paddingHorizontal: Spacing.lg,
        paddingVertical: Spacing.xs,
    },
    // Modal styles
    modalOverlay: {
        flex: 1,
        justifyContent: 'flex-end',
        backgroundColor: 'rgba(0,0,0,0.4)',
    },
    modalSheet: {
        borderTopLeftRadius: Radius.xl,
        borderTopRightRadius: Radius.xl,
        borderWidth: 1.5,
        borderBottomWidth: 0,
        padding: Spacing.xl,
        gap: Spacing.sm,
        paddingBottom: Spacing.xl + 20, // extra space for home indicator
    },
    modalTitle: {
        marginBottom: Spacing.xs,
    },
    modalSubtitle: {
        marginBottom: Spacing.sm,
    },
    passwordInput: {
        borderWidth: 2,
        borderRadius: Radius.md,
        padding: Spacing.md,
        fontSize: 16,
    },
    modalError: {
        marginTop: Spacing.xs,
    },
    modalButton: {
        borderRadius: Radius.md,
        paddingVertical: Spacing.md,
        alignItems: 'center',
        marginTop: Spacing.sm,
        minHeight: 48,
        justifyContent: 'center',
    },
    modalCancel: {
        alignItems: 'center',
        paddingVertical: Spacing.sm,
    },
});
