import { CallSheet } from "@/components/call/call-sheet";
import { DmMessageActions } from "@/components/chat/dm-message-actions";
import { TypingIndicator } from "@/components/chat/typing-indicator";
import { DmComposer, DmReplyTarget } from "@/components/dm/dm-composer";
import { DmMessageItem } from "@/components/dm/dm-message-item";
import { DmScrollPill } from "@/components/dm/dm-scroll-pill";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { EmojiPickerModal } from "@/components/ui/emoji-picker-modal";
import { LoadingState } from "@/components/ui/loading-state";
import { ScreenHeader } from "@/components/ui/screen-header";
import { Radius, Spacing, Weight } from "@/constants/theme";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import {
    useDmConversationMessages,
    useDmIncomingMessages,
} from "@/hooks/use-dm-messages";
import { useDmSend } from "@/hooks/use-dm-send";
import { useDmTypingThrottle } from "@/hooks/use-dm-typing-throttle";
import { useNotificationPresenceHeartbeat } from "@/hooks/use-notification-presence-heartbeat";
import { useTheme } from "@/hooks/use-theme";
import { useToast } from "@/hooks/use-toast";
import { copyToClipboard } from "@/utils/clipboard";
import { backOrReplace } from "@/utils/navigation";
import { useAction, useMutation, useQuery } from "convex/react";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Phone } from "lucide-react-native";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
    FlatList,
    KeyboardAvoidingView,
    Platform,
    StyleSheet,
    View,
} from "react-native";

type DmMessageRecord = {
    messageId: string;
    senderId: string;
    text: string;
    status: string;
    serverTimestamp?: number;
    editedAt?: number | null;
    deletedAt?: number | null;
};

type DmListItem =
    | { type: "message"; id: string; message: DmMessageRecord }
    | { type: "day"; id: string; label: string };

