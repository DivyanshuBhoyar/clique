import { useMutation, usePaginatedQuery, useQuery } from 'convex/react';
import { Link, useGlobalSearchParams, useRouter } from 'expo-router';
import { Globe, Plus } from 'lucide-react-native';
import { useCallback, useState } from 'react';
import { Pressable, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { DropCard } from '@/components/drops/drop-card';
import { ThemedView } from '@/components/themed-view';
import { EmojiPickerModal } from '@/components/ui/emoji-picker-modal';
import { EmptyState } from '@/components/ui/empty-state';
import { Fab } from '@/components/ui/fab';
import { FilterChips } from '@/components/ui/filter-chips';
import { LoadingState } from '@/components/ui/loading-state';
import { PaginatedList } from '@/components/ui/paginated-list';
import { ScreenHeader } from '@/components/ui/screen-header';
import { Spacing } from '@/constants/theme';
import { api } from '@/convex/_generated/api';
import { Id } from '@/convex/_generated/dataModel';
import { useBookmarkToggle } from '@/hooks/use-bookmark-mutation';
import { useReactionPicker } from '@/hooks/use-reaction-picker';
import { useDropVote } from '@/hooks/use-vote-mutation';

const PAGE_SIZE = 20;

const FILTER_CHIPS = [
  { label: 'All', emoji: '✨' },
  { label: 'Top', emoji: '🏆' },
  { label: 'Song', emoji: '🎵' },
  { label: 'Movie', emoji: '🎬' },
  { label: 'Book', emoji: '📚' },
  { label: 'Quote', emoji: '💬' },
  { label: 'Life Hack', emoji: '💡' },
  { label: 'Random', emoji: '🎲' },
];

const CHIP_CATEGORY: Record<number, string> = {
  2: 'song', 3: 'movie', 4: 'book', 5: 'quote', 6: 'lifehack', 7: 'random',
};

export default function DropsScreen() {
  const { id } = useGlobalSearchParams<{ id: string }>();
  const squadId = (typeof id === 'string' ? id : undefined) as Id<'squads'> | undefined;
  const router = useRouter();
  const [activeFilter, setActiveFilter] = useState(0);

  const currentUser = useQuery(api.users.current);
  const toggleReaction = useMutation(api.drops.toggleDropReaction);
  const dropVote = useDropVote();
  const bookmarkToggle = useBookmarkToggle();

  const { results: drops, loadMore, status } = usePaginatedQuery(
    api.drops.getDrops,
    squadId ? { squadId } : 'skip',
    { initialNumItems: PAGE_SIZE },
  );

  const handleToggleReaction = useCallback(
    async (dropId: string, emoji: string) => {
      await toggleReaction({ dropId: dropId as Id<'drops'>, emoji });
    },
    [toggleReaction],
  );

  const reactionPicker = useReactionPicker(handleToggleReaction, 'React to drop');

  const handleVote = useCallback(
    (dropId: string, value: 'up' | 'down') => {
      dropVote({ dropId: dropId as Id<'drops'>, value });
    },
    [dropVote],
  );

  const filteredDrops = (drops ?? []).filter((d) => {
    if (activeFilter === 0) return true;
    if (activeFilter === 1) return true;
    return d.category === CHIP_CATEGORY[activeFilter];
  }).sort((a, b) => {
    if (activeFilter !== 1) return 0;

    const scoreA = (a.upvotes ?? 0) - (a.downvotes ?? 0);
    const scoreB = (b.upvotes ?? 0) - (b.downvotes ?? 0);
    if (scoreA !== scoreB) return scoreB - scoreA;
    return b.createdAt - a.createdAt;
  });

  if (drops === undefined) {
    return <LoadingState message="Sorting the good drops from the chaos…" />;
  }

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={[]}>
        <ScreenHeader
          title="Drops 🎁"
          leftIcon={Globe}
          onLeftPress={() => router.navigate('/?switcher=1' as any)}
          rightIcon={Plus}
          onRightPress={() => router.push(`/squad/${squadId}/drops/new` as any)}
        />

        <FilterChips
          chips={FILTER_CHIPS}
          activeIndex={activeFilter}
          onSelect={setActiveFilter}
        />

        {filteredDrops.length === 0 ? (
          <EmptyState
            emoji="🎁"
            title="No drops yet"
            subtitle={activeFilter === 0
              ? 'Be the first to drop something!'
              : activeFilter === 1
                ? 'No drops to rank yet'
              : `No ${FILTER_CHIPS[activeFilter].label.toLowerCase()} drops yet`}
            actionLabel="Drop something"
            onAction={() => router.push(`/squad/${squadId}/drops/new` as any)}
          />
        ) : (
          <PaginatedList
            data={filteredDrops}
            keyExtractor={(item) => item._id}
            status={status}
            loadMore={loadMore}
            pageSize={PAGE_SIZE}
            contentContainerStyle={styles.listContent}
            renderItem={({ item }) => (
              <Pressable
                onPress={() => router.push(`/squad/${squadId}/drops/${item._id}` as any)}
                style={styles.cardLink}
              >
                <DropCard
                  dropId={item._id}
                  category={item.category}
                  nickname={item.nickname}
                  avatarUrl={item.avatarUrl}
                  content={item.content}
                  createdAt={item.createdAt}
                  commentCount={item.commentCount}
                  reactions={item.reactions}
                  currentUserId={currentUser?._id}
                  onToggleReaction={handleToggleReaction}
                  onAddReaction={(targetDropId) => reactionPicker.openPicker(targetDropId)}
                  truncate
                  upvotes={item.upvotes}
                  downvotes={item.downvotes}
                  userVote={item.userVote}
                  onVote={handleVote}
                  isBookmarked={item.isBookmarked}
                  onToggleBookmark={(dropId) => bookmarkToggle({ targetType: "drop", dropId: dropId as any })}
                />
              </Pressable>
            )}
          />
        )}

        <Link href={`/squad/${squadId}/drops/new` as any} asChild>
          <Fab accessibilityLabel="Create drop" />
        </Link>

        <EmojiPickerModal {...reactionPicker.pickerProps} />
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1 },
  listContent: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: 100,
  },
  cardLink: {
    width: '100%',
    marginBottom: Spacing.lg,
  },
});
