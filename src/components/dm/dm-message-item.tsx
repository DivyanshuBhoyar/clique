import { ThemedText } from "@/components/themed-text";
import { EmojiReactionStrip, Reaction } from "@/components/ui/emoji-reaction-strip";
import { LinkPreviewCard } from "@/components/ui/link-preview-card";
import { LinkifiedText } from "@/components/ui/linkified-text";
import { UserAvatar } from "@/components/user-avatar";
import { Radius, Spacing, Typography } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";
import { extractUrls } from "@/utils/links";
import { memo, useEffect, useRef } from "react";
import { Animated, Pressable, StyleSheet, View } from "react-native";

interface DmMessage {
    messageId: string;
    senderId: string;
    text: string;
    status: string;
    serverTimestamp?: number;
    editedAt?: number | null;
    deletedAt?: number | null;
}

interface DmMessageItemProps {
    message: DmMessage;
    isOwn: boolean;
    otherUserAvatar?: string | null;
    otherUserName: string;
    reactions?: Reaction[];
    onLongPress: () => void;
    onToggleReaction?: (emoji: string) => void;
    onAddReaction?: () => void;
}

export const DmMessageItem = memo(function DmMessageItem({
    message,
    isOwn,
    otherUserAvatar,
    otherUserName,
    reactions = [],
    onLongPress,
    onToggleReaction,
    onAddReaction,
}: DmMessageItemProps) {
    const theme = useTheme();
    const isDeleted = message.status === "deleted" || !!message.deletedAt;
    const firstUrl = !isDeleted ? extractUrls(message.text)[0]?.url : undefined;

    // Entrance animation: a tiny spring lift that feels like the bubble lands softly.
    const scale = useRef(new Animated.Value(0.94)).current;
    const opacity = useRef(new Animated.Value(0)).current;
    const translateY = useRef(new Animated.Value(10)).current;
    const translateX = useRef(new Animated.Value(isOwn ? 10 : -10)).current;

    useEffect(() => {
        Animated.parallel([
            Animated.spring(scale, {
                toValue: 1,
                useNativeDriver: true,
                tension: 170,
                friction: 12,
            }),
            Animated.spring(translateX, {
                toValue: 0,
                useNativeDriver: true,
                tension: 170,
                friction: 12,
            }),
            Animated.spring(translateY, {
                toValue: 0,
                useNativeDriver: true,
                tension: 170,
                friction: 12,
            }),
            Animated.timing(opacity, {
                toValue: 1,
                duration: 120,
                useNativeDriver: true,
            }),
        ]).start();
    // Run only once on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const time = new Date(message.status === "sending" ? Date.now() : message.serverTimestamp ?? Date.now())
        .toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    const deliveryText = isOwn && !isDeleted
        ? message.status === "sending"
            ? "sending…"
            : message.status === "failed"
                ? "not sent"
                : null
        : null;

    return (
        <View style={[styles.row, isOwn ? styles.rowOwn : styles.rowOther]}>
            {!isOwn && (
                <View style={styles.avatarWrap}>
                    <UserAvatar
                        uri={otherUserAvatar}
                        fallbackText={otherUserName}
                        size={28}
                    />
                </View>
            )}

            <Animated.View
                style={[
                    styles.bubbleWrapper,
                    isOwn ? styles.bubbleWrapperOwn : styles.bubbleWrapperOther,
                    { transform: [{ scale }, { translateX }, { translateY }], opacity },
                ]}
            >
                <Pressable
                    onLongPress={() => !isDeleted && onLongPress()}
                    delayLongPress={280}
                    style={[
                        styles.bubble,
                        isOwn
                            ? [
                                styles.bubbleOwn,
                                { backgroundColor: theme.chatBubbleOut },
                            ]
                            : [
                                styles.bubbleOther,
                                { backgroundColor: theme.chatBubbleIn },
                            ],
                    ]}
                    accessibilityRole="button"
                    accessibilityLabel={isOwn ? "Your message" : `${otherUserName} message`}
                >
                    {isDeleted ? (
                        <ThemedText type="caption" style={[styles.deletedText, { color: theme.chatTextMuted }]}>
                            Message deleted
                        </ThemedText>
                    ) : (
                        <LinkifiedText
                            style={[
                                styles.messageText,
                                { color: isOwn ? theme.chatBubbleOutText : theme.chatBubbleInText },
                            ]}
                            linkColor={theme.chatAccent}
                        >
                            {message.text}
                        </LinkifiedText>
                    )}
                    {firstUrl ? (
                        <View style={styles.linkPreviewWrap}>
                            <LinkPreviewCard url={firstUrl} compact embedded={isOwn} tone={isOwn ? "out" : "in"} />
                        </View>
                    ) : null}
                </Pressable>

                {reactions.length > 0 && (
                    <View style={[styles.reactionsWrap, isOwn ? styles.reactionsOwn : styles.reactionsOther]}>
                        <EmojiReactionStrip
                            reactions={reactions}
                            onToggle={onToggleReaction ?? (() => {})}
                            onAdd={onAddReaction}
                            compact
                            wrap
                            chat
                        />
                    </View>
                )}

                {!isDeleted && (
                    <ThemedText
                        type="caption"
                        style={[
                            styles.timestamp,
                            { color: message.status === "failed" ? theme.error : theme.chatTextMuted },
                            isOwn && styles.timestampOwn,
                        ]}
                    >
                        {time}{message.editedAt ? " · edited" : ""}{deliveryText ? ` · ${deliveryText}` : ""}
                    </ThemedText>
                )}
            </Animated.View>
        </View>
    );
});

const styles = StyleSheet.create({
    row: {
        flexDirection: "row",
        marginBottom: Spacing.md,
        paddingHorizontal: Spacing.md,
        alignItems: "flex-end",
        gap: Spacing.xs,
    },
    rowOwn: { justifyContent: "flex-end" },
    rowOther: { justifyContent: "flex-start" },
    avatarWrap: { marginBottom: 16 },
    bubbleWrapper: { maxWidth: "78%" },
    bubbleWrapperOwn: { alignItems: "flex-end" },
    bubbleWrapperOther: { alignItems: "flex-start" },
    bubble: {
        // Deliberate chat ratio: roomier sides, cozy top/bottom
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: Radius.lg,
    },
    bubbleOwn: {
        // outgoing: 16 16 4 16
        borderBottomRightRadius: 4,
    },
    bubbleOther: {
        // incoming: 16 16 16 4
        borderBottomLeftRadius: 4,
    },
    reactionsWrap: {
        // Slight tuck under the bubble's bottom edge, inset from the corner curve
        marginTop: -7,
    },
    reactionsOwn: { alignSelf: "flex-end", marginRight: 6 },
    reactionsOther: { alignSelf: "flex-start", marginLeft: 6 },
    messageText: {
        fontSize: Typography.body,
        // Tighter than body copy: keeps single-line bubbles short and multi-line gaps chat-like
        lineHeight: 21,
        // Android-only: drop the extra font-metric padding so 8/8 bubble padding renders symmetric
        includeFontPadding: false,
    },
    linkPreviewWrap: {
        marginTop: Spacing.sm,
    },
    timestamp: {
        marginTop: 3,
        marginLeft: Spacing.xs,
        fontSize: 11,
    },
    timestampOwn: { alignSelf: "flex-end", marginRight: Spacing.xs },
    deletedText: {
        fontStyle: "italic",
    },
});
