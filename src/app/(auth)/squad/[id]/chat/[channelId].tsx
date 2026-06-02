import { useAction, useMutation, usePaginatedQuery, useQuery } from 'convex/react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { FlatList, KeyboardAvoidingView, Platform, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CallSheet } from '@/components/call/call-sheet';
import { ChannelMembersModal } from '@/components/chat/channel-members-modal';
import { ChannelSwitcher } from '@/components/chat/channel-switcher';
import { ChatComposer } from '@/components/chat/chat-composer';
import { ChatHeader } from '@/components/chat/chat-header';
import { ChatMessageList } from '@/components/chat/chat-message-list';
import { MessageActions } from '@/components/chat/message-actions';
import { NewMessageBubble } from '@/components/chat/new-message-bubble';
import { TypingIndicator } from '@/components/chat/typing-indicator';
import { ThemedView } from '@/components/themed-view';
import { EmojiPickerModal } from '@/components/ui/emoji-picker-modal';
import { LoadingState } from '@/components/ui/loading-state';
import { api } from '@/convex/_generated/api';
import { Id } from '@/convex/_generated/dataModel';
import { useAutoScroll } from '@/hooks/use-auto-scroll';
import { useChatPresenceHeartbeat } from '@/hooks/use-chat-presence-heartbeat';
import { useChatReplyTarget } from '@/hooks/use-chat-reply-target';
import { useNotificationPresenceHeartbeat } from '@/hooks/use-notification-presence-heartbeat';
import { useOtherChannelUnreadBubble } from '@/hooks/use-other-channel-unread-bubble';
import { useTheme } from '@/hooks/use-theme';
import { useTypingThrottle } from '@/hooks/use-typing-throttle';

const PAGE_SIZE = 50;

