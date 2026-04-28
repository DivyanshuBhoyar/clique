import { useMutation, usePaginatedQuery, useQuery } from 'convex/react';
import { useLocalSearchParams, useNavigation, useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, Keyboard, KeyboardAvoidingView, Platform, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { MessageActions } from '@/components/chat/message-actions';
import { ChannelSwitcher } from '@/components/chat/channel-switcher';
import { EphemeralCountdown } from '@/components/chat/ephemeral-countdown';
import { MessageInput } from '@/components/chat/message-input';
import { MessageItem } from '@/components/chat/message-item';
import { TypingIndicator } from '@/components/chat/typing-indicator';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useAutoScroll } from '@/hooks/use-auto-scroll';
import { useTypingThrottle } from '@/hooks/use-typing-throttle';
import { formatDeleteIn } from '@/utils/time';
import { api } from '@/convex/_generated/api';
import { Id } from '@/convex/_generated/dataModel';

const PAGE_SIZE = 50;

export default function ChannelChatScreen() {
    const { id: squadId, channelId } = useLocalSearchParams<{ id: string; channelId: string }>();
    const navigation = useNavigation();
    const router = useRouter();
    const flatListRef = useRef<FlatList>(null);
    const theme = useTheme();

    const sendMessage = useMutation(api.message.sendMessage);
    const deleteMessage = useMutation(api.message.deleteMessage);
    const toggleReaction = useMutation(api.reaction.toggleReaction);
    const markChannelRead = useMutation(api.channel.markChannelRead);

    const currentUser = useQuery(api.users.current);
    const channels = useQuery(
        api.channel.getChannels,
        squadId ? { squadId: squadId as Id<"squads"> } : "skip"
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
    const isEphemeral = channelExpiry !== null;
    const isExpired = channelExpiry?.isExpired ?? false;

    const [selectedMessage, setSelectedMessage] = useState<{ id: string; isOwn: boolean } | null>(null);
    const [showSwitcher, setShowSwitcher] = useState(false);

    const handleTyping = useTypingThrottle(
        squadId as Id<"squads"> | undefined,
        channelId as Id<"channels"> | undefined
    );
    useAutoScroll(flatListRef, messages?.length ?? 0);

    useEffect(() => {
        if (channels && channelId) {
            const channel = channels.find(c => c._id === channelId);
            if (channel) {
                navigation.setOptions({
                    headerTitle: () => (
                        <Pressable onPress={() => setShowSwitcher(true)}>
                            <ThemedText style={{ fontSize: 17, fontWeight: '600', color: theme.text }}>
                                {channel.name} ▾
                            </ThemedText>
                        </Pressable>
                    ),
                });
            }
        }
    }, [channels, channelId, navigation, theme]);

    useEffect(() => {
        if (channelId) {
            markChannelRead({ channelId: channelId as Id<"channels"> });
        }
    }, [channelId]);

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

    if (messages === undefined) {
        return (
            <SafeAreaView style={[styles.loading, { backgroundColor: theme.background }]}>
                <ActivityIndicator size="large" color={theme.accent} />
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                style={styles.inner}
            >
                <ThemedView style={styles.inner}>
                    {messages.length === 0 ? (
                        <View style={styles.empty}>
                            <ThemedText type="small" themeColor="textSecondary">No messages yet. Say hi!</ThemedText>
                        </View>
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
                                        deleted={item.deleted}
                                        isOwnMessage={item.userId === currentUser?._id}
                                        reactions={item.reactions}
                                        currentUserId={currentUser?._id}
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
                                    <ActivityIndicator size="small" color={theme.accent} style={styles.loadingMore} />
                                ) : null}
                            />
                        </Pressable>
                    )}

                    <TypingIndicator typingUsers={typingUsers ?? []} currentUserId={currentUser?._id} />

                    {isEphemeral && isExpired ? (
                        <View style={[styles.expiredBanner, { borderTopColor: theme.outlineLight }]}>
                            <ThemedText type="small" style={{ color: theme.error, fontWeight: '600' }}>
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
                        />
                    )}

                    {isEphemeral && !isExpired && channelExpiry?.expiresAt && (
                        <EphemeralCountdown expiresAt={channelExpiry.expiresAt} />
                    )}

                    <MessageActions
                        visible={selectedMessage !== null}
                        isOwnMessage={selectedMessage?.isOwn ?? false}
                        onClose={() => setSelectedMessage(null)}
                        onDelete={handleDelete}
                        onReact={handleReact}
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
    loading: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    inner: { flex: 1 },
    empty: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    listContent: { paddingVertical: Spacing.sm },
    loadingMore: { paddingVertical: Spacing.lg },
    expiredBanner: {
        paddingVertical: Spacing.lg,
        paddingHorizontal: Spacing.lg,
        alignItems: 'center',
        borderTopWidth: 1.5,
    },
});
