import type React from 'react';
import { StyleSheet, View, type ListRenderItem } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { PaginatedList } from '@/components/ui/paginated-list';
import { Spacing, Weight } from '@/constants/theme';

interface CommentThreadLayoutProps<T> {
    comments: T[];
    commentCount: number;
    status: string;
    loadMore: (numItems: number) => void;
    pageSize: number;
    keyExtractor: (item: T) => string;
    renderItem: ListRenderItem<T>;
    header: React.ReactElement;
    inputBar: React.ReactElement;
    emptyText?: string;
    title?: string;
    children?: React.ReactNode;
}

export function CommentThreadLayout<T>({
    comments,
    commentCount,
    status,
    loadMore,
    pageSize,
    keyExtractor,
    renderItem,
    header,
    inputBar,
    emptyText = 'No comments yet. Start the conversation.',
    title = 'Comments',
    children,
}: CommentThreadLayoutProps<T>) {
    return (
        <>
            <PaginatedList
                data={comments}
                keyExtractor={keyExtractor}
                status={status}
                loadMore={loadMore}
                pageSize={pageSize}
                contentContainerStyle={styles.listContent}
                ListHeaderComponent={
                    <View style={styles.header}>
                        {header}
                        <View style={styles.commentsTitleRow}>
                            <ThemedText
                                type="smallBold"
                                style={styles.sectionTitle}
                                selectable
                            >
                                {title}
                            </ThemedText>
                            <ThemedText type="caption" themeColor="textSecondary" style={styles.countText} selectable>
                                {commentCount === 1 ? '1 comment' : `${commentCount} comments`}
                            </ThemedText>
                        </View>
                    </View>
                }
                ListEmptyComponent={
                    <View style={styles.emptyComments}>
                        <ThemedText type="small" themeColor="textSecondary" selectable>
                            {emptyText}
                        </ThemedText>
                    </View>
                }
                renderItem={renderItem}
            />

            {inputBar}
            {children}
        </>
    );
}

const styles = StyleSheet.create({
    header: {
        paddingHorizontal: Spacing.lg,
        paddingTop: Spacing.md,
        gap: Spacing.md,
    },
    commentsTitleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: Spacing.md,
        paddingTop: Spacing.xs,
        paddingBottom: Spacing.sm,
    },
    sectionTitle: {
        fontWeight: Weight.semibold,
    },
    countText: {
        fontVariant: ['tabular-nums'],
    },
    listContent: {
        paddingBottom: Spacing.xxxl,
    },
    emptyComments: {
        padding: Spacing.xxl,
        alignItems: 'center',
    },
});
