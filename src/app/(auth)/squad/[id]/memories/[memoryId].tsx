import { useMutation, usePaginatedQuery, useQuery } from 'convex/react';
import { Image } from 'expo-image';
import { useGlobalSearchParams, useRouter } from 'expo-router';
import { Heart, MoreHorizontal } from 'lucide-react-native';
import { useCallback, useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AddItemModal } from '@/components/memories/add-item-modal';
import { ItemCommentsModal } from '@/components/memories/item-comments-modal';
import { ScrapbookSection } from '@/components/memories/scrapbook-section';
import { WallQuoteCard } from '@/components/memories/wall-quote-card';
import { ImageViewer } from '@/components/image-viewer';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { DashedSeparator } from '@/components/ui/dashed-separator';
import { EmojiPickerModal } from '@/components/ui/emoji-picker-modal';
import { EmojiReactionStrip } from '@/components/ui/emoji-reaction-strip';
import { LoadingState } from '@/components/ui/loading-state';
import { NotFoundState } from '@/components/ui/not-found-state';
import { PaginatedList } from '@/components/ui/paginated-list';
import { ScreenHeader } from '@/components/ui/screen-header';
import { UserAvatar } from '@/components/user-avatar';
import { LineHeight, Spacing, Typography, Weight } from '@/constants/theme';
import { api } from '@/convex/_generated/api';
import { Id } from '@/convex/_generated/dataModel';
import { useTheme } from '@/hooks/use-theme';
import { formatRelativeTime } from '@/utils/time';

const COMMENTS_PAGE_SIZE = 20;

