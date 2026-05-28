import { useMutation, usePaginatedQuery, useQuery } from 'convex/react';
import { useGlobalSearchParams, useRouter } from 'expo-router';
import { MoreHorizontal } from 'lucide-react-native';
import { useCallback, useState } from 'react';

import { ImageViewer } from '@/components/image-viewer';
import { AddItemModal } from '@/components/memories/add-item-modal';
import { EditMemoryModal } from '@/components/memories/edit-memory-modal';
import { ItemCommentsModal } from '@/components/memories/item-comments-modal';
import { MemoryActionsModal } from '@/components/memories/memory-actions-modal';
import { MemoryCommentCard } from '@/components/memories/memory-comment-card';
import { MemoryDetailHeader } from '@/components/memories/memory-detail-header';
import { CommentInputBar } from '@/components/ui/comment-input-bar';
import { CommentThreadLayout } from '@/components/ui/comment-thread-layout';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { DetailScreenContainer } from '@/components/ui/detail-screen-container';
import { EmojiPickerModal } from '@/components/ui/emoji-picker-modal';
import { LoadingState } from '@/components/ui/loading-state';
import { NotFoundState } from '@/components/ui/not-found-state';
import { api } from '@/convex/_generated/api';
import { Id } from '@/convex/_generated/dataModel';
import { useToast } from '@/hooks/use-toast';
import { type GiphyGif, pingGiphy } from '@/lib/giphy';
import { backOrReplace } from '@/utils/navigation';

const COMMENTS_PAGE_SIZE = 20;

