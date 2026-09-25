import { ThemedText } from "@/components/themed-text";
import { Radius, Spacing, Typography } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";
import { lightImpact } from "@/utils/haptics";
import { Send, X } from "lucide-react-native";
import { useRef, useState } from "react";
import { Animated, Platform, Pressable, StyleSheet, TextInput, View } from "react-native";

export interface DmReplyTarget {
    messageId: string;
    text: string;
    senderName: string;
}

interface DmComposerProps {
    onSend: (text: string) => void;
    onTyping: () => void;
    replyTarget: DmReplyTarget | null;
    onCancelReply: () => void;
    sending: boolean;
}

export function DmComposer({
    onSend,
    onTyping,
    replyTarget,
    onCancelReply,
    sending,
}: DmComposerProps) {
    const theme = useTheme();
    const [text, setText] = useState("");
    const sendScale = useRef(new Animated.Value(1)).current;

    const canSend = text.trim().length > 0 && !sending;

    const handleSend = () => {
        if (!canSend) return;
        lightImpact();
        Animated.sequence([
            Animated.spring(sendScale, {
                toValue: 0.82,
                useNativeDriver: true,
                tension: 220,
                friction: 10,
            }),
            Animated.spring(sendScale, {
                toValue: 1,
                useNativeDriver: true,
                tension: 170,
                friction: 8,
            }),
        ]).start();
        onSend(text.trim());
        setText("");
    };

    // Web: plain Enter sends, Shift+Enter inserts a newline (default textarea behavior).
    // react-native-web invokes onKeyPress with the DOM keyboard event and skips its
    // own submit handling once preventDefault is called, so no double-send is possible.
    // NOTE: a custom onKeyDown prop does NOT work — react-native-web overwrites it
    // internally (supportedProps.onKeyDown = handleKeyDown).
    const handleWebKeyPress = (e: any) => {
        const key = e?.key ?? e?.nativeEvent?.key;
        if (key !== "Enter" || e?.shiftKey) return;
        if (e?.nativeEvent?.isComposing || e?.isComposing || e?.keyCode === 229) return;
        e.preventDefault?.();
        handleSend();
    };

    return (
        <View style={[styles.wrapper, { backgroundColor: theme.chatSurface }]}>
            {replyTarget && (
                <View style={[styles.replyBar, { backgroundColor: theme.chatAccentTint, borderColor: theme.chatBorder }]}>
                    <View style={[styles.replyAccent, { backgroundColor: theme.chatAccent }]} />
                    <View style={styles.replyBarContent}>
                        <ThemedText type="caption" style={[styles.replyLabel, { color: theme.chatTextMuted }]}>
                            {replyTarget.senderName}
                        </ThemedText>
                        <ThemedText type="small" numberOfLines={1} style={{ color: theme.chatBubbleInText }}>
                            {replyTarget.text}
                        </ThemedText>
                    </View>
                    <Pressable
                        onPress={onCancelReply}
                        hitSlop={10}
                        accessibilityRole="button"
                        accessibilityLabel="Cancel reply"
                    >
                        <X size={16} color={theme.chatTextMuted} strokeWidth={2.5} />
                    </Pressable>
                </View>
            )}

            <View style={[styles.composer, { borderTopColor: theme.chatBorder }]}>
                <View style={[styles.inputWrap, { backgroundColor: theme.chatSurface, borderColor: theme.chatBorder }]}>
                    <TextInput
                        value={text}
                        onChangeText={(val) => {
                            setText(val);
                            onTyping();
                        }}
                        placeholder="Message…"
                        placeholderTextColor={theme.chatTextMuted}
                        style={[styles.input, Platform.OS === "web" && styles.webInput, { color: theme.chatBubbleInText }]}
                        multiline
                        returnKeyType="send"
                        blurOnSubmit={false}
                        onSubmitEditing={Platform.OS === "web" ? undefined : handleSend}
                        onKeyPress={Platform.OS === "web" ? handleWebKeyPress : undefined}
                        testID="dm-message-input"
                        accessibilityLabel="Message input"
                    />
                </View>
                <Animated.View style={{ transform: [{ scale: sendScale }] }}>
                    <Pressable
                        onPress={handleSend}
                        disabled={!canSend}
                        accessibilityRole="button"
                        accessibilityLabel="Send message"
                        style={({ pressed }) => [
                            styles.sendBtn,
                            {
                                backgroundColor: canSend ? theme.chatAccent : theme.chatBorder,
                                borderColor: canSend ? theme.chatAccent : theme.chatBorder,
                                opacity: pressed ? 0.78 : 1,
                            },
                        ]}
                    >
                        <Send size={17} color={canSend ? theme.chatOnAccent : theme.chatTextMuted} strokeWidth={2.5} />
                    </Pressable>
                </Animated.View>
            </View>
        </View>
    );
}


const styles = StyleSheet.create({
    wrapper: {
        paddingBottom: Platform.OS === "ios" ? Spacing.xs : 0,
    },
    replyBar: {
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: Spacing.md,
        paddingVertical: Spacing.sm,
        borderTopWidth: 1,
        borderBottomWidth: 1,
        gap: Spacing.sm,
    },
    replyAccent: {
        width: 3,
        height: "100%",
        borderRadius: Radius.sm,
        minHeight: 32,
    },
    replyBarContent: {
        flex: 1,
        gap: 2,
    },
    replyLabel: {
        fontWeight: "600",
    },
    composer: {
        flexDirection: "row",
        alignItems: "flex-end",
        paddingTop: Spacing.sm,
        paddingBottom: Spacing.md,
        paddingHorizontal: Spacing.md,
        borderTopWidth: 1,
        gap: Spacing.sm,
    },
    inputWrap: {
        flex: 1,
        borderWidth: 1.5,
        borderRadius: Radius.full,
        paddingHorizontal: Spacing.md,
        paddingVertical: Platform.OS === "ios" ? Spacing.sm : Spacing.xs,
        minHeight: 44,
        justifyContent: "center",
    },
    input: { fontSize: Typography.body, maxHeight: 120, lineHeight: 22 },
    webInput: {
        outlineWidth: 0,
        outlineColor: "transparent",
    },
    sendBtn: {
        width: 44,
        height: 44,
        borderRadius: Radius.full,
        borderWidth: 1.5,
        alignItems: "center",
        justifyContent: "center",
    },
});
