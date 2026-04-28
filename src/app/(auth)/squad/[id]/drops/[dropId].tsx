import { useMutation, usePaginatedQuery, useQuery } from 'convex/react';
import { useGlobalSearchParams } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, FlatList, KeyboardAvoidingView, Platform, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { DropCard } from '@/components/drops/drop-card';
import { VoteButtons } from '@/components/drops/vote-buttons';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { api } from '@/convex/_generated/api';
import { Id } from '@/convex/_generated/dataModel';
import { useTheme } from '@/hooks/use-theme';
import { Colors } from '@/constants/theme';
import { useDropVote, useCommentVote } from '@/hooks/use-vote-mutation';
import { formatRelativeTime } from '@/utils/time';

const COMMENTS_PAGE_SIZE = 20;

export default function DropDetailScreen() {
    const { id, dropId } = useGlobalSearchParams<{ id: string; dropId: string }>();
    const squadId = (typeof id === 'string' ? id : undefined) as Id<"squads"> | undefined;
    const theme = useTheme();

    const currentUser = useQuery(api.users.current);
    const toggleReaction = useMutation(api.drops.toggleDropReaction);
    const addComment = useMutation(api.drops.addDropComment);
    const dropVote = useDropVote();
    const commentVote = useCommentVote();

    const drop = useQuery(
        api.drops.getDrop,
        dropId ? { dropId: dropId as Id<"drops"> } : "skip",
    );

    const {
        results: comments,
        loadMore,
        status,
    } = usePaginatedQuery(
        api.drops.getDropComments,
        dropId ? { dropId: dropId as Id<"drops"> } : "skip",
        { initialNumItems: COMMENTS_PAGE_SIZE },
    );

    const [commentText, setCommentText] = useState('');
    const [sending, setSending] = useState(false);

    const canLoadMore = status === "CanLoadMore";
    const loadingMore = status === "LoadingMore";

    const handleToggleReaction = useCallback(
        async (dId: string, emoji: string) => {
            await toggleReaction({
                dropId: dId as Id<"drops">,
                emoji,
            });
        },
        [toggleReaction],
    );

    const handleDropVote = useCallback(
        (dId: string, value: "up" | "down") => {
            dropVote({ dropId: dId as Id<"drops">, value });
        },
        [dropVote],
    );

    const handleCommentVote = useCallback(
        (commentId: string, value: "up" | "down") => {
            commentVote({ commentId: commentId as Id<"dropComments">, value });
        },
        [commentVote],
    );

    const handleSendComment = async () => {
        const trimmed = commentText.trim();
        if (!trimmed || sending || !dropId) return;

        setSending(true);
        try {
            await addComment({
                dropId: dropId as Id<"drops">,
                content: trimmed,
            });
            setCommentText('');
        } finally {
            setSending(false);
        }
    };

    const handleEndReached = useCallback(() => {
        if (canLoadMore) {
            loadMore(COMMENTS_PAGE_SIZE);
        }
    }, [canLoadMore, loadMore]);

    if (drop === undefined) {
        return (
            <SafeAreaView style={[styles.loading, { backgroundColor: theme.background }]}>
                <ActivityIndicator size="large" color={theme.accent} />
            </SafeAreaView>
        );
    }

    if (drop === null) {
        return (
            <SafeAreaView style={[styles.loading, { backgroundColor: theme.background }]}>
                <ThemedText>Drop not found.</ThemedText>
            </SafeAreaView>
        );
    }

    return (
        <ThemedView style={styles.container}>
            <SafeAreaView style={styles.safeArea} edges={['bottom']}>
                <KeyboardAvoidingView
                    behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                    style={styles.inner}
                >
                    <FlatList
                        data={comments}
                        keyExtractor={(item) => item._id}
                        ListHeaderComponent={
                            <View style={styles.dropCardWrap}>
                                <DropCard
                                    dropId={drop._id}
                                    category={drop.category}
                                    nickname={drop.nickname}
                                    content={drop.content}
                                    createdAt={drop.createdAt}
                                    commentCount={-1}
                                    reactions={drop.reactions}
                                    currentUserId={currentUser?._id}
                                    onToggleReaction={handleToggleReaction}
                                    upvotes={drop.upvotes}
                                    downvotes={drop.downvotes}
                                    userVote={drop.userVote}
                                    onVote={handleDropVote}
                                />
                                <ThemedText style={styles.commentsHeading}>
                                    Comments
                                </ThemedText>
                            </View>
                        }
                        renderItem={({ item }) => (
                            <View style={[styles.commentItem, { borderBottomColor: theme.outlineLight }]}>
                                <ThemedText type="smallBold">{item.nickname}</ThemedText>
                                <ThemedText style={styles.commentContent}>{item.content}</ThemedText>
                                <View style={styles.commentFooter}>
                                    <ThemedText type="small" themeColor="textSecondary">
                                        {formatRelativeTime(item.createdAt)}
                                    </ThemedText>
                                    <VoteButtons
                                        upvotes={item.upvotes}
                                        downvotes={item.downvotes}
                                        userVote={item.userVote}
                                        onVote={(value) => handleCommentVote(item._id, value)}
                                    />
                                </View>
                            </View>
                        )}
                        initialNumToRender={15}
                        maxToRenderPerBatch={10}
                        windowSize={10}
                        contentContainerStyle={styles.listContent}
                        keyboardShouldPersistTaps="handled"
                        onEndReached={handleEndReached}
                        onEndReachedThreshold={0.5}
                        ListFooterComponent={loadingMore ? (
                            <ActivityIndicator size="small" style={styles.loadingMore} />
                        ) : null}
                    />

                    <View style={[styles.inputRow, { borderColor: theme.textSecondary }]}>
                        <TextInput
                            value={commentText}
                            onChangeText={setCommentText}
                            placeholder="Add a comment..."
                            placeholderTextColor={theme.textSecondary}
                            style={[styles.input, { color: theme.text }]}
                            returnKeyType="send"
                            onSubmitEditing={handleSendComment}
                        />
                        <Pressable
                            onPress={handleSendComment}
                            disabled={!commentText.trim() || sending}
                            style={[styles.sendBtn, (!commentText.trim() || sending) && styles.sendDisabled]}
                        >
                            <ThemedText style={styles.sendText}>
                                {sending ? '...' : 'Send'}
                            </ThemedText>
                        </Pressable>
                    </View>
                </KeyboardAvoidingView>
            </SafeAreaView>
        </ThemedView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    safeArea: {
        flex: 1,
    },
    inner: {
        flex: 1,
    },
    loading: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    dropCardWrap: {
        paddingHorizontal: Spacing.three,
        paddingTop: Spacing.three,
    },
    commentsHeading: {
        fontSize: 14,
        fontWeight: '700',
        letterSpacing: 0.5,
        marginTop: Spacing.two,
        marginBottom: Spacing.three,
    },
    listContent: {
        paddingHorizontal: Spacing.three,
        paddingBottom: Spacing.three,
    },
    commentItem: {
        paddingVertical: Spacing.two,
        borderBottomWidth: 1,
    },
    commentContent: {
        fontSize: 15,
        lineHeight: 22,
        marginTop: 2,
        marginBottom: 2,
    },
    commentFooter: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: 2,
    },
    loadingMore: {
        paddingVertical: Spacing.three,
    },
    inputRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: Spacing.two,
        paddingVertical: Spacing.one,
        borderTopWidth: 1,
    },
    input: {
        flex: 1,
        minHeight: 40,
        paddingHorizontal: Spacing.two,
        fontSize: 16,
    },
    sendBtn: {
        paddingHorizontal: Spacing.three,
        paddingVertical: Spacing.one,
    },
    sendDisabled: {
        opacity: 0.4,
    },
    sendText: {
        fontSize: 16,
        fontWeight: '600',
    },
});
