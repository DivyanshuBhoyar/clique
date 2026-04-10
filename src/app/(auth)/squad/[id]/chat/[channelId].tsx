import { useMutation, usePaginatedQuery, useQuery } from 'convex/react';
import { useLocalSearchParams, useNavigation } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, Keyboard, KeyboardAvoidingView, Platform, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { MessageActions } from '@/components/chat/message-actions';
import { MessageInput } from '@/components/chat/message-input';
import { MessageItem } from '@/components/chat/message-item';
import { TypingIndicator } from '@/components/chat/typing-indicator';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { api } from '@/convex/_generated/api';
import { Id } from '@/convex/_generated/dataModel';

const PAGE_SIZE = 50;

export default function ChannelChatScreen() {
    const { id: squadId, channelId } = useLocalSearchParams<{ id: string; channelId: string }>();
    const navigation = useNavigation();
    const flatListRef = useRef<FlatList>(null);

    const sendMessage = useMutation(api.message.sendMessage);
    const deleteMessage = useMutation(api.message.deleteMessage);
    const toggleReaction = useMutation(api.reaction.toggleReaction);
    const setTyping = useMutation(api.typing.setTyping);
    const currentUser = useQuery(api.users.current);

    // Selected message for action sheet
    const [selectedMessage, setSelectedMessage] = useState<{
        id: string;
        isOwn: boolean;
    } | null>(null);

    const typingUsers = useQuery(
        api.typing.getTypingUsers,
        squadId && channelId
            ? { channelId: channelId as Id<"channels">, squadId: squadId as Id<"squads"> }
            : "skip"
    );

    // Typing throttle: 2s
    const lastTypingAt = useRef(0);
    const handleTyping = useCallback(() => {
        const now = Date.now();
        if (now - lastTypingAt.current > 2000) {
            lastTypingAt.current = now;
            setTyping({
                squadId: squadId as Id<"squads">,
                channelId: channelId as Id<"channels">,
            });
        }
    }, [setTyping, squadId, channelId]);

    // Paginated messages — Convex handles cursors, accumulation, and real-time
    const {
        results: messages,
        loadMore,
        status,
    } = usePaginatedQuery(
        api.message.getMessages,
        channelId ? { channelId: channelId as Id<"channels"> } : "skip",
        { initialNumItems: PAGE_SIZE }
    );

    const loadingMore = status === "LoadingMore";
    const canLoadMore = status === "CanLoadMore";

    // for header name
    const channels = useQuery(
        api.channel.getChannels,
        squadId ? { squadId: squadId as Id<"squads"> } : "skip"
    );

    useEffect(() => {
        if (channels && channelId) {
            const channel = channels.find(c => c._id === channelId);
            if (channel) {
                navigation.setOptions({ headerTitle: channel.name });
            }
        }
    }, [channels, channelId, navigation]);

    // Auto-scroll when new messages arrive (not when loading older)
    const prevCount = useRef(0);
    useEffect(() => {
        if (messages.length > prevCount.current) {
            flatListRef.current?.scrollToOffset({ offset: 0, animated: true });
        }
        prevCount.current = messages.length;
    }, [messages.length]);

    // Load older messages when scrolled to top (end of inverted list)
    const handleEndReached = useCallback(() => {
        if (canLoadMore) {
            loadMore(PAGE_SIZE);
        }
    }, [canLoadMore, loadMore]);

    // Initial loading
    if (messages === undefined) {
        return (
            <SafeAreaView style={styles.loading}>
                <ActivityIndicator size="large" />
            </SafeAreaView>
        );
    }

    // Handlers for message actions
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

    // results come in desc order (newest first) — pass directly to inverted FlatList
    return (
        <SafeAreaView style={styles.container}>
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                style={styles.inner}
            >
                <ThemedView style={styles.inner}>
                    {messages.length === 0 ? (
                        <View style={styles.empty}>
                            <ThemedText themeColor="textSecondary">
                                No messages yet. Say hi!
                            </ThemedText>
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
                                    <ActivityIndicator size="small" style={styles.loadingMore} />
                                ) : null}
                            />
                        </Pressable>
                    )}
                    <TypingIndicator
                        typingUsers={typingUsers ?? []}
                        currentUserId={currentUser?._id}
                    />
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
                    <MessageActions
                        visible={selectedMessage !== null}
                        isOwnMessage={selectedMessage?.isOwn ?? false}
                        onClose={() => setSelectedMessage(null)}
                        onDelete={handleDelete}
                        onReact={handleReact}
                    />
                </ThemedView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    loading: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    inner: {
        flex: 1,
    },
    empty: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    listContent: {
        paddingVertical: Spacing.two,
    },
    loadingMore: {
        paddingVertical: Spacing.three,
    },
});
