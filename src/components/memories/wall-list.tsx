import { useRouter } from 'expo-router';
import { useCallback } from 'react';
import { Pressable, StyleSheet } from 'react-native';

import { WallCard } from '@/components/memories/wall-card';
import { EmptyState } from '@/components/ui/empty-state';
import { PaginatedList } from '@/components/ui/paginated-list';
import { Spacing } from '@/constants/theme';
import { Id } from '@/convex/_generated/dataModel';

interface WallItem {
  _id: string;
  content?: string;
  nickname: string;
  avatarUrl?: string | null;
  createdAt: number;
  reactions: { emoji: string; userId: string }[];
  commentCount: number;
  isBookmarked?: boolean;
}

interface WallListProps {
  items: WallItem[];
  status: string;
  loadMore: (numItems: number) => void;
  squadId: Id<'squads'> | undefined;
  currentUserId?: string;
  onToggleReaction: (memoryId: string, emoji: string) => void;
  onAddReaction: (memoryId: string) => void;
  onToggleBookmark: (memoryId: string) => void;
}

export function WallList({
  items,
  status,
  loadMore,
  squadId,
  currentUserId,
  onToggleReaction,
  onAddReaction,
  onToggleBookmark,
}: WallListProps) {
  const router = useRouter();

  if (items.length === 0) {
    return (
      <EmptyState
        emoji="🧠"
        title="No memories yet"
        subtitle="Drop your first memory!"
        actionLabel="Create memory"
        onAction={() => router.push(`/squad/${squadId}/memories/new?type=wall` as any)}
      />
    );
  }

  return (
    <PaginatedList
      data={items}
      keyExtractor={(item) => item._id}
      status={status}
      loadMore={loadMore}
      contentContainerStyle={styles.listContent}
      renderItem={({ item }) => (
        <Pressable
          onPress={() => router.push(`/squad/${squadId}/memories/${item._id}` as any)}
          style={styles.cardLink}
        >
          <WallCard
            memoryId={item._id}
            content={item.content ?? ''}
            nickname={item.nickname}
            avatarUrl={item.avatarUrl}
            createdAt={item.createdAt}
            reactions={item.reactions}
            commentCount={item.commentCount}
            currentUserId={currentUserId}
            onToggleReaction={(emoji) => onToggleReaction(item._id, emoji)}
            onAddReaction={() => onAddReaction(item._id)}
            isBookmarked={item.isBookmarked}
            onToggleBookmark={onToggleBookmark}
            truncate
          />
        </Pressable>
      )}
    />
  );
}

const styles = StyleSheet.create({
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