export default function DmChatScreen() {
    const router = useRouter();
    const toast = useToast();
    const theme = useTheme();
    const { conversationId } = useLocalSearchParams<{ conversationId: string }>();
    const convId = conversationId as Id<"dmConversations">;

    const currentUser = useQuery(api.users.current);
    const conversations = useQuery(api.dm.listConversations);
    const conversation = conversations?.find((c) => c._id === convId);
    const headerName = conversation?.otherUserRealName ?? conversation?.otherUserName ?? "Message";
    const notificationPresenceContext = useMemo(() => ({
        kind: "dm" as const,
        conversationId: convId,
    }), [convId]);
    useNotificationPresenceHeartbeat(notificationPresenceContext);

    // Typing indicator
    const typingUsers = useQuery(api.dmTyping.getDmTypingUser, { conversationId: convId });
    const handleTyping = useDmTypingThrottle(conversationId);

    // DM reactions (unencrypted, live Convex subscription)
    const rawReactions = useQuery(api.dmReactions.forConversation, { conversationId: convId });
    const toggleDmReaction = useMutation(api.dmReactions.toggle);
    const joinCallMutation = useMutation(api.calls.joinCall);
    const leaveCallMutation = useMutation(api.calls.leaveCall);
    const touchCallParticipant = useMutation(api.calls.touchCallParticipant);
    const createCallRoom = useAction(api.calls.createCallRoom);
    const activeCall = useQuery(api.calls.getActiveDmCall, { dmConversationId: convId });
    const [pickerMessageId, setPickerMessageId] = useState<string | null>(null);

    // Group reactions by messageId for fast lookup in renderItem
    const reactionsByMessage = useMemo(() => {
        const map = new Map<string, { emoji: string; userId: string }[]>();
        for (const r of rawReactions ?? []) {
            const list = map.get(r.messageId) ?? [];
            list.push({ emoji: r.emoji, userId: r.userId });
            map.set(r.messageId, list);
        }
        return map;
    }, [rawReactions]);

    // Process incoming encrypted envelopes globally
    useDmIncomingMessages();

    // Local messages from SQLite
    const { messages, refresh, loadOlder, hasMore } = useDmConversationMessages(convId);
    const listItems = useMemo<DmListItem[]>(() => buildDmListItems(messages), [messages]);

    // Extracted hooks
    const { sendMessage, sendDelete, sending } = useDmSend({
        conversationId,
        otherUserId: conversation?.otherUserId,
        currentUserId: currentUser?._id,
        refresh,
    });

    // Scroll state
    const [isAtBottom, setIsAtBottom] = useState(true);
    const [hasNewBelow, setHasNewBelow] = useState(false);
    const flatListRef = useRef<FlatList>(null);
    const prevCountRef = useRef(messages.length);

    useEffect(() => {
        if (messages.length > prevCountRef.current) {
            if (isAtBottom) {
                flatListRef.current?.scrollToOffset({ offset: 0, animated: true });
            } else {
                setHasNewBelow(true);
            }
        }
        prevCountRef.current = messages.length;
    }, [messages.length, isAtBottom]);

    const scrollToBottom = useCallback(() => {
        flatListRef.current?.scrollToOffset({ offset: 0, animated: true });
        setHasNewBelow(false);
    }, []);

    // Message actions state
    const [selectedMsg, setSelectedMsg] = useState<any | null>(null);
    const [replyTarget, setReplyTarget] = useState<DmReplyTarget | null>(null);

    const handleCopy = useCallback(() => {
        if (selectedMsg) copyToClipboard(selectedMsg.text);
    }, [selectedMsg]);

    const handleReply = useCallback(() => {
        if (!selectedMsg || !conversation) return;
        const senderName = selectedMsg.senderId === currentUser?._id
            ? "You"
            : headerName;
        setReplyTarget({ messageId: selectedMsg.messageId, text: selectedMsg.text, senderName });
    }, [selectedMsg, currentUser, conversation, headerName]);

    const handleDelete = useCallback(async () => {
        if (!selectedMsg) return;
        try {
            await sendDelete(selectedMsg.messageId);
        } catch {
            toast.show("Failed to delete", "error");
        }
    }, [selectedMsg, sendDelete, toast]);

    const handleReact = useCallback(async (emoji: string) => {
        if (!selectedMsg) return;
        try {
            await toggleDmReaction({ conversationId: convId, messageId: selectedMsg.messageId, emoji });
        } catch {
            toast.show("Could not add reaction", "error");
        }
    }, [selectedMsg, convId, toggleDmReaction, toast]);

    const handlePickerReaction = useCallback(async (emoji: string) => {
        if (!pickerMessageId) return;
        try {
            await toggleDmReaction({ conversationId: convId, messageId: pickerMessageId, emoji });
        } catch {
            toast.show("Could not update reaction", "error");
        }
    }, [pickerMessageId, convId, toggleDmReaction, toast]);

    const handleSend = useCallback((text: string) => {
        sendMessage(text);
        setReplyTarget(null);
    }, [sendMessage]);

    // Loading / not found states
    if (!currentUser || conversations === undefined) {
        return <LoadingState message="Decrypting…" />;
    }
    if (!conversation) {
        return (
            <ThemedView style={styles.container} type="chatCanvas">
                <ScreenHeader title="Message" onBack={() => backOrReplace(router, "/(auth)/dm")} />
                <View style={styles.centerWrap}>
                    <ThemedText style={{ color: theme.chatTextMuted }}>Conversation not found</ThemedText>
                </View>
            </ThemedView>
        );
    }

    return (
        <ThemedView style={styles.container} type="chatCanvas">
            <ScreenHeader
                title={headerName}
                onBack={() => backOrReplace(router, "/(auth)/dm")}
                subtitle="🔒 end-to-end encrypted"
                rightIcon={Phone}
                onRightPress={async () => {
                    if (activeCall) return; // already active — user can join via sheet
                    await createCallRoom({ dmConversationId: convId });
                }}
            />

            <CallSheet
                callRoom={activeCall}
                currentUserId={currentUser?._id}
                displayName={currentUser?.name ?? "Anonymous"}
                onJoin={(callRoomId) => joinCallMutation({ callRoomId, displayName: currentUser?.name ?? "Anonymous" })}
                onLeave={(callRoomId) => leaveCallMutation({ callRoomId })}
                onHeartbeat={(callRoomId) => touchCallParticipant({ callRoomId })}
            />

            <KeyboardAvoidingView
                behavior={Platform.OS === "ios" ? "padding" : undefined}
                style={styles.flex}
            >
                <View style={styles.flex}>
                    <FlatList
                        ref={flatListRef}
                        data={listItems}
                        keyExtractor={(item) => item.id}
                        inverted
                        initialNumToRender={18}
                        maxToRenderPerBatch={10}
                        windowSize={10}
                        contentContainerStyle={styles.listContent}
                        contentInsetAdjustmentBehavior="automatic"
                        onEndReached={() => hasMore && loadOlder()}
                        onEndReachedThreshold={0.5}
                        onScroll={(e) => {
                            const atBottom = e.nativeEvent.contentOffset.y < 150;
                            setIsAtBottom(atBottom);
                            if (atBottom) setHasNewBelow(false);
                        }}
                        scrollEventThrottle={100}
                        renderItem={({ item }) => {
                            if (item.type === "day") {
                                return <DateSeparator label={item.label} />;
                            }

                            const message = item.message;
                            const msgReactions = reactionsByMessage.get(message.messageId) ?? [];
                            // Group by emoji with reacted flag for current user
                            const grouped = (() => {
                                const map = new Map<string, { count: number; reacted: boolean }>();
                                for (const r of msgReactions) {
                                    const e = map.get(r.emoji) ?? { count: 0, reacted: false };
                                    e.count++;
                                    if (r.userId === currentUser._id) e.reacted = true;
                                    map.set(r.emoji, e);
                                }
                                return [...map.entries()].map(([emoji, { count, reacted }]) => ({ emoji, count, reacted }));
                            })();

                            return (
                                <DmMessageItem
                                    message={message}
                                    isOwn={message.senderId === currentUser._id}
                                    otherUserAvatar={conversation.otherUserAvatar}
                                    otherUserName={conversation.otherUserName}
                                    reactions={grouped}
                                    onLongPress={() => setSelectedMsg(message)}
                                    onToggleReaction={(emoji) => toggleDmReaction({
                                        conversationId: convId,
                                        messageId: message.messageId,
                                        emoji,
                                    }).catch(() => toast.show("Could not update reaction", "error"))}
                                    onAddReaction={() => setPickerMessageId(message.messageId)}
                                />
                            );
                        }}
                        keyboardShouldPersistTaps="handled"
                    />

                    {listItems.length === 0 && (
                        <View style={styles.e2eeBanner} pointerEvents="none">
                            <ThemedText type="caption" style={[styles.e2eeText, { color: theme.chatTextMuted }]}>
                                🔒 Messages are end-to-end encrypted.{"\n"}
                                Only you and {conversation.otherUserName} can read them.
                            </ThemedText>
                        </View>
                    )}
                </View>

                <TypingIndicator typingUsers={typingUsers ?? []} currentUserId={currentUser._id} />

                <DmScrollPill visible={hasNewBelow} onPress={scrollToBottom} />

                <DmComposer
                    onSend={handleSend}
                    onTyping={handleTyping}
                    replyTarget={replyTarget}
                    onCancelReply={() => setReplyTarget(null)}
                    sending={sending}
                />
            </KeyboardAvoidingView>

            <DmMessageActions
                visible={!!selectedMsg}
                isOwnMessage={selectedMsg?.senderId === currentUser?._id}
                onClose={() => setSelectedMsg(null)}
                onCopy={handleCopy}
                onReply={handleReply}
                onReact={handleReact}
                onMoreReactions={() => setPickerMessageId(selectedMsg?.messageId ?? null)}
                onDelete={selectedMsg?.senderId === currentUser?._id ? handleDelete : undefined}
            />

            <EmojiPickerModal
                visible={pickerMessageId !== null}
                title="React to DM"
                onClose={() => setPickerMessageId(null)}
                onSelect={handlePickerReaction}
            />
        </ThemedView>
    );
}