export default function MemoryDetailScreen() {
    const { memoryId } = useGlobalSearchParams<{ memoryId: string }>();
    const theme = useTheme();
    const router = useRouter();

    const currentUser = useQuery(api.users.current);
    const toggleReaction = useMutation(api.memories.toggleMemoryReaction);
    const toggleItemReaction = useMutation(api.memories.toggleMemoryItemReaction);
    const addComment = useMutation(api.memories.addMemoryComment);
    const addItemComment = useMutation(api.memories.addMemoryItemComment);
    const addMemoryItem = useMutation(api.memories.addMemoryItem);
    const deleteMemory = useMutation(api.memories.deleteMemory);

    const detail = useQuery(
        api.memories.getMemoryDetail,
        memoryId ? { memoryId: memoryId as Id<"memories"> } : "skip",
    );

    const {
        results: comments,
        loadMore,
        status,
    } = usePaginatedQuery(
        api.memories.getMemoryComments,
        memoryId ? { memoryId: memoryId as Id<"memories"> } : "skip",
        { initialNumItems: COMMENTS_PAGE_SIZE },
    );

    const [commentText, setCommentText] = useState('');
    const [sending, setSending] = useState(false);
    const [coverViewerVisible, setCoverViewerVisible] = useState(false);
    const [reactionTarget, setReactionTarget] = useState<{ type: 'memory' | 'item'; id: string } | null>(null);

    // Add item modal
    const [showAddItem, setShowAddItem] = useState(false);

    // Item comments modal
    const [expandedItemId, setExpandedItemId] = useState<string | null>(null);
    const [sendingItemComment, setSendingItemComment] = useState(false);

    const {
        results: itemComments,
        loadMore: loadMoreItemComments,
        status: itemCommentsStatus,
    } = usePaginatedQuery(
        api.memories.getMemoryItemComments,
        expandedItemId ? { itemId: expandedItemId as Id<"memoryItems"> } : "skip",
        { initialNumItems: COMMENTS_PAGE_SIZE },
    );

    const handleToggleReaction = useCallback(
        (emoji: string) => {
            if (!memoryId) return;
            toggleReaction({ memoryId: memoryId as Id<"memories">, emoji });
        },
        [memoryId, toggleReaction],
    );

    const handleToggleItemReaction = useCallback(
        (itemId: string, emoji: string) => {
            toggleItemReaction({ itemId: itemId as Id<"memoryItems">, emoji });
        },
        [toggleItemReaction],
    );

    const handleSendComment = async () => {
        const trimmed = commentText.trim();
        if (!trimmed || sending || !memoryId) return;
        setSending(true);
        try {
            await addComment({ memoryId: memoryId as Id<"memories">, content: trimmed });
            setCommentText('');
        } finally {
            setSending(false);
        }
    };

    const handleAddItem = useCallback(async (args: {
        type: 'reflection' | 'photo' | 'link';
        content: string;
        caption?: string;
        storageId?: Id<"_storage">;
    }) => {
        if (!memoryId) return;
        await addMemoryItem({
            memoryId: memoryId as Id<"memories">,
            type: args.type,
            content: args.content,
            caption: args.caption,
            storageId: args.storageId,
        });
    }, [memoryId, addMemoryItem]);

    const handleSendItemComment = async (content: string) => {
        if (!expandedItemId) return;
        setSendingItemComment(true);
        try {
            await addItemComment({ itemId: expandedItemId as Id<"memoryItems">, content });
        } finally {
            setSendingItemComment(false);
        }
    };

    const isOwner = detail?.isOwner ?? false;

    const handleDelete = () => {
        if (!memoryId) return;
        Alert.alert('Delete', 'Are you sure?', [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'Delete', style: 'destructive', onPress: async () => {
                    await deleteMemory({ memoryId: memoryId as Id<"memories"> });
                    router.back();
                },
            },
        ]);
    };

    if (detail === undefined) {
        return <LoadingState />;
    }

    if (detail === null) {
        return <NotFoundState message="Memory not found." />;
    }

    const { memory, nickname, reactions, items, coverUrl } = detail;
    const isWall = memory.type === 'wall';
    const isEvent = memory.type === 'event';
    const totalComments = comments.length;

    const groupedReactions = (() => {
        const map = new Map();
        for (const r of reactions) {
            const ex = map.get(r.emoji) ?? { count: 0, reacted: false };
            ex.count++;
            if (r.userId === currentUser?._id) ex.reacted = true;
            map.set(r.emoji, ex);
        }
        return [...map.entries()].map(([emoji, { count, reacted }]) => ({ emoji, count, reacted }));
    })();

    return (
        <ThemedView style={styles.container}>
            <SafeAreaView style={styles.safeArea} edges={[]}>
                <ScreenHeader
                    title={isWall ? 'Memory 💛' : (detail.memory.title ?? 'Event 🎉')}
                    onBack={() => router.back()}
                    rightIcon={MoreHorizontal}
                    onRightPress={isOwner ? handleDelete : undefined}
                />
                <KeyboardAvoidingView
                    behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                    style={styles.inner}
                >
                    <PaginatedList
                        data={comments}
                        keyExtractor={(item) => item._id}
                        status={status}
                        loadMore={loadMore}
                        pageSize={COMMENTS_PAGE_SIZE}
                        contentContainerStyle={styles.listContent}
                        ListHeaderComponent={
                            <View style={styles.header}>
                                {isWall && (
                                    <WallQuoteCard content={memory.content ?? ''} title={memory.title} />
                                )}

                                {isEvent && coverUrl && (
                                    <Pressable onPress={() => setCoverViewerVisible(true)}>
                                        <Image source={{ uri: coverUrl }} style={styles.coverImage} contentFit="cover" />
                                    </Pressable>
                                )}
                                {isEvent && memory.title && (
                                    <ThemedText style={styles.eventTitle}>{memory.title}</ThemedText>
                                )}

                                <View style={styles.authorRow}>
                                    <UserAvatar uri={null} size={28} fallbackText={nickname} />
                                    <ThemedText type="small" style={{ fontWeight: Weight.semibold }}>@{nickname}</ThemedText>
                                    <ThemedText type="caption" themeColor="textSecondary">
                                        {'·'} {formatRelativeTime(memory.createdAt)}
                                    </ThemedText>
                                </View>

                                <DashedSeparator marginVertical={Spacing.sm} />

                                <EmojiReactionStrip
                                    reactions={groupedReactions}
                                    onToggle={handleToggleReaction}
                                    onAdd={() => setReactionTarget({ type: 'memory', id: memory._id })}
                                    wrap
                                />

                                {totalComments > 0 && (
                                    <ThemedText type="small" style={[styles.commentCountLink, { color: theme.accent }]}>
                                        {totalComments} comment{totalComments !== 1 ? 's' : ''} 💬
                                    </ThemedText>
                                )}

                                {isEvent && (
                                    <ScrapbookSection
                                        items={items.map((item: any) => ({
                                            _id: item._id,
                                            type: item.type,
                                            content: item.content,
                                            caption: item.caption ?? undefined,
                                            photoUrl: item.photoUrl,
                                            avatarUrl: item.avatarUrl,
                                            nickname: item.nickname,
                                            createdAt: item.createdAt,
                                            reactions: item.reactions,
                                            commentCount: item.commentCount,
                                        }))}
                                        currentUserId={currentUser?._id}
                                        onToggleItemReaction={handleToggleItemReaction}
                                        onAddItemReaction={(itemId) => setReactionTarget({ type: 'item', id: itemId })}
                                        onAddItem={() => setShowAddItem(true)}
                                        onViewItemComments={(itemId) => setExpandedItemId(itemId)}
                                    />
                                )}

                                <ThemedText style={styles.commentsHeading}>
                                    {isWall ? 'Comments' : 'Reflections'}
                                </ThemedText>
                            </View>
                        }
                        renderItem={({ item }) => (
                            <View style={[styles.commentCard, { backgroundColor: theme.surface, borderColor: theme.outline }]}>
                                <View style={styles.commentHeader}>
                                    <UserAvatar uri={item.avatarUrl} size={24} fallbackText={item.nickname} />
                                    <ThemedText type="smallBold">@{item.nickname}</ThemedText>
                                    <ThemedText type="caption" themeColor="textSecondary" style={{ marginLeft: 'auto' }}>
                                        {formatRelativeTime(item.createdAt)}
                                    </ThemedText>
                                </View>
                                <ThemedText style={styles.commentContent}>{item.content}</ThemedText>
                                <View style={styles.commentFooter}>
                                    <View style={styles.heartRow}>
                                        <Heart size={13} color={theme.accent} strokeWidth={2} />
                                        <ThemedText type="caption" style={{ color: theme.accent, fontWeight: Weight.semibold }}>0</ThemedText>
                                    </View>
                                </View>
                            </View>
                        )}
                    />

                    <View style={[styles.inputRow, { borderTopColor: theme.outlineLight, backgroundColor: theme.background }]}>
                        <TextInput
                            value={commentText}
                            onChangeText={setCommentText}
                            placeholder={isWall ? 'Add a comment…' : 'Add a reflection…'}
                            placeholderTextColor={theme.placeholder}
                            style={[styles.input, { color: theme.text, backgroundColor: theme.surface, borderColor: theme.outline }]}
                            returnKeyType="send"
                            onSubmitEditing={handleSendComment}
                        />
                        <Pressable
                            onPress={handleSendComment}
                            disabled={!commentText.trim() || sending}
                            style={[
                                styles.sendBtn,
                                { backgroundColor: commentText.trim() && !sending ? theme.accent : theme.backgroundElement, borderColor: theme.outline },
                                (!commentText.trim() || sending) && styles.sendDisabled,
                            ]}
                        >
                            <ThemedText style={[styles.sendText, { color: commentText.trim() && !sending ? theme.text : theme.textTertiary }]}>
                                {sending ? '…' : 'Send'}
                            </ThemedText>
                        </Pressable>
                    </View>
                </KeyboardAvoidingView>
            </SafeAreaView>

            <AddItemModal
                visible={showAddItem}
                onClose={() => setShowAddItem(false)}
                onAdd={handleAddItem}
            />

            <ItemCommentsModal
                visible={expandedItemId !== null}
                comments={itemComments}
                status={itemCommentsStatus}
                loadMore={loadMoreItemComments}
                onClose={() => setExpandedItemId(null)}
                onSend={handleSendItemComment}
            />

            <ImageViewer
                visible={coverViewerVisible}
                uri={coverUrl ?? null}
                onClose={() => setCoverViewerVisible(false)}
            />

            <EmojiPickerModal
                visible={reactionTarget !== null}
                title={reactionTarget?.type === 'item' ? 'React to memory item' : 'React to memory'}
                onClose={() => setReactionTarget(null)}
                onSelect={(emoji) => {
                    if (!reactionTarget) return;
                    if (reactionTarget.type === 'memory') {
                        toggleReaction({ memoryId: reactionTarget.id as Id<'memories'>, emoji });
                    } else {
                        toggleItemReaction({ itemId: reactionTarget.id as Id<'memoryItems'>, emoji });
                    }
                    setReactionTarget(null);
                }}
            />
        </ThemedView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    safeArea: { flex: 1 },
    inner: { flex: 1 },
    header: {
        paddingHorizontal: Spacing.lg,
        paddingTop: Spacing.md,
        gap: Spacing.sm,
    },
    authorRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.xs,
        paddingVertical: Spacing.xs,
    },
    commentCountLink: {
        fontWeight: Weight.semibold,
        marginTop: Spacing.xs,
    },
    eventTitle: {
        fontSize: Typography.subtitle,
        fontWeight: Weight.extrabold,
    },
    coverImage: {
        height: 220,
        borderRadius: 16,
        width: '100%',
    },
    commentsHeading: {
        fontSize: Typography.body,
        fontWeight: Weight.bold,
        letterSpacing: 0.3,
        marginTop: Spacing.lg,
    },
    listContent: {
        paddingHorizontal: Spacing.lg,
        paddingBottom: Spacing.lg,
        gap: Spacing.sm,
    },
    commentCard: {
        padding: Spacing.md,
        borderWidth: 1.5,
        borderRadius: 12,
        gap: Spacing.xs,
    },
    commentHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.xs,
    },
    commentFooter: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginTop: Spacing.xs,
    },
    heartRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    commentContent: {
        fontSize: Typography.body,
        lineHeight: LineHeight.subtitle,
    },
    inputRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: Spacing.md,
        paddingVertical: Spacing.sm,
        borderTopWidth: 1.5,
        gap: Spacing.sm,
    },
    input: {
        flex: 1,
        minHeight: 38,
        paddingHorizontal: Spacing.md,
        borderRadius: 9999,
        borderWidth: 1.5,
        fontSize: Typography.body,
    },
    sendBtn: {
        paddingHorizontal: Spacing.md,
        paddingVertical: Spacing.sm,
        borderRadius: 9999,
        borderWidth: 1.5,
        minHeight: 38,
        justifyContent: 'center',
    },
    sendDisabled: {
        opacity: 0.4,
    },
    sendText: {
        fontSize: Typography.small,
        fontWeight: Weight.bold,
    },
});
