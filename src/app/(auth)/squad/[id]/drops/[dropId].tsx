import { useMutation, usePaginatedQuery, useQuery } from 'convex/react';
import { useGlobalSearchParams, useRouter } from 'expo-router';
import { MoreHorizontal } from 'lucide-react-native';
import { useCallback, useState } from 'react';
import { Alert } from 'react-native';

import { DropCard } from '@/components/drops/drop-card';
import { CommentCard } from '@/components/ui/comment-card';
import { CommentInputBar } from '@/components/ui/comment-input-bar';
import { CommentThreadLayout } from '@/components/ui/comment-thread-layout';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { DetailScreenContainer } from '@/components/ui/detail-screen-container';
import { EmojiPickerModal } from '@/components/ui/emoji-picker-modal';
import { LoadingState } from '@/components/ui/loading-state';
import { NotFoundState } from '@/components/ui/not-found-state';
import { api } from '@/convex/_generated/api';
import { Id } from '@/convex/_generated/dataModel';
import { useBookmarkToggle } from '@/hooks/use-bookmark-mutation';
import { useReactionPicker } from '@/hooks/use-reaction-picker';
import { useCommentVote, useDropVote } from '@/hooks/use-vote-mutation';
import { pingGiphy } from '@/lib/giphy';
import { backOrReplace } from '@/utils/navigation';

const COMMENTS_PAGE_SIZE = 20;

