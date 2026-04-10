import { useMutation, useQuery } from 'convex/react';
import { useLocalSearchParams, useNavigation } from 'expo-router';
import { useEffect, useRef } from 'react';
import { ActivityIndicator, FlatList, Keyboard, KeyboardAvoidingView, Platform, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { MessageInput } from '@/components/chat/message-input';
import { MessageItem } from '@/components/chat/message-item';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { api } from '@/convex/_generated/api';
import { Id } from '@/convex/_generated/dataModel';

export default function ChannelChatScreen() {
    const { id: squadId, channelId } = useLocalSearchParams<{ id: string; channelId: string }>();
    const navigation = useNavigation();
    const flatListRef = useRef<FlatList>(null);

    const sendMessage = useMutation(api.message.sendMessage);
    const currentUser = useQuery(api.users.current);

    const messagesResult = useQuery(
        api.message.getMessages,
        channelId ? { channelId: channelId as Id<"channels"> } : "skip"
    );

    // Fetch channels to get the current channel name for the header
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

    // Auto-scroll to bottom when new messages arrive
    // With inverted FlatList, offset 0 = bottom (newest messages)
    useEffect(() => {
        if (messagesResult?.messages.length) {
            flatListRef.current?.scrollToOffset({ offset: 0, animated: true });
        }
    }, [messagesResult?.messages.length]);

    if (messagesResult === undefined) {
        return (
            <SafeAreaView style={styles.loading}>
                <ActivityIndicator size="large" />
            </SafeAreaView>
        );
    }

    const messages = messagesResult.messages;

    // FlatList inverted: index 0 = bottom of screen
    // So reverse chronological: newest first so it sits at the bottom
    const invertedData = [...messages].reverse();

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
                                data={invertedData}
                                keyExtractor={(item) => item._id}
                                renderItem={({ item }) => (
                                    <MessageItem
                                        messageId={item._id}
                                        nickname={item.nickname}
                                        content={item.content}
                                        createdAt={item.createdAt}
                                        deleted={item.deleted}
                                        isOwnMessage={item.userId === currentUser?._id}
                                    />
                                )}
                                inverted
                                initialNumToRender={15}
                                maxToRenderPerBatch={10}
                                windowSize={10}
                                contentContainerStyle={styles.listContent}
                                keyboardShouldPersistTaps="handled"
                            />
                        </Pressable>
                    )}
                    <MessageInput
                        onSend={async (content) => {
                            await sendMessage({
                                squadId: squadId as Id<"squads">,
                                channelId: channelId as Id<"channels">,
                                content,
                            });
                        }}
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
});