export default function ChannelChatScreen() {
    const { id: squadId, channelId } = useLocalSearchParams<{ id: string; channelId: string }>();
    const router = useRouter();
    const flatListRef = useRef<FlatList>(null);
    const theme = useTheme();

    const sendMessage = useMutation(api.message.sendMessage);
    const sendImageMessage = useMutation(api.message.sendImageMessage);
    const sendGifMessage = useMutation(api.message.sendGifMessage);
    const editMessage = useMutation(api.message.editMessage);
    const deleteMessage = useMutation(api.message.deleteMessage);
    const toggleReaction = useMutation(api.reaction.toggleReaction);
    const toggleBookmark = useMutation(api.bookmarks.toggleBookmark);
    const markChannelRead = useMutation(api.channel.markChannelRead);
    const updatePresence = useMutation(api.presence.updatePresence);
    const joinCallMutation = useMutation(api.calls.joinCall);
    const leaveCallMutation = useMutation(api.calls.leaveCall);
    const createCallRoom = useAction(api.calls.createCallRoom);

    const currentUser = useQuery(api.users.current);
    const channels = useQuery(
        api.channel.getChannels,
        squadId ? { squadId: squadId as Id<"squads"> } : "skip"
    );
    const otherUnreadSummary = useQuery(
        api.channel.getOtherChannelUnreadSummary,
        squadId && channelId
            ? { squadId: squadId as Id<"squads">, excludeChannelId: channelId as Id<"channels"> }
            : "skip"
    );
    const typingUsers = useQuery(
        api.typing.getTypingUsers,
        squadId && channelId
            ? { channelId: channelId as Id<"channels">, squadId: squadId as Id<"squads"> }
            : "skip"
    );
    const readReceipts = useQuery(
        api.channel.getChannelReadReceipts,
        channelId ? { channelId: channelId as Id<"channels"> } : "skip"
    );
    const activeCall = useQuery(
        api.calls.getActiveChannelCall,
        channelId ? { channelId: channelId as Id<"channels"> } : "skip"
    );

    const { results: messages, loadMore, status } = usePaginatedQuery(
        api.message.getMessages,
        channelId ? { channelId: channelId as Id<"channels"> } : "skip",
        { initialNumItems: PAGE_SIZE }
    );
    const loadingMore = status === "LoadingMore";
    const canLoadMore = status === "CanLoadMore";

    const channelExpiry = useQuery(
        api.channel.getChannelExpiry,
        channelId ? { channelId: channelId as Id<"channels"> } : "skip"
    );
    const presence = useQuery(
        api.presence.getPresence,
        squadId ? { squadId: squadId as Id<"squads"> } : "skip"
    );
    const isEphemeral = channelExpiry !== null;
    const currentChannel = channels?.find(c => c._id === channelId);
    const onlineCount = presence?.filter((p) => p.isOnline).length ?? 0;

    const {
        selectedMessage,
        replyTarget,
        selectMessage,
        startReplyToSelectedMessage,
        startReplyToMessage,
        clearReplyTarget,
        clearSelectedMessage,
    } = useChatReplyTarget(channelId);
    const [showSwitcher, setShowSwitcher] = useState(false);
    const [showMembers, setShowMembers] = useState(false);
    const [pickerMessageId, setPickerMessageId] = useState<string | null>(null);
    const [editTarget, setEditTarget] = useState<{ id: Id<'messages'>; content: string } | null>(null);
    const { bubbleChannel, extraChannelCount, dismissBubble } = useOtherChannelUnreadBubble(
        channelId,
        otherUnreadSummary,
    );

    const handleTyping = useTypingThrottle(
        squadId as Id<"squads"> | undefined,
        channelId as Id<"channels"> | undefined
    );
    const notificationPresenceContext = useMemo(() => (
        squadId && channelId
            ? {
                kind: 'channel' as const,
                squadId: squadId as Id<'squads'>,
                channelId: channelId as Id<'channels'>,
            }
            : null
    ), [channelId, squadId]);
    useAutoScroll(flatListRef, messages?.length ?? 0);
    useChatPresenceHeartbeat(squadId, updatePresence);
    useNotificationPresenceHeartbeat(notificationPresenceContext);

    useEffect(() => {
        if (channelId) {
            markChannelRead({ channelId: channelId as Id<"channels"> });
        }
    }, [channelId, markChannelRead]);

    const handleEndReached = useCallback(() => {
        if (canLoadMore) loadMore(PAGE_SIZE);
    }, [canLoadMore, loadMore]);

    const handleDelete = useCallback(async () => {
        if (selectedMessage) {
            await deleteMessage({ messageId: selectedMessage.id as Id<"messages"> });
        }
    }, [selectedMessage, deleteMessage]);

    const handleStartEdit = useCallback(() => {
        if (!selectedMessage || selectedMessage.deleted) return;
        setEditTarget({ id: selectedMessage.id as Id<'messages'>, content: selectedMessage.content });
        clearSelectedMessage();
    }, [clearSelectedMessage, selectedMessage]);

    const handleReact = useCallback(async (emoji: string) => {
        if (selectedMessage) {
            await toggleReaction({ messageId: selectedMessage.id as Id<"messages">, emoji });
        }
    }, [selectedMessage, toggleReaction]);

    const handleToggleReaction = useCallback(async (messageId: string, emoji: string) => {
        await toggleReaction({ messageId: messageId as Id<"messages">, emoji });
    }, [toggleReaction]);

    const handleBookmark = useCallback(async () => {
        if (!selectedMessage) return;
        await toggleBookmark({
            targetType: "message",
            messageId: selectedMessage.id as Id<"messages">,
        } as any);
    }, [selectedMessage, toggleBookmark]);

    const handleSendMessage = useCallback(async (content: string, parentMessageId?: Id<"messages">) => {
        await sendMessage({
            squadId: squadId as Id<"squads">,
            channelId: channelId as Id<"channels">,
            content,
            parentMessageId,
        });
        clearReplyTarget();
    }, [channelId, clearReplyTarget, sendMessage, squadId]);

    const handleSendImageMessage = useCallback(async (
        storageId: Id<"_storage">,
        caption?: string,
        parentMessageId?: Id<"messages">,
    ) => {
        await sendImageMessage({
            squadId: squadId as Id<"squads">,
            channelId: channelId as Id<"channels">,
            storageId,
            content: caption,
            parentMessageId,
        });
        clearReplyTarget();
    }, [channelId, clearReplyTarget, sendImageMessage, squadId]);

    const handleSendGifMessage = useCallback(async (
        gif: { id: string; url: string; previewUrl: string; title: string },
        parentMessageId?: Id<"messages">,
    ) => {
        await sendGifMessage({
            squadId: squadId as Id<"squads">,
            channelId: channelId as Id<"channels">,
            gifUrl: gif.url,
            gifPreviewUrl: gif.previewUrl,
            gifId: gif.id,
            gifTitle: gif.title || undefined,
            parentMessageId,
        });
        clearReplyTarget();
    }, [channelId, clearReplyTarget, sendGifMessage, squadId]);

    const handleEditMessage = useCallback(async (content: string) => {
        if (!editTarget) return;
        await editMessage({ messageId: editTarget.id, content });
        setEditTarget(null);
    }, [editMessage, editTarget]);

    if (messages === undefined) {
        return <LoadingState />;
    }

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={[]}>
            <ChatHeader
                channelName={currentChannel?.name ?? 'Chat'}
                channelEmoji={currentChannel?.emoji}
                onlineCount={onlineCount}
                otherUnreadCount={otherUnreadSummary?.totalUnread ?? 0}
                onTitlePress={() => setShowSwitcher(true)}
                onCallPress={async () => {
                    if (activeCall) return; // already active — user can join via sheet
                    await createCallRoom({ channelId: channelId as Id<"channels"> });
                }}
                onSettingsPress={
                    currentChannel?.type === 'private' && currentChannel.createdBy === currentUser?._id
                        ? () => setShowMembers(true)
                        : undefined
                }
            />

            <CallSheet
                callRoom={activeCall}
                currentUserId={currentUser?._id}
                displayName={currentUser?.name ?? 'Anonymous'}
                onJoin={(callRoomId) => joinCallMutation({ callRoomId, displayName: currentUser?.name ?? 'Anonymous' })}
                onLeave={(callRoomId) => leaveCallMutation({ callRoomId })}
            />

            <NewMessageBubble
                channel={bubbleChannel}
                extraChannelCount={extraChannelCount}
                onDismiss={dismissBubble}
                onPress={(targetChannelId) => {
                    dismissBubble();
                    router.replace(`/squad/${squadId}/chat/${targetChannelId}`);
                }}
            />

            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                style={styles.inner}
            >
                <ThemedView style={styles.inner}>
                    <ChatMessageList
                        messages={messages}
                        currentUserId={currentUser?._id}
                        readReceipts={readReceipts ?? []}
                        loadingMore={loadingMore}
                        flatListRef={flatListRef}
                        onEndReached={handleEndReached}
                        onToggleReaction={handleToggleReaction}
                        onSelectMessage={(message) => selectMessage(message, currentUser?._id)}
                        onReplyToMessage={startReplyToMessage}
                    />

                    <TypingIndicator typingUsers={typingUsers ?? []} currentUserId={currentUser?._id} />

                    <ChatComposer
                        isEphemeral={isEphemeral}
                        channelExpiry={channelExpiry}
                        replyTarget={replyTarget}
                        editTarget={editTarget}
                        onTyping={handleTyping}
                        onCancelReply={clearReplyTarget}
                        onCancelEdit={() => setEditTarget(null)}
                        onSend={handleSendMessage}
                        onSendImage={handleSendImageMessage}
                        onSendGif={handleSendGifMessage}
                        onEdit={handleEditMessage}
                    />

                    <MessageActions
                        visible={selectedMessage !== null}
                        isOwnMessage={selectedMessage?.isOwn ?? false}
                        isBookmarked={selectedMessage ? (messages?.find((m: any) => m._id === selectedMessage.id) as any)?.isBookmarked : false}
                        onClose={clearSelectedMessage}
                        onDelete={handleDelete}
                        onEdit={selectedMessage?.isOwn && !selectedMessage.deleted ? handleStartEdit : undefined}
                        onReact={handleReact}
                        onReply={startReplyToSelectedMessage}
                        onBookmark={handleBookmark}
                        onMoreReactions={() => {
                            setPickerMessageId(selectedMessage?.id ?? null);
                        }}
                    />

                    <EmojiPickerModal
                        visible={pickerMessageId !== null}
                        title="React to message"
                        onClose={() => setPickerMessageId(null)}
                        onSelect={async (emoji) => {
                            if (!pickerMessageId) return;
                            await toggleReaction({ messageId: pickerMessageId as Id<'messages'>, emoji });
                            setPickerMessageId(null);
                        }}
                    />

                    <ChannelSwitcher
                        visible={showSwitcher}
                        squadId={squadId as Id<"squads">}
                        currentChannelId={channelId ?? ""}
                        onClose={() => setShowSwitcher(false)}
                        onSwitch={(newChannelId) => {
                            router.replace(`/squad/${squadId}/chat/${newChannelId}`);
                        }}
                    />

                    {currentChannel?.type === 'private' && (
                        <ChannelMembersModal
                            visible={showMembers}
                            channelId={channelId as Id<"channels">}
                            squadId={squadId as Id<"squads">}
                            channelName={currentChannel.name}
                            isCreator={currentChannel.createdBy === currentUser?._id}
                            onClose={() => setShowMembers(false)}
                        />
                    )}
                </ThemedView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    inner: { flex: 1 },
});
