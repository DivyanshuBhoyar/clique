import { useMutation, usePaginatedQuery, useQuery } from 'convex/react';
import { useGlobalSearchParams, useNavigation, useRouter } from 'expo-router';
import { useCallback, useLayoutEffect, useState } from 'react';
import { Image } from 'expo-image';
import { ActivityIndicator, Alert, FlatList, KeyboardAvoidingView, Modal, Platform, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { DropReactions } from '@/components/drops/drop-reactions';
import { ImageViewer } from '@/components/image-viewer';
import { MemoryItemCard } from '@/components/memories/memory-item-card';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Radius, Spacing } from '@/constants/theme';
import { api } from '@/convex/_generated/api';
import { Id } from '@/convex/_generated/dataModel';
import { useImageUpload } from '@/hooks/use-image-upload';
import { useTheme } from '@/hooks/use-theme';
import { formatRelativeTime } from '@/utils/time';

const COMMENTS_PAGE_SIZE = 20;

type AddDropType = 'reflection' | 'photo' | 'link';

export default function MemoryDetailScreen() {
    const { id, memoryId } = useGlobalSearchParams<{ id: string; memoryId: string }>();
    const squadId = (typeof id === 'string' ? id : undefined) as Id<"squads"> | undefined;
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

    // Add drop modal
    const [showAddDrop, setShowAddDrop] = useState(false);
    const [dropType, setDropType] = useState<AddDropType>('reflection');
    const [dropContent, setDropContent] = useState('');
    const [dropCaption, setDropCaption] = useState('');
    const [sendingDrop, setSendingDrop] = useState(false);
    const [photoStorageId, setPhotoStorageId] = useState<Id<"_storage"> | null>(null);
    const { previewUri: dropPreviewUri, uploading: uploadingPhoto, pickAndUpload: pickDropPhoto, reset: resetDropPhoto } = useImageUpload();

    // Item comments modal
    const [expandedItemId, setExpandedItemId] = useState<string | null>(null);
    const [itemCommentText, setItemCommentText] = useState('');
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

    const canLoadMore = status === "CanLoadMore";
    const loadingMore = status === "LoadingMore";

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

    const handleAddDrop = async () => {
        const trimmed = dropContent.trim();
        if (!trimmed || sendingDrop || !memoryId) return;
        setSendingDrop(true);
        try {
            await addMemoryItem({
                memoryId: memoryId as Id<"memories">,
                type: dropType,
                content: trimmed,
                caption: dropCaption.trim() || undefined,
                storageId: dropType === 'photo' && photoStorageId ? photoStorageId : undefined,
            });
            setDropContent('');
            setDropCaption('');
            setPhotoStorageId(null);
            resetDropPhoto();
            setShowAddDrop(false);
        } finally {
            setSendingDrop(false);
        }
    };

    const handleSendItemComment = async () => {
        const trimmed = itemCommentText.trim();
        if (!trimmed || sendingItemComment || !expandedItemId) return;
        setSendingItemComment(true);
        try {
            await addItemComment({ itemId: expandedItemId as Id<"memoryItems">, content: trimmed });
            setItemCommentText('');
        } finally {
            setSendingItemComment(false);
        }
    };

    const navigation = useNavigation();

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

    const handleEndReached = useCallback(() => {
        if (canLoadMore) loadMore(COMMENTS_PAGE_SIZE);
    }, [canLoadMore, loadMore]);

    const isOwner = detail?.isOwner ?? false;

    useLayoutEffect(() => {
        navigation.setOptions({
            headerRight: isOwner
                ? () => (
                    <Pressable onPress={handleDelete} hitSlop={12}>
                        <ThemedText type="small" style={{ color: theme.error, fontWeight: '600' }}>Delete</ThemedText>
                    </Pressable>
                )
                : undefined,
        });
    }, [navigation, isOwner, handleDelete]);

    if (detail === undefined) {
        return (
            <SafeAreaView style={[styles.loading, { backgroundColor: theme.background }]}>
                <ActivityIndicator size="large" color={theme.accent} />
            </SafeAreaView>
        );
    }

    if (detail === null) {
        return (
            <SafeAreaView style={[styles.loading, { backgroundColor: theme.background }]}>
                <ThemedText>Memory not found.</ThemedText>
            </SafeAreaView>
        );
    }

    const { memory, nickname, reactions, comments: initialComments, items, coverUrl } = detail;

    const isWall = memory.type === 'wall';
    const isEvent = memory.type === 'event';

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
                            <View style={styles.header}>
                                <ThemedText type="small" themeColor="textSecondary">
                                    by {nickname} · {formatRelativeTime(memory.createdAt)}
                                </ThemedText>

                                {isWall && (
                                    <ThemedText style={styles.wallText}>{memory.content}</ThemedText>
                                )}

                                {isEvent && memory.title && (
                                    <ThemedText style={styles.eventTitle}>{memory.title}</ThemedText>
                                )}

                                {isEvent && coverUrl && (
                                    <Pressable onPress={() => setCoverViewerVisible(true)}>
                                        <Image source={{ uri: coverUrl }} style={styles.detailCoverImage} contentFit="cover" />
                                    </Pressable>
                                )}

                                <DropReactions
                                    reactions={reactions}
                                    currentUserId={currentUser?._id}
                                    onToggle={handleToggleReaction}
                                />

                                {isEvent && (
                                    <View style={[styles.scrapbook, { borderTopColor: theme.outlineLight }]}>
                                        <View style={styles.scrapbookHeader}>
                                            <ThemedText style={styles.sectionTitle}>Scrapbook</ThemedText>
                                            <Pressable
                                                onPress={() => { setDropType('reflection'); setDropContent(''); setDropCaption(''); setPhotoStorageId(null); resetDropPhoto(); setShowAddDrop(true); }}
                                                style={[styles.addDropBtn, { borderColor: theme.accent, borderRadius: Radius.lg }]}
                                            >
                                                <ThemedText style={styles.addDropBtnText}>+ Drop</ThemedText>
                                            </Pressable>
                                        </View>

                                        {items.length === 0 ? (
                                            <ThemedText type="small" themeColor="textSecondary" style={styles.emptyItems}>
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
                                                        currentUserId={currentUser?._id}
                                                        onToggleReaction={(emoji) => handleToggleItemReaction(item._id, emoji)}
                                                    />
                                                    {item.commentCount > 0 && (
                                                        <Pressable
                                                            onPress={() => { setExpandedItemId(item._id); setItemCommentText(''); }}
                                                            style={styles.itemCommentLink}
                                                        >
                                                            <ThemedText type="small" themeColor="textSecondary">
                                                                View {item.commentCount} comment{item.commentCount !== 1 ? 's' : ''}
                                                            </ThemedText>
                                                        </Pressable>
                                                    )}
                                                </View>
                                            ))
                                        )}
                                    </View>
                                )}

                                <ThemedText style={styles.commentsHeading}>
                                    {isWall ? 'Comments' : 'Reflections'}
                                </ThemedText>
                            </View>
                        }
                        renderItem={({ item }) => (
                            <View style={[styles.commentItem, { borderBottomColor: theme.outlineLight }]}>
                                <ThemedText type="smallBold">{item.nickname}</ThemedText>
                                <ThemedText style={styles.commentContent}>{item.content}</ThemedText>
                                <ThemedText type="small" themeColor="textSecondary">
                                    {formatRelativeTime(item.createdAt)}
                                </ThemedText>
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
                            <ActivityIndicator size="small" color={theme.accent} style={styles.loadingMore} />
                        ) : null}
                    />

                    <View style={[styles.inputRow, { borderColor: theme.outlineLight }]}>
                        <TextInput
                            value={commentText}
                            onChangeText={setCommentText}
                            placeholder={isWall ? 'Add a comment...' : 'Add a reflection...'}
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

            {/* Add drop modal */}
            <Modal visible={showAddDrop} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowAddDrop(false)}>
                <ThemedView style={styles.modal}>
                    <SafeAreaView style={styles.modalSafe}>
                        <View style={[styles.modalHeader, { borderBottomColor: theme.outlineLight }]}>
                            <Pressable onPress={() => setShowAddDrop(false)}>
                                <ThemedText type="smallBold">Cancel</ThemedText>
                            </Pressable>
                            <ThemedText style={styles.modalTitle}>Add Drop</ThemedText>
                            <Pressable
                                onPress={handleAddDrop}
                                disabled={!dropContent.trim() || sendingDrop}
                            >
                                <ThemedText type="smallBold" style={(!dropContent.trim() || sendingDrop) && { opacity: 0.4 }}>
                                    {sendingDrop ? '...' : 'Add'}
                                </ThemedText>
                            </Pressable>
                        </View>

                        <View style={styles.dropTypeRow}>
                            {(['reflection', 'photo', 'link'] as const).map((t) => (
                                <Pressable
                                    key={t}
                                    onPress={() => setDropType(t)}
                                    style={[
                                        styles.dropTypeBtn,
                                        {
                                            backgroundColor: theme.surface,
                                            borderColor: theme.outlineLight,
                                        },
                                        dropType === t && {
                                            backgroundColor: theme.accent,
                                            borderColor: theme.accent,
                                        },
                                    ]}
                                >
                                    <ThemedText style={[
                                        styles.dropTypeText,
                                        dropType === t && { color: '#ffffff' },
                                    ]}>
                                        {t === 'reflection' ? 'Reflection' : t === 'photo' ? 'Photo' : 'Link'}
                                    </ThemedText>
                                </Pressable>
                            ))}
                        </View>

                        {dropType === 'photo' && (
                            <>
                                {dropPreviewUri ? (
                                    <View style={styles.dropPhotoPreviewWrap}>
                                        <Image source={{ uri: dropPreviewUri }} style={styles.dropPhotoPreview} contentFit="cover" />
                                        <Pressable onPress={() => { setPhotoStorageId(null); resetDropPhoto(); }} style={styles.removePhotoBtn}>
                                            <ThemedText style={styles.removePhotoText}>Remove</ThemedText>
                                        </Pressable>
                                    </View>
                                ) : (
                                    <Pressable
                                        onPress={async () => {
                                            const storageId = await pickDropPhoto();
                                            if (storageId) setPhotoStorageId(storageId);
                                        }}
                                        style={[styles.photoPickerBtn, { backgroundColor: theme.backgroundElement, borderColor: theme.outlineLight, borderRadius: Radius.md }]}
                                        disabled={uploadingPhoto}
                                    >
                                        <ThemedText themeColor="textSecondary">
                                            {uploadingPhoto ? 'Uploading...' : '+ Pick a photo'}
                                        </ThemedText>
                                    </Pressable>
                                )}
                            </>
                        )}

                        <TextInput
                            value={dropContent}
                            onChangeText={setDropContent}
                            placeholder={
                                dropType === 'reflection' ? 'What does this moment mean to you...'
                                : dropType === 'link' ? 'Paste a URL...'
                                : 'Photo description...'
                            }
                            placeholderTextColor={theme.textSecondary}
                            style={[styles.dropInput, { color: theme.text, borderColor: theme.outlineLight, backgroundColor: theme.surface, borderRadius: Radius.md }]}
                            multiline
                            autoFocus
                        />

                        {dropType === 'photo' && (
                            <TextInput
                                value={dropCaption}
                                onChangeText={setDropCaption}
                                placeholder="Caption (optional)"
                                placeholderTextColor={theme.textSecondary}
                                style={[styles.dropCaptionInput, { color: theme.text, borderColor: theme.outlineLight, backgroundColor: theme.surface, borderRadius: Radius.md }]}
                                maxLength={200}
                            />
                        )}
                    </SafeAreaView>
                </ThemedView>
            </Modal>

            {/* Item comments modal */}
            <Modal visible={expandedItemId !== null} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setExpandedItemId(null)}>
                <ThemedView style={styles.modal}>
                    <SafeAreaView style={styles.modalSafe}>
                        <View style={[styles.modalHeader, { borderBottomColor: theme.outlineLight }]}>
                            <Pressable onPress={() => setExpandedItemId(null)}>
                                <ThemedText type="smallBold">Close</ThemedText>
                            </Pressable>
                            <ThemedText style={styles.modalTitle}>Comments</ThemedText>
                            <View style={{ width: 50 }} />
                        </View>

                        <FlatList
                            data={itemComments}
                            keyExtractor={(c) => c._id}
                            renderItem={({ item }) => (
                                <View style={[styles.commentItem, { borderBottomColor: theme.outlineLight }]}>
                                    <ThemedText type="smallBold">{item.nickname}</ThemedText>
                                    <ThemedText style={styles.commentContent}>{item.content}</ThemedText>
                                    <ThemedText type="small" themeColor="textSecondary">
                                        {formatRelativeTime(item.createdAt)}
                                    </ThemedText>
                                </View>
                            )}
                            contentContainerStyle={styles.listContent}
                            onEndReached={() => {
                                if (itemCommentsStatus === "CanLoadMore") loadMoreItemComments(COMMENTS_PAGE_SIZE);
                            }}
                            onEndReachedThreshold={0.5}
                        />

                        <View style={[styles.inputRow, { borderColor: theme.outlineLight }]}>
                            <TextInput
                                value={itemCommentText}
                                onChangeText={setItemCommentText}
                                placeholder="Add a comment..."
                                placeholderTextColor={theme.textSecondary}
                                style={[styles.input, { color: theme.text }]}
                                returnKeyType="send"
                                onSubmitEditing={handleSendItemComment}
                            />
                            <Pressable
                                onPress={handleSendItemComment}
                                disabled={!itemCommentText.trim() || sendingItemComment}
                                style={[styles.sendBtn, (!itemCommentText.trim() || sendingItemComment) && styles.sendDisabled]}
                            >
                                <ThemedText style={styles.sendText}>
                                    {sendingItemComment ? '...' : 'Send'}
                                </ThemedText>
                            </Pressable>
                        </View>
                    </SafeAreaView>
                </ThemedView>
            </Modal>

            <ImageViewer
                visible={coverViewerVisible}
                uri={coverUrl ?? null}
                onClose={() => setCoverViewerVisible(false)}
            />
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
    header: {
        paddingHorizontal: Spacing.three,
        paddingTop: Spacing.three,
    },
    wallText: {
        fontSize: 17,
        lineHeight: 25,
        marginTop: Spacing.two,
        marginBottom: Spacing.two,
    },
    eventTitle: {
        fontSize: 20,
        fontWeight: '700',
        marginTop: Spacing.one,
        marginBottom: Spacing.two,
    },
    detailCoverImage: {
        height: 200,
        borderRadius: Radius.md,
        marginBottom: Spacing.two,
    },
    scrapbook: {
        marginTop: Spacing.three,
        paddingTop: Spacing.three,
        borderTopWidth: 1,
    },
    scrapbookHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: Spacing.two,
    },
    sectionTitle: {
        fontSize: 14,
        fontWeight: '700',
    },
    addDropBtn: {
        paddingHorizontal: 12,
        paddingVertical: 4,
        borderWidth: 1,
    },
    addDropBtnText: {
        fontSize: 12,
        fontWeight: '600',
    },
    emptyItems: {
        fontStyle: 'italic',
    },
    itemWrap: {
        marginBottom: Spacing.two,
    },
    itemCommentLink: {
        paddingLeft: Spacing.one,
        paddingTop: Spacing.one,
    },
    commentsHeading: {
        fontSize: 14,
        fontWeight: '700',
        marginTop: Spacing.three,
        marginBottom: Spacing.two,
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
    // Modal styles
    modal: {
        flex: 1,
    },
    modalSafe: {
        flex: 1,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: Spacing.three,
        paddingVertical: Spacing.two,
        borderBottomWidth: 1,
    },
    modalTitle: {
        fontSize: 16,
        fontWeight: '700',
    },
    dropTypeRow: {
        flexDirection: 'row',
        gap: 8,
        paddingHorizontal: Spacing.three,
        paddingVertical: Spacing.three,
    },
    dropTypeBtn: {
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 20,
        borderWidth: 2,
    },
    dropTypeText: {
        fontSize: 13,
        fontWeight: '600',
    },
    photoPlaceholderLarge: {
        height: 150,
        marginHorizontal: Spacing.three,
        borderRadius: Radius.md,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: Spacing.three,
    },
    photoPickerBtn: {
        height: 120,
        marginHorizontal: Spacing.three,
        borderWidth: 2,
        borderStyle: 'dashed',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: Spacing.three,
    },
    dropPhotoPreviewWrap: {
        marginHorizontal: Spacing.three,
        borderRadius: Radius.md,
        overflow: 'hidden',
        marginBottom: Spacing.three,
    },
    dropPhotoPreview: {
        height: 200,
        width: '100%',
        borderRadius: Radius.md,
    },
    removePhotoBtn: {
        position: 'absolute',
        top: 8,
        right: 8,
        backgroundColor: 'rgba(0,0,0,0.6)',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: Radius.lg,
    },
    removePhotoText: {
        color: '#fff',
        fontSize: 12,
        fontWeight: '600',
    },
    dropInput: {
        minHeight: 100,
        marginHorizontal: Spacing.three,
        paddingHorizontal: 12,
        paddingVertical: 10,
        fontSize: 16,
        lineHeight: 24,
        borderWidth: 2,
        textAlignVertical: 'top',
    },
    dropCaptionInput: {
        marginHorizontal: Spacing.three,
        marginTop: Spacing.two,
        paddingHorizontal: 12,
        paddingVertical: 10,
        fontSize: 15,
        borderWidth: 2,
    },
});
