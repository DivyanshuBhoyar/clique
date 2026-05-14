import { Plus } from 'lucide-react-native';
import { Pressable, StyleSheet, View } from 'react-native';

import { MemoryItemCard } from '@/components/memories/memory-item-card';
import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing, Typography, Weight } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

interface ScrapbookItem {
  _id: string;
  type: 'reflection' | 'photo' | 'link';
  content: string;
  caption?: string;
  photoUrl?: string | null;
  avatarUrl?: string | null;
  nickname: string;
  createdAt: number;
  reactions: { emoji: string; userId: string }[];
  commentCount: number;
}

interface ScrapbookSectionProps {
  items: ScrapbookItem[];
  currentUserId?: string;
  onToggleItemReaction: (itemId: string, emoji: string) => void;
  onAddItemReaction: (itemId: string) => void;
  onAddItem: () => void;
  onViewPhotos?: () => void;
  onViewItemComments: (itemId: string) => void;
}

export function ScrapbookSection({
  items,
  currentUserId,
  onToggleItemReaction,
  onAddItemReaction,
  onAddItem,
  onViewPhotos,
  onViewItemComments,
}: ScrapbookSectionProps) {
  const theme = useTheme();
  const photoCount = items.filter((item) => item.type === 'photo' && item.photoUrl).length;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <ThemedText style={styles.title}>📸 Scrapbook</ThemedText>
        <View style={styles.headerActions}>
          {photoCount > 0 && onViewPhotos ? (
            <Pressable
              onPress={onViewPhotos}
              style={[styles.addBtn, { backgroundColor: theme.accentSoft, borderColor: theme.outline, borderRadius: Radius.full }]}
              accessibilityRole="button"
              accessibilityLabel="View all memory photos"
            >
              <ThemedText style={[styles.addBtnText, { color: theme.text }]}>View photos</ThemedText>
            </Pressable>
          ) : null}
          <Pressable
            onPress={onAddItem}
            style={[styles.addBtn, { backgroundColor: theme.surface, borderColor: theme.outline, borderRadius: Radius.full }]}
            accessibilityRole="button"
            accessibilityLabel="Add scrapbook item"
          >
            <Plus size={13} color={theme.text} strokeWidth={2.5} />
            <ThemedText style={[styles.addBtnText, { color: theme.text }]}>Add</ThemedText>
          </Pressable>
        </View>
      </View>

      {items.length === 0 ? (
        <ThemedText type="small" themeColor="textSecondary" style={styles.empty}>
          No drops yet. Be the first to add one!
        </ThemedText>
      ) : (
        items.map((item) => (
          <View key={item._id} style={styles.itemWrap}>
            <MemoryItemCard
              type={item.type}
              content={item.content}
              caption={item.caption}
              photoUrl={item.photoUrl}
              avatarUrl={item.avatarUrl}
              nickname={item.nickname}
              createdAt={item.createdAt}
              reactions={item.reactions}
              commentCount={item.commentCount}
              currentUserId={currentUserId}
              onToggleReaction={(emoji) => onToggleItemReaction(item._id, emoji)}
              onAddReaction={() => onAddItemReaction(item._id)}
            />
            {item.commentCount > 0 && (
              <Pressable onPress={() => onViewItemComments(item._id)} style={styles.commentLink}>
                <ThemedText type="small" themeColor="textSecondary">
                  View {item.commentCount} comment{item.commentCount !== 1 ? 's' : ''}
                </ThemedText>
              </Pressable>
            )}
          </View>
        ))
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: Spacing.sm,
    marginTop: Spacing.sm,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  title: {
    fontSize: Typography.small,
    fontWeight: Weight.bold,
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderWidth: 1.5,
  },
  addBtnText: {
    fontSize: Typography.caption,
    fontWeight: Weight.bold,
  },
  empty: {
    fontStyle: 'italic',
  },
  itemWrap: {
    marginBottom: Spacing.sm,
  },
  commentLink: {
    paddingLeft: Spacing.xs,
    paddingTop: Spacing.xs,
  },
});
