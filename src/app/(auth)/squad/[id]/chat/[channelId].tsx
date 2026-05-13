import { useMutation, usePaginatedQuery, useQuery } from 'convex/react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { FlatList, KeyboardAvoidingView, Platform, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

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
    const deleteMessage = useMutation(api.message.deleteMessage);
    const toggleReaction = useMutation(api.reaction.toggleReaction);
    const toggleBookmark = useMutation(api.bookmarks.toggleBookmark);
    const markChannelRead = useMutation(api.channel.markChannelRead);
    const updatePresence = useMutation(api.presence.updatePresence);

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
        clearReplyTarget,
        clearSelectedMessage,
    } = useChatReplyTarget(channelId);
    const [showSwitcher, setShowSwitcher] = useState(false);
    const [pickerMessageId, setPickerMessageId] = useState<string | null>(null);
    const { bubbleChannel, extraChannelCount, dismissBubble } = useOtherChannelUnreadBubble(
        channelId,
        otherUnreadSummary,
    );

    const handleTyping = useTypingThrottle(
        squadId as Id<"squads"> | undefined,
        channelId as Id<"channels"> | undefined
    );
    useAutoScroll(flatListRef, messages?.length ?? 0);
    useChatPresenceHeartbeat(squadId, updatePresence);

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

    if (messages === undefined) {
        return <LoadingState />;
    }

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={[]}>
            <ChatHeader
                channelName={currentChannel?.name ?? 'Chat'}
                onlineCount={onlineCount}
                otherUnreadCount={otherUnreadSummary?.totalUnread ?? 0}
                onTitlePress={() => setShowSwitcher(true)}
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
                        loadingMore={loadingMore}
                        flatListRef={flatListRef}
                        onEndReached={handleEndReached}
                        onToggleReaction={handleToggleReaction}
                        onSelectMessage={(message) => selectMessage(message, currentUser?._id)}
                    />

                    <TypingIndicator typingUsers={typingUsers ?? []} currentUserId={currentUser?._id} />

                    <ChatComposer
                        isEphemeral={isEphemeral}
                        channelExpiry={channelExpiry}
                        replyTarget={replyTarget}
                        onTyping={handleTyping}
                        onCancelReply={clearReplyTarget}
                        onSend={handleSendMessage}
                        onSendImage={handleSendImageMessage}
                    />

                    <MessageActions
                        visible={selectedMessage !== null}
                        isOwnMessage={selectedMessage?.isOwn ?? false}
                        isBookmarked={selectedMessage ? (messages?.find((m: any) => m._id === selectedMessage.id) as any)?.isBookmarked : false}
                        onClose={clearSelectedMessage}
                        onDelete={handleDelete}
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
                </ThemedView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    inner: { flex: 1 },
});
