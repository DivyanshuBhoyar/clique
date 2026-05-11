import { Radius, Spacing, Typography } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useState } from 'react';
import { StyleSheet, TextInput, Pressable, View } from 'react-native';
import { ThemedText } from '@/components/themed-text';

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
                style={[styles.input, { color: theme.text, borderColor: theme.outline, backgroundColor: theme.surface }]}
                value={text}
                onChangeText={setText}
                placeholder="Spill something anonymously… 🤫"
                placeholderTextColor={theme.placeholder}
                maxLength={500}
                multiline
            />
            <Pressable
                style={[styles.sendBtn, {
                    backgroundColor: text.trim() ? theme.accent : theme.backgroundElement,
                    borderColor: text.trim() ? theme.outline : theme.outlineLight,
                    opacity: text.trim() ? 1 : 0.5,
                }]}
                onPress={handleSubmit}
                disabled={!text.trim()}
                accessibilityRole="button"
                accessibilityLabel="Send confession"
            >
                <ThemedText type="smallBold" style={{ color: text.trim() ? theme.text : theme.textTertiary }}>Send</ThemedText>
            </Pressable>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        gap: Spacing.sm,
        alignItems: 'flex-end',
    },
    input: {
        flex: 1,
        borderWidth: 2,
        borderRadius: Radius.lg,
        padding: Spacing.sm,
        paddingHorizontal: Spacing.md,
        fontSize: Typography.small,
        minHeight: 44,
        maxHeight: 100,
    },
    sendBtn: {
        paddingHorizontal: Spacing.lg,
        paddingVertical: Spacing.sm,
        borderRadius: Radius.full,
        borderWidth: 1.5,
        minHeight: 44,
        alignItems: 'center',
        justifyContent: 'center',
    },
});