function buildDmListItems(messages: DmMessageRecord[]): DmListItem[] {
    const items: DmListItem[] = [];

    for (let index = 0; index < messages.length; index += 1) {
        const message = messages[index];
        const timestamp = message.serverTimestamp ?? Date.now();
        const currentDay = dayKey(timestamp);
        const nextMessage = messages[index + 1];

        items.push({ type: "message", id: message.messageId, message });

        if (!nextMessage || dayKey(nextMessage.serverTimestamp ?? Date.now()) !== currentDay) {
            items.push({
                type: "day",
                id: `day-${currentDay}`,
                label: formatDayLabel(timestamp),
            });
        }
    }

    return items;
}

function dayKey(timestamp: number): string {
    const date = new Date(timestamp);
    return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
}

function formatDayLabel(timestamp: number): string {
    const date = new Date(timestamp);
    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(today.getDate() - 1);

    if (dayKey(timestamp) === dayKey(today.getTime())) return "Today";
    if (dayKey(timestamp) === dayKey(yesterday.getTime())) return "Yesterday";

    const diffDays = Math.floor((startOfDay(today).getTime() - startOfDay(date).getTime()) / 86_400_000);
    if (diffDays > 1 && diffDays < 7) {
        return date.toLocaleDateString([], { weekday: "long" });
    }

    return date.toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" });
}

function startOfDay(date: Date): Date {
    return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function DateSeparator({ label }: { label: string }) {
    const theme = useTheme();

    return (
        <View style={styles.dateSeparatorWrap}>
            <View style={[styles.dateSeparatorPill, { backgroundColor: theme.chatSurface, borderColor: theme.chatBorder }]}>
                <ThemedText type="caption" style={[styles.dateSeparatorText, { color: theme.chatTextMuted }]}>
                    {label}
                </ThemedText>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    flex: { flex: 1 },
    centerWrap: { flex: 1, justifyContent: "center", alignItems: "center" },
    listContent: { paddingVertical: Spacing.md },
    e2eeBanner: {
        position: "absolute",
        left: 0,
        right: 0,
        bottom: 0,
        padding: Spacing.xl,
        alignItems: "center",
    },
    e2eeText: { textAlign: "center" },
    dateSeparatorWrap: {
        alignItems: "center",
        paddingVertical: Spacing.md,
    },
    dateSeparatorPill: {
        paddingHorizontal: Spacing.md,
        paddingVertical: Spacing.xs,
        borderRadius: Radius.full,
        borderWidth: 1,
    },
    dateSeparatorText: {
        fontWeight: Weight.bold,
        letterSpacing: 0.3,
    },
});
