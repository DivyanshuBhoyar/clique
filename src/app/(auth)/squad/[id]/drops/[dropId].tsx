import { useMutation, usePaginatedQuery, useQuery } from 'convex/react';
import { useGlobalSearchParams, useRouter } from 'expo-router';
import { MoreHorizontal } from 'lucide-react-native';
import { useCallback, useState } from 'react';
import {
    ActionSheetIOS,
    Alert,
    KeyboardAvoidingView,
    Platform,
    StyleSheet,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { DropCard } from '@/components/drops/drop-card';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { CommentCard } from '@/components/ui/comment-card';
import { CommentInputBar } from '@/components/ui/comment-input-bar';
import { EmojiPickerModal } from '@/components/ui/emoji-picker-modal';
import { LoadingState } from '@/components/ui/loading-state';
import { NotFoundState } from '@/components/ui/not-found-state';
import { PaginatedList } from '@/components/ui/paginated-list';
import { ScreenHeader } from '@/components/ui/screen-header';
import { Spacing } from '@/constants/theme';
import { api } from '@/convex/_generated/api';
import { Id } from '@/convex/_generated/dataModel';
import { useBookmarkToggle } from '@/hooks/use-bookmark-mutation';
import { useReactionPicker } from '@/hooks/use-reaction-picker';
import { useCommentVote, useDropVote } from '@/hooks/use-vote-mutation';

const COMMENTS_PAGE_SIZE = 20;

export default function DropDetailScreen() {
    const { dropId } = useGlobalSearchParams<{ dropId: string }>();
    const router = useRouter();
    const [commentText, setCommentText] = useState('');
    const [isSendingComment, setIsSendingComment] = useState(false);

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

        const options = ['🗑 Delete drop', 'Cancel'];
        const cancel = options.length - 1;

        if (Platform.OS === 'ios') {
            ActionSheetIOS.showActionSheetWithOptions(
                { options, cancelButtonIndex: cancel, destructiveButtonIndex: 0 },
                async (idx) => {
                    if (idx === 0) {
                        await deleteDrop({ dropId: dropId as Id<'drops'> });
                        router.back();
                    }
                },
            );
        } else {
            Alert.alert('Drop actions', undefined, [
                {
                    text: '🗑 Delete drop',
                    style: 'destructive',
                    onPress: async () => {
                        await deleteDrop({ dropId: dropId as Id<'drops'> });
                        router.back();
                    },
                },
                { text: 'Cancel', style: 'cancel' },
            ]);
        }
    }, [drop, isMyDrop, dropId, deleteDrop, router]);

    const handleCommentDelete = useCallback((commentId: string, isOwn: boolean) => {
        if (!isOwn) return;
        if (Platform.OS === 'ios') {
            ActionSheetIOS.showActionSheetWithOptions(
                { options: ['🗑 Delete comment', 'Cancel'], cancelButtonIndex: 1, destructiveButtonIndex: 0 },
                async (idx) => {
                    if (idx === 0) await deleteDropComment({ commentId: commentId as Id<'dropComments'> });
                },
            );
        } else {
            Alert.alert('Comment actions', undefined, [
                {
                    text: '🗑 Delete comment',
                    style: 'destructive',
                    onPress: () => deleteDropComment({ commentId: commentId as Id<'dropComments'> }),
                },
                { text: 'Cancel', style: 'cancel' },
            ]);
        }
    }, [deleteDropComment]);

    if (drop === undefined) {
        return <LoadingState />;
    }

    if (drop === null) {
        return <NotFoundState message="Drop not found." />;
    }

    return (
        <ThemedView style={styles.container}>
            <SafeAreaView style={styles.safeArea} edges={[]}>
                <ScreenHeader
                    title="Drop 🎁"
                    onBack={() => router.back()}
                    rightIcon={isMyDrop ? MoreHorizontal : undefined}
                    onRightPress={isMyDrop ? handleMorePress : undefined}
                />
                <KeyboardAvoidingView
                    behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                    style={styles.flex}
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

                                <View style={styles.commentsTitleRow}>
                                    <ThemedText type="bodyBold" selectable>
                                        Comments
                                    </ThemedText>
                                    <ThemedText type="caption" themeColor="textSecondary" selectable>
                                        {drop.commentCount === 1 ? '1 comment' : `${drop.commentCount} comments`}
                                    </ThemedText>
                                </View>
                            </View>
                        }
                        ListEmptyComponent={
                            <View style={styles.emptyComments}>
                                <ThemedText type="small" themeColor="textSecondary" selectable>
                                    No comments yet. Start the conversation.
                                </ThemedText>
                            </View>
                        }
                        renderItem={({ item }) => (
                            <CommentCard
                                avatarUrl={item.avatarUrl}
                                nickname={item.nickname}
                                content={item.content}
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
                    />

                    <CommentInputBar
                        value={commentText}
                        onChangeText={setCommentText}
                        onSubmit={handleSubmitComment}
                        sending={isSendingComment}
                        avatarUrl={(currentUser as any)?.avatarUrl}
                        fallbackText={(currentUser as any)?.nickname ?? 'Me'}
                    />

                    <EmojiPickerModal {...reactionPicker.pickerProps} />
                </KeyboardAvoidingView>
            </SafeAreaView>
        </ThemedView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    safeArea: { flex: 1 },
    flex: { flex: 1 },
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
        paddingBottom: Spacing.xs,
    },
    listContent: {
        paddingBottom: Spacing.xxxl,
    },
    emptyComments: {
        padding: Spacing.xxl,
        alignItems: 'center',
    },
});