export default function MemoryDetailScreen() {
    const { id, memoryId } = useGlobalSearchParams<{ id: string; memoryId: string }>();
    const router = useRouter();
    const toast = useToast();
    const squadId = id as Id<'squads'>;

    const currentUser = useQuery(api.users.current);
    const toggleReaction = useMutation(api.memories.toggleMemoryReaction);
    const toggleItemReaction = useMutation(api.memories.toggleMemoryItemReaction);
    const addComment = useMutation(api.memories.addMemoryComment);
    const addItemComment = useMutation(api.memories.addMemoryItemComment);
    const addMemoryItem = useMutation(api.memories.addMemoryItem);
    const editMemory = useMutation(api.memories.editMemory);
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
    const [galleryIndex, setGalleryIndex] = useState<number | null>(null);
    const [showActions, setShowActions] = useState(false);
    const [showEditMemory, setShowEditMemory] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [reactionTarget, setReactionTarget] = useState<{ type: 'memory' | 'item'; id: string } | null>(null);

    // Add item modal
    const [showAddItem, setShowAddItem] = useState(false);

    // Item comments modal
    const [expandedItemId, setExpandedItemId] = useState<string | null>(null);
    const [, setSendingItemComment] = useState(false);

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
        setShowDeleteConfirm(true);
    };

    const handleEditMemory = useCallback(async (args: {
        title?: string;
        content?: string;
        coverStorageId?: Id<'_storage'>;
        removeCover?: boolean;
    }) => {
        if (!memoryId) return;
        try {
            await editMemory({
                memoryId: memoryId as Id<'memories'>,
                title: args.title,
                content: args.content,
                coverStorageId: args.coverStorageId,
                removeCover: args.removeCover,
            });
            toast.success('Memory updated');
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Could not update memory';
            toast.error(message);
            throw error;
        }
    }, [editMemory, memoryId, toast]);

    if (detail === undefined) {
        return <LoadingState />;
    }

    if (detail === null) {
        return <NotFoundState message="Memory not found." />;
    }

    const { memory, nickname, reactions, items, coverUrl } = detail;
    const photoItems = items.filter((item: any) => item.type === 'photo' && item.photoUrl);
    const activePhoto = galleryIndex === null ? null : photoItems[galleryIndex];
    const isWall = memory.type === 'wall';
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
        <DetailScreenContainer
            title={isWall ? 'Memory 💛' : (detail.memory.title ?? 'Event 🎉')}
            onBack={() => backOrReplace(router, `/squad/${squadId}/memories`)}
            rightIcon={MoreHorizontal}
            onRightPress={isOwner ? () => setShowActions(true) : undefined}
        >
            <CommentThreadLayout
                comments={comments}
                commentCount={totalComments}
                status={status}
                loadMore={loadMore}
                pageSize={COMMENTS_PAGE_SIZE}
                keyExtractor={(item) => item._id}
                title={isWall ? 'Comments' : 'Reflections'}
                emptyText={isWall ? 'No comments yet. Add the first thought.' : 'No reflections yet. Leave the first one.'}
                header={
                    <MemoryDetailHeader
                        memory={memory}
                        nickname={nickname}
                        reactions={groupedReactions}
                        items={items}
                        coverUrl={coverUrl}
                        currentUserId={currentUser?._id}
                        commentCount={totalComments}
                        onOpenCover={() => setCoverViewerVisible(true)}
                        onToggleReaction={handleToggleReaction}
                        onAddMemoryReaction={() => setReactionTarget({ type: 'memory', id: memory._id })}
                        onToggleItemReaction={handleToggleItemReaction}
                        onAddItemReaction={(itemId) => setReactionTarget({ type: 'item', id: itemId })}
                        onAddItem={() => setShowAddItem(true)}
                        onViewPhotos={() => setGalleryIndex(0)}
                        onViewItemComments={(itemId) => setExpandedItemId(itemId)}
                    />
                }
                inputBar={
                    <CommentInputBar
                        value={commentText}
                        onChangeText={setCommentText}
                        onSubmit={handleSendComment}
                        sending={sending}
                        placeholder={isWall ? 'Add a comment…' : 'Add a reflection…'}
                        avatarUrl={(currentUser as any)?.avatarUrl}
                        fallbackText={(currentUser as any)?.nickname ?? 'Me'}
                        onGifSelect={async (gif: GiphyGif) => {
                            if (!memoryId || sending) return;
                            setSending(true);
                            try {
                                pingGiphy('onsent', gif);
                                await addComment({
                                    memoryId: memoryId as Id<'memories'>,
                                    content: commentText.trim(),
                                    gifUrl: gif.url,
                                    gifPreviewUrl: gif.previewUrl,
                                    gifId: gif.id,
                                    gifTitle: gif.title || undefined,
                                });
                                setCommentText('');
                            } finally {
                                setSending(false);
                            }
                        }}
                    />
                }
                renderItem={({ item }) => (
                    <MemoryCommentCard
                        avatarUrl={item.avatarUrl}
                        nickname={item.nickname}
                        content={item.content}
                        gifUrl={item.gifUrl}
                        gifTitle={item.gifTitle}
                        createdAt={item.createdAt}
                    />
                )}
            >
                <AddItemModal
                    visible={showAddItem}
                    onClose={() => setShowAddItem(false)}
                    onAdd={handleAddItem}
                />

                <MemoryActionsModal
                    visible={showActions}
                    onClose={() => setShowActions(false)}
                    onEdit={() => setShowEditMemory(true)}
                    onDelete={handleDelete}
                />

                <EditMemoryModal
                    visible={showEditMemory}
                    memory={memory}
                    coverUrl={coverUrl}
                    onClose={() => setShowEditMemory(false)}
                    onSave={handleEditMemory}
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

                <ImageViewer
                    visible={galleryIndex !== null}
                    uri={activePhoto?.photoUrl ?? null}
                    title={activePhoto ? `${galleryIndex! + 1} of ${photoItems.length}${activePhoto.caption ? ` · ${activePhoto.caption}` : ''}` : undefined}
                    onClose={() => setGalleryIndex(null)}
                    onPrevious={galleryIndex !== null && galleryIndex > 0 ? () => setGalleryIndex(galleryIndex - 1) : undefined}
                    onNext={galleryIndex !== null && galleryIndex < photoItems.length - 1 ? () => setGalleryIndex(galleryIndex + 1) : undefined}
                />

                <ConfirmDialog
                    visible={showDeleteConfirm}
                    title="Delete memory?"
                    message="This removes the memory for everyone in your squad."
                    confirmLabel="Delete"
                    destructive
                    onCancel={() => setShowDeleteConfirm(false)}
                    onConfirm={async () => {
                        if (!memoryId) return;
                        setShowDeleteConfirm(false);
                        await deleteMemory({ memoryId: memoryId as Id<"memories"> });
                        backOrReplace(router, `/squad/${squadId}/memories`);
                    }}
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
            </CommentThreadLayout>
        </DetailScreenContainer>
    );
}