export default function DropDetailScreen() {
    const { id, dropId } = useGlobalSearchParams<{ id: string; dropId: string }>();
    const router = useRouter();
    const squadId = id as Id<'squads'>;
    const [commentText, setCommentText] = useState('');
    const [isSendingComment, setIsSendingComment] = useState(false);
    const [showDeleteDropConfirm, setShowDeleteDropConfirm] = useState(false);
    const [commentPendingDelete, setCommentPendingDelete] = useState<string | null>(null);

    const currentUser = useQuery(api.users.current);
    const toggleReaction = useMutation(api.drops.toggleDropReaction);
    const addDropComment = useMutation(api.drops.addDropComment);
    const deleteDrop = useMutation(api.drops.deleteDrop);
    const deleteDropComment = useMutation(api.drops.deleteDropComment);
    const dropVote = useDropVote();
    const commentVote = useCommentVote();
    const bookmarkToggle = useBookmarkToggle();

    const drop = useQuery(
        api.drops.getDrop,
        dropId ? { dropId: dropId as Id<'drops'> } : 'skip',
    );

    const { results: comments, loadMore, status } = usePaginatedQuery(
        api.drops.getDropComments,
        dropId ? { dropId: dropId as Id<'drops'> } : 'skip',
        { initialNumItems: COMMENTS_PAGE_SIZE },
    );

    const handleToggleReaction = useCallback(
        async (dId: string, emoji: string) => {
            await toggleReaction({ dropId: dId as Id<'drops'>, emoji });
        },
        [toggleReaction],
    );

    const reactionPicker = useReactionPicker(handleToggleReaction, 'React to drop');

    const handleDropVote = useCallback(
        (dId: string, value: 'up' | 'down') => {
            dropVote({ dropId: dId as Id<'drops'>, value });
        },
        [dropVote],
    );

    const handleCommentVote = useCallback(
        (commentId: string, value: 'up' | 'down') => {
            commentVote({ commentId: commentId as Id<'dropComments'>, value });
        },
        [commentVote],
    );

    const handleSubmitComment = useCallback(async () => {
        const content = commentText.trim();
        if (!dropId || !content || isSendingComment) return;

        setIsSendingComment(true);
        try {
            await addDropComment({ dropId: dropId as Id<'drops'>, content });
            setCommentText('');
        } catch (error) {
            Alert.alert('Could not add comment', error instanceof Error ? error.message : 'Please try again.');
        } finally {
            setIsSendingComment(false);
        }
    }, [addDropComment, commentText, dropId, isSendingComment]);

    const isMyDrop = drop !== undefined && drop !== null && drop.userId === (currentUser as any)?._id;

    const handleMorePress = useCallback(() => {
        if (!drop || drop === null || !isMyDrop) return;
        setShowDeleteDropConfirm(true);
    }, [drop, isMyDrop]);

    const handleCommentDelete = useCallback((commentId: string, isOwn: boolean) => {
        if (!isOwn) return;
        setCommentPendingDelete(commentId);
    }, []);

    if (drop === undefined) {
        return <LoadingState />;
    }

    if (drop === null) {
        return <NotFoundState message="Drop not found." />;
    }

    return (
        <DetailScreenContainer
            title="Drop 🎁"
            onBack={() => backOrReplace(router, `/squad/${squadId}/drops`)}
            rightIcon={isMyDrop ? MoreHorizontal : undefined}
            onRightPress={isMyDrop ? handleMorePress : undefined}
        >
            <CommentThreadLayout
                comments={comments}
                commentCount={drop.commentCount}
                status={status}
                loadMore={loadMore}
                pageSize={COMMENTS_PAGE_SIZE}
                keyExtractor={(item) => item._id}
                title="💭"
                header={
                    <DropCard
                        dropId={drop._id}
                        category={drop.category}
                        nickname={drop.nickname}
                        avatarUrl={drop.avatarUrl}
                        content={drop.content}
                        createdAt={drop.createdAt}
                        commentCount={drop.commentCount}
                        reactions={drop.reactions}
                        currentUserId={currentUser?._id}
                        onToggleReaction={handleToggleReaction}
                        onAddReaction={() => reactionPicker.openPicker(drop._id)}
                        upvotes={drop.upvotes}
                        downvotes={drop.downvotes}
                        userVote={drop.userVote}
                        onVote={handleDropVote}
                        isBookmarked={drop.isBookmarked}
                        onToggleBookmark={(targetDropId) => bookmarkToggle({ targetType: 'drop', dropId: targetDropId as Id<'drops'> })}
                    />
                }
                inputBar={
                    <CommentInputBar
                        value={commentText}
                        onChangeText={setCommentText}
                        onSubmit={handleSubmitComment}
                        sending={isSendingComment}
                        avatarUrl={(currentUser as any)?.avatarUrl}
                        fallbackText={(currentUser as any)?.nickname ?? 'Me'}
                        onGifSelect={async (gif) => {
                            if (!dropId || isSendingComment) return;
                            setIsSendingComment(true);
                            try {
                                pingGiphy('onsent', gif);
                                await addDropComment({
                                    dropId: dropId as Id<'drops'>,
                                    content: commentText.trim(),
                                    gifUrl: gif.url,
                                    gifPreviewUrl: gif.previewUrl,
                                    gifId: gif.id,
                                    gifTitle: gif.title || undefined,
                                });
                                setCommentText('');
                            } catch (error) {
                                Alert.alert('Could not send GIF', error instanceof Error ? error.message : 'Please try again.');
                            } finally {
                                setIsSendingComment(false);
                            }
                        }}
                    />
                }
                renderItem={({ item }) => (
                    <CommentCard
                        avatarUrl={item.avatarUrl}
                        nickname={item.nickname}
                        content={item.content}
                        gifUrl={item.gifUrl}
                        gifTitle={item.gifTitle}
                        createdAt={item.createdAt}
                        upvotes={item.upvotes}
                        downvotes={item.downvotes}
                        userVote={item.userVote}
                        isOwn={item.userId === (currentUser as any)?._id}
                        onVote={(value) => handleCommentVote(item._id, value)}
                        onDelete={() => handleCommentDelete(item._id, true)}
                        onLongPress={() => handleCommentDelete(item._id, item.userId === (currentUser as any)?._id)}
                    />
                )}
            >
                <EmojiPickerModal {...reactionPicker.pickerProps} />

                <ConfirmDialog
                    visible={showDeleteDropConfirm}
                    title="Delete drop?"
                    message="This removes the drop, its reactions, comments, votes, and bookmarks for everyone."
                    confirmLabel="Delete"
                    destructive
                    onCancel={() => setShowDeleteDropConfirm(false)}
                    onConfirm={async () => {
                        setShowDeleteDropConfirm(false);
                        await deleteDrop({ dropId: dropId as Id<'drops'> });
                        backOrReplace(router, `/squad/${squadId}/drops`);
                    }}
                />

                <ConfirmDialog
                    visible={commentPendingDelete !== null}
                    title="Delete comment?"
                    message="This comment will disappear from the drop thread."
                    confirmLabel="Delete"
                    destructive
                    onCancel={() => setCommentPendingDelete(null)}
                    onConfirm={async () => {
                        if (!commentPendingDelete) return;
                        const commentId = commentPendingDelete;
                        setCommentPendingDelete(null);
                        await deleteDropComment({ commentId: commentId as Id<'dropComments'> });
                    }}
                />
            </CommentThreadLayout>
        </DetailScreenContainer>
    );
}
