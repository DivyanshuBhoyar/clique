import { ActivityIndicator, FlatList, StyleSheet, type ListRenderItem, type ListRenderItemInfo, type ViewStyle } from 'react-native';
import type React from 'react';

import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

interface PaginatedListProps<T> {
  data: T[];
  keyExtractor: (item: T) => string;
  renderItem: ListRenderItem<T>;
  status: string;
  loadMore: (numItems: number) => void;
  pageSize?: number;
  contentContainerStyle?: ViewStyle;
  ListHeaderComponent?: React.ReactElement;
  ListEmptyComponent?: React.ReactElement;
  inverted?: boolean;
  initialNumToRender?: number;
  maxToRenderPerBatch?: number;
  windowSize?: number;
  keyboardShouldPersistTaps?: 'always' | 'never' | 'handled';
  onEndReachedThreshold?: number;
}

export function PaginatedList<T>({
  data,
  keyExtractor,
  renderItem,
  status,
  loadMore,
  pageSize = 20,
  contentContainerStyle,
  ListHeaderComponent,
  ListEmptyComponent,
  inverted,
  initialNumToRender = 15,
  maxToRenderPerBatch = 10,
  windowSize = 10,
  keyboardShouldPersistTaps = 'handled',
  onEndReachedThreshold = 0.5,
}: PaginatedListProps<T>) {
  const theme = useTheme();

  const canLoadMore = status === 'CanLoadMore';
  const loadingMore = status === 'LoadingMore';

  const handleEndReached = () => {
    if (canLoadMore) loadMore(pageSize);
  };

  return (
    <FlatList
      data={data}
      keyExtractor={keyExtractor}
      renderItem={renderItem}
      inverted={inverted}
      initialNumToRender={initialNumToRender}
      maxToRenderPerBatch={maxToRenderPerBatch}
      windowSize={windowSize}
      contentContainerStyle={[styles.defaultContent, contentContainerStyle]}
      keyboardShouldPersistTaps={keyboardShouldPersistTaps}
      onEndReached={handleEndReached}
      onEndReachedThreshold={onEndReachedThreshold}
      ListHeaderComponent={ListHeaderComponent}
      ListEmptyComponent={ListEmptyComponent}
      ListFooterComponent={
        loadingMore ? (
          <ActivityIndicator size="small" color={theme.accent} style={styles.loadingMore} />
        ) : null
      }
    />
  );
}

const styles = StyleSheet.create({
  defaultContent: {
    paddingBottom: Spacing.xxxl,
  },
  loadingMore: {
    paddingVertical: Spacing.lg,
  },
});
