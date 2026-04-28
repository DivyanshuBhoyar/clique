import { Radius, Spacing } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";
import { useState } from "react";
import { StyleSheet, TextInput, TouchableOpacity, View } from "react-native";
import { ThemedText } from "@/components/themed-text";

interface ConfessionInputProps {
    onSubmit: (content: string) => void;
}

export function ConfessionInput({ onSubmit }: ConfessionInputProps) {
    const theme = useTheme();
    const [text, setText] = useState("");

    function handleSubmit() {
        if (!text.trim()) return;
        onSubmit(text.trim());
        setText("");
    }

    return (
        <View style={styles.container}>
            <TextInput
                style={[styles.input, { color: theme.text, borderColor: theme.outline, backgroundColor: theme.inputBackground }]}
                value={text}
                onChangeText={setText}
                placeholder="Spill something anonymously..."
                placeholderTextColor={theme.textTertiary}
                maxLength={500}
                multiline
            />
            <TouchableOpacity
                style={[styles.sendBtn, { backgroundColor: theme.accent, opacity: text.trim() ? 1 : 0.4 }]}
                onPress={handleSubmit}
                disabled={!text.trim()}
                accessibilityRole="button"
                accessibilityLabel="Send confession"
            >
                <ThemedText type="smallBold" style={{ color: "#fff" }}>Send</ThemedText>
            </TouchableOpacity>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flexDirection: "row",
        gap: Spacing.sm,
        alignItems: "flex-end",
    },
    input: {
        flex: 1,
        borderWidth: 2,
        borderRadius: Radius.md,
        padding: Spacing.sm,
        fontSize: 14,
        minHeight: 44,
        maxHeight: 100,
    },
    sendBtn: {
        paddingHorizontal: Spacing.lg,
        paddingVertical: Spacing.sm,
        borderRadius: Radius.md,
        minHeight: 44,
        alignItems: "center",
        justifyContent: "center",
    },
});
