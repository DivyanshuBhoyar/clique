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

    return (
        <View style={[styles.wrapper, { backgroundColor: theme.background }]}>
            {replyTarget && (
                <View style={[styles.replyBar, { backgroundColor: theme.surfaceWarm, borderColor: theme.outlineLight }]}>
                    <View style={[styles.replyAccent, { backgroundColor: theme.accent }]} />
                    <View style={styles.replyBarContent}>
                        <ThemedText type="caption" themeColor="textSecondary" style={styles.replyLabel}>
                            {replyTarget.senderName}
                        </ThemedText>
                        <ThemedText type="small" numberOfLines={1} themeColor="textSecondary">
                            {replyTarget.text}
                        </ThemedText>
                    </View>
                    <Pressable
                        onPress={onCancelReply}
                        hitSlop={10}
                        accessibilityRole="button"
                        accessibilityLabel="Cancel reply"
                    >
                        <X size={16} color={theme.textTertiary} strokeWidth={2.5} />
                    </Pressable>
                </View>
            )}

            <View style={[styles.composer, { borderTopColor: theme.outlineLight }]}>
                <View style={[styles.inputWrap, { backgroundColor: theme.surface, borderColor: theme.outlineLight }]}>
                    <TextInput
                        value={text}
                        onChangeText={(val) => {
                            setText(val);
                            onTyping();
                        }}
                        placeholder="Message…"
                        placeholderTextColor={theme.textTertiary}
                        style={[styles.input, { color: theme.text }]}
                        multiline
                        returnKeyType="send"
                        onSubmitEditing={handleSend}
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
                                backgroundColor: canSend ? theme.accent : theme.outlineLight,
                                borderColor: canSend ? theme.outline : theme.outlineLight,
                                opacity: pressed ? 0.78 : 1,
                            },
                        ]}
                    >
                        <Send size={17} color={canSend ? "#2D2D2D" : theme.textTertiary} strokeWidth={2.5} />
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
    sendBtn: {
        width: 44,
        height: 44,
        borderRadius: Radius.full,
        borderWidth: 1.5,
        alignItems: "center",
        justifyContent: "center",
    },
});
