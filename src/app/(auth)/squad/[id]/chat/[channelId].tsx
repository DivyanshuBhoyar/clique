import { useMutation, usePaginatedQuery, useQuery } from 'convex/react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { FlatList, Keyboard, KeyboardAvoidingView, Platform, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ChannelSwitcher } from '@/components/chat/channel-switcher';
import { ChatHeader } from '@/components/chat/chat-header';
import { EphemeralCountdown } from '@/components/chat/ephemeral-countdown';
import { MessageActions } from '@/components/chat/message-actions';
import { MessageInput } from '@/components/chat/message-input';
import { MessageItem } from '@/components/chat/message-item';
import { NewMessageBubble, NewMessageBubbleChannel } from '@/components/chat/new-message-bubble';
import { TypingIndicator } from '@/components/chat/typing-indicator';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { EmojiPickerModal } from '@/components/ui/emoji-picker-modal';
import { EmptyState } from '@/components/ui/empty-state';
import { LoadingState } from '@/components/ui/loading-state';
import { Spacing, Weight } from '@/constants/theme';
import { api } from '@/convex/_generated/api';
import { Id } from '@/convex/_generated/dataModel';
import { useAutoScroll } from '@/hooks/use-auto-scroll';
import { useTheme } from '@/hooks/use-theme';
import { useTypingThrottle } from '@/hooks/use-typing-throttle';
import { formatDeleteIn } from '@/utils/time';

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
    const isExpired = channelExpiry?.isExpired ?? false;
    const currentChannel = channels?.find(c => c._id === channelId);
    const onlineCount = presence?.filter((p) => p.isOnline).length ?? 0;

    const [selectedMessage, setSelectedMessage] = useState<{ id: string; isOwn: boolean } | null>(null);
    const [showSwitcher, setShowSwitcher] = useState(false);
    const [pickerMessageId, setPickerMessageId] = useState<string | null>(null);
    const [newMessageBubble, setNewMessageBubble] = useState<NewMessageBubbleChannel | null>(null);
    const [extraBubbleChannelCount, setExtraBubbleChannelCount] = useState(0);
    const unreadSnapshotRef = useRef<{
        activeChannelId: string;
        channels: Map<string, { unreadCount: number; lastMessageAt: number }>;
    } | null>(null);
    const bubbleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const handleTyping = useTypingThrottle(
        squadId as Id<"squads"> | undefined,
        channelId as Id<"channels"> | undefined
    );
    useAutoScroll(flatListRef, messages?.length ?? 0);

    useEffect(() => {
        if (channelId) {
            markChannelRead({ channelId: channelId as Id<"channels"> });
        }
    }, [channelId, markChannelRead]);

    useEffect(() => {
        setNewMessageBubble(null);
        setExtraBubbleChannelCount(0);
        unreadSnapshotRef.current = null;
        if (bubbleTimerRef.current) {
            clearTimeout(bubbleTimerRef.current);
            bubbleTimerRef.current = null;
        }
    }, [channelId]);

    useEffect(() => {
        return () => {
            if (bubbleTimerRef.current) clearTimeout(bubbleTimerRef.current);
        };
    }, []);

    useEffect(() => {
        if (!otherUnreadSummary) return;
        if (otherUnreadSummary.activeChannelId !== channelId) return;

        const nextSnapshot = new Map(
            otherUnreadSummary.channels.map((channel) => [
                channel.channelId,
                { unreadCount: channel.unreadCount, lastMessageAt: channel.lastMessageAt },
            ])
        );

        const previousSnapshot = unreadSnapshotRef.current;
        unreadSnapshotRef.current = {
            activeChannelId: channelId,
            channels: nextSnapshot,
        };

        if (!previousSnapshot || previousSnapshot.activeChannelId !== channelId) return;

        const changedChannels = otherUnreadSummary.channels.filter((channel) => {
            const previous = previousSnapshot.channels.get(channel.channelId);
            if (!previous) return channel.unreadCount > 0;
            return channel.lastMessageAt > previous.lastMessageAt || channel.unreadCount > previous.unreadCount;
        });

        if (changedChannels.length === 0) return;

        const latestChannel = [...changedChannels].sort((a, b) => b.lastMessageAt - a.lastMessageAt)[0];
        const extraCount = otherUnreadSummary.channels.filter(
            (channel) => channel.channelId !== latestChannel.channelId
        ).length;

        setNewMessageBubble(latestChannel);
        setExtraBubbleChannelCount(extraCount);

        if (bubbleTimerRef.current) clearTimeout(bubbleTimerRef.current);
        bubbleTimerRef.current = setTimeout(() => {
            setNewMessageBubble(null);
            setExtraBubbleChannelCount(0);
            bubbleTimerRef.current = null;
        }, 4000);
    }, [channelId, otherUnreadSummary]);

    useEffect(() => {
        if (!squadId) return;
        updatePresence({ squadId: squadId as Id<"squads"> });
        const interval = setInterval(() => {
            updatePresence({ squadId: squadId as Id<"squads"> });
        }, 20000);
        return () => clearInterval(interval);
    }, [squadId, updatePresence]);

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
                channel={newMessageBubble}
                extraChannelCount={extraBubbleChannelCount}
                onDismiss={() => {
                    setNewMessageBubble(null);
                    setExtraBubbleChannelCount(0);
                    if (bubbleTimerRef.current) {
                        clearTimeout(bubbleTimerRef.current);
                        bubbleTimerRef.current = null;
                    }
                }}
                onPress={(targetChannelId) => {
                    setNewMessageBubble(null);
                    setExtraBubbleChannelCount(0);
                    if (bubbleTimerRef.current) {
                        clearTimeout(bubbleTimerRef.current);
                        bubbleTimerRef.current = null;
                    }
                    router.replace(`/squad/${squadId}/chat/${targetChannelId}`);
                }}
            />

            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                style={styles.inner}
            >
                <ThemedView style={styles.inner}>
                    {messages.length === 0 ? (
                        <EmptyState
                            emoji="👋"
                            title="No messages yet"
                            subtitle="Be the first to say something!"
                        />
                    ) : (
                        <Pressable style={styles.inner} onPress={Keyboard.dismiss}>
                            <FlatList
                                ref={flatListRef}
                                data={messages}
                                keyExtractor={(item) => item._id}
                                renderItem={({ item }) => (
                                    <MessageItem
                                        messageId={item._id}
                                        nickname={item.nickname}
                                        avatarUrl={item.avatarUrl}
                                        content={item.content}
                                        createdAt={item.createdAt}
                                        editedAt={item.editedAt}
                                        deleted={item.deleted}
                                        isOwnMessage={item.userId === currentUser?._id}
                                        reactions={item.reactions}
                                        currentUserId={currentUser?._id}
                                        imageUrl={item.imageUrl}
                                        onToggleReaction={handleToggleReaction}
                                        onLongPress={() => setSelectedMessage({
                                            id: item._id,
                                            isOwn: item.userId === currentUser?._id,
                                        })}
                                    />
                                )}
                                inverted
                                initialNumToRender={15}
                                maxToRenderPerBatch={10}
                                windowSize={10}
                                contentContainerStyle={styles.listContent}
                                keyboardShouldPersistTaps="handled"
                                onEndReached={handleEndReached}
                                onEndReachedThreshold={0.5}
                                ListFooterComponent={loadingMore ? (
                                    <ThemedText />
                                ) : null}
                            />
                        </Pressable>
                    )}

                    <TypingIndicator typingUsers={typingUsers ?? []} currentUserId={currentUser?._id} />

                    {isEphemeral && isExpired ? (
                        <View style={[styles.expiredBanner, { borderTopColor: theme.outlineLight }]}>
                            <ThemedText type="small" style={{ color: theme.error, fontWeight: Weight.semibold }}>
                                This room has expired
                            </ThemedText>
                            {channelExpiry?.deleteAt && (
                                <ThemedText type="caption" themeColor="textSecondary">
                                    Deletes in {formatDeleteIn(channelExpiry.deleteAt - Date.now())}
                                </ThemedText>
                            )}
                        </View>
                    ) : (
                        <MessageInput
                            onTyping={handleTyping}
                            onSend={async (content) => {
                                await sendMessage({
                                    squadId: squadId as Id<"squads">,
                                    channelId: channelId as Id<"channels">,
                                    content,
                                });
                            }}
                            onSendImage={async (storageId, caption) => {
                                await sendImageMessage({
                                    squadId: squadId as Id<"squads">,
                                    channelId: channelId as Id<"channels">,
                                    storageId,
                                    content: caption,
                                });
                            }}
                        />
                    )}

                    {isEphemeral && !isExpired && channelExpiry?.expiresAt && (
                        <EphemeralCountdown expiresAt={channelExpiry.expiresAt} />
                    )}

                    <MessageActions
                        visible={selectedMessage !== null}
                        isOwnMessage={selectedMessage?.isOwn ?? false}
                        isBookmarked={selectedMessage ? (messages?.find((m: any) => m._id === selectedMessage.id) as any)?.isBookmarked : false}
                        onClose={() => setSelectedMessage(null)}
                        onDelete={handleDelete}
                        onReact={handleReact}
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
    listContent: { paddingVertical: Spacing.sm },
    expiredBanner: {
        paddingVertical: Spacing.lg,
        paddingHorizontal: Spacing.lg,
        alignItems: 'center',
        borderTopWidth: 1.5,
    },
});
