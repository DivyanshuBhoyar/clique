import { useRouter } from 'expo-router';
import { Pressable, StyleSheet } from 'react-native';

import { EventCard } from '@/components/memories/event-card';
import { EmptyState } from '@/components/ui/empty-state';
import { PaginatedList } from '@/components/ui/paginated-list';
import { Spacing } from '@/constants/theme';
import { Id } from '@/convex/_generated/dataModel';

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
  isBookmarked?: boolean;
}

interface EventListProps {
  items: EventItem[];
  status: string;
  loadMore: (numItems: number) => void;
  squadId: Id<'squads'> | undefined;
  currentUserId?: string;
  onToggleReaction: (memoryId: string, emoji: string) => void;
  onAddReaction: (memoryId: string) => void;
  onToggleBookmark: (memoryId: string) => void;
}

export function EventList({
  items,
  status,
  loadMore,
  squadId,
  currentUserId,
  onToggleReaction,
  onAddReaction,
  onToggleBookmark,
}: EventListProps) {
  const router = useRouter();

  if (items.length === 0) {
    return (
      <EmptyState
        emoji="🎉"
        title="No events yet"
        subtitle="Start an event or trip!"
        actionLabel="Create event"
        onAction={() => router.push(`/squad/${squadId}/memories/new?type=event` as any)}
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
          <EventCard
            memoryId={item._id}
            title={item.title ?? ''}
            coverUrl={item.coverUrl}
            avatarUrl={item.avatarUrl}
            nickname={item.nickname}
            createdAt={item.createdAt}
            reflectionCount={item.reflectionCount}
            photoCount={item.photoCount}
            linkCount={item.linkCount}
            reactions={item.reactions}
            currentUserId={currentUserId}
            onToggleReaction={(emoji) => onToggleReaction(item._id, emoji)}
            onAddReaction={() => onAddReaction(item._id)}
            isBookmarked={item.isBookmarked}
            onToggleBookmark={onToggleBookmark}
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
