import { useMutation, usePaginatedQuery } from 'convex/react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Bookmark } from 'lucide-react-native';
import { useCallback } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { EmptyState } from '@/components/ui/empty-state';
import { PaginatedList } from '@/components/ui/paginated-list';
import { ScreenHeader } from '@/components/ui/screen-header';
import { Radius, Spacing, Typography } from '@/constants/theme';
import { api } from '@/convex/_generated/api';
import { Id } from '@/convex/_generated/dataModel';
import { useTheme } from '@/hooks/use-theme';

const PAGE_SIZE = 30;

const TYPE_ICON: Record<string, string> = {
    message: '💬',
    drop: '🎁',
    note: '📝',
    memory: '🧠',
};

export default function BookmarksScreen() {
    const router = useRouter();
    const theme = useTheme();
    const { id } = useLocalSearchParams<{ id: string }>();
    const squadId = id as Id<"squads">;

    const removeBookmark = useMutation(api.bookmarks.toggleBookmark);

    const { results: bookmarks, loadMore, status } = usePaginatedQuery(
        api.bookmarks.getBookmarks,
        { squadId },
        { initialNumItems: PAGE_SIZE }
    );

    const handleRemove = useCallback(async (bookmark: any) => {
        const args: any = { targetType: bookmark.targetType };
        args[`${bookmark.targetType}Id`] = bookmark.targetId;
        await removeBookmark(args);
    }, [removeBookmark]);

    const handleNavigate = useCallback((item: any) => {
        if (item.targetType === 'drop') {
            router.push(`/squad/${squadId}/drops/${item.targetId}` as any);
        } else if (item.targetType === 'note') {
            router.push(`/squad/${squadId}/notes/${item.targetId}` as any);
        } else if (item.targetType === 'memory') {
            router.push(`/squad/${squadId}/memories/${item.targetId}` as any);
        }
    }, [squadId, router]);

    return (
        <ThemedView style={styles.container}>
            <SafeAreaView style={styles.safeArea} edges={[]}>
                <ScreenHeader
                    title="Bookmarks 🔖"
                    onBack={() => router.back()}
                />
                <PaginatedList
                    data={bookmarks}
                    keyExtractor={(item: any) => item._id}
                    status={status}
                    loadMore={loadMore}
                    pageSize={PAGE_SIZE}
                    contentContainerStyle={styles.listContent}
                    ListEmptyComponent={
                        <EmptyState
                            emoji="🔖"
                            title="No bookmarks yet"
                            subtitle="Bookmark messages, drops, notes, and memories to find them here."
                        />
                    }
                    renderItem={({ item }: { item: any }) => (
                        <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.outline }]}>
                            <Pressable onPress={() => handleNavigate(item)} style={styles.cardContent}>
                                <ThemedText style={styles.typeIcon}>{TYPE_ICON[item.targetType] ?? '📌'}</ThemedText>
                                <View style={styles.textContent}>
                                    {item.title ? (
                                        <ThemedText type="smallBold" numberOfLines={1}>{item.title}</ThemedText>
                                    ) : null}
                                    <ThemedText type="small" themeColor="textSecondary" numberOfLines={2}>
                                        {item.content}
                                    </ThemedText>
                                </View>
                            </Pressable>
                            <Pressable
                                onPress={() => handleRemove(item)}
                                hitSlop={8}
                                accessibilityRole="button"
                                accessibilityLabel="Remove bookmark"
                            >
                                <Bookmark size={18} color={theme.accent} fill={theme.accent} strokeWidth={2} />
                            </Pressable>
                        </View>
                    )}
                />
            </SafeAreaView>
        </ThemedView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    safeArea: { flex: 1 },
    listContent: { paddingHorizontal: Spacing.lg, paddingTop: Spacing.md, paddingBottom: Spacing.xxxl },
    card: {
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 2,
        borderRadius: Radius.lg,
        paddingHorizontal: Spacing.md,
        paddingVertical: Spacing.md,
        marginBottom: Spacing.sm,
        gap: Spacing.sm,
    },
    cardContent: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.sm,
    },
    typeIcon: { fontSize: Typography.subtitle },
    textContent: { flex: 1, gap: 2 },
});
