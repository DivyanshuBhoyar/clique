import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing, Typography } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useState } from 'react';
import { StyleSheet, TextInput, Pressable, View } from 'react-native';

interface CreatePollProps {
    onSubmit: (question: string, options: string[]) => void;
    onCancel: () => void;
}

export function CreatePoll({ onSubmit, onCancel }: CreatePollProps) {
    const theme = useTheme();
    const [question, setQuestion] = useState("");
    const [options, setOptions] = useState(["", ""]);

    function updateOption(index: number, text: string) {
        const updated = [...options];
        updated[index] = text;
        setOptions(updated);
    }

    function addOption() {
        if (options.length >= 6) return;
        setOptions([...options, ""]);
    }

    function removeOption(index: number) {
        if (options.length <= 2) return;
        setOptions(options.filter((_, i) => i !== index));
    }

    function handleSubmit() {
        const validOptions = options.filter((o) => o.trim());
        if (!question.trim() || validOptions.length < 2) return;
        onSubmit(question.trim(), validOptions);
    }

    const canSubmit = question.trim() && options.filter((o) => o.trim()).length >= 2;

    return (
        <View style={[styles.container, { borderColor: theme.outline, backgroundColor: theme.surface }]}>
            <ThemedText type="bodyBold">Create a Poll</ThemedText>

            <TextInput
                style={[styles.input, { color: theme.text, borderColor: theme.outline, backgroundColor: theme.inputBackground }]}
                value={question}
                onChangeText={setQuestion}
                placeholder="Ask a question..."
                placeholderTextColor={theme.textTertiary}
                maxLength={200}
                autoFocus
            />

            <View style={styles.optionsList}>
                {options.map((option, i) => (
                    <View key={i} style={styles.optionRow}>
                        <TextInput
                            style={[styles.optionInput, { color: theme.text, borderColor: theme.outline, backgroundColor: theme.inputBackground }]}
                            value={option}
                            onChangeText={(text) => updateOption(i, text)}
                            placeholder={`Option ${i + 1}`}
                            placeholderTextColor={theme.textTertiary}
                            maxLength={100}
                        />
                        {options.length > 2 && (
                            <Pressable onPress={() => removeOption(i)} style={styles.removeBtn}>
                                <ThemedText themeColor="textTertiary">✕</ThemedText>
                            </Pressable>
                        )}
                    </View>
                ))}
            </View>

            {options.length < 6 && (
                <Pressable onPress={addOption}>
                    <ThemedText type="small" themeColor="accent">+ Add option</ThemedText>
                </Pressable>
            )}

            <View style={styles.actions}>
                <Pressable onPress={onCancel} hitSlop={8}>
                    <ThemedText type="small" themeColor="textSecondary">Cancel</ThemedText>
                </Pressable>
                <Pressable
                    style={[styles.submitBtn, {
                        backgroundColor: canSubmit ? theme.accent : theme.backgroundElement,
                        borderColor: canSubmit ? theme.outline : theme.outlineLight,
                        opacity: canSubmit ? 1 : 0.5,
                    }]}
                    onPress={handleSubmit}
                    disabled={!canSubmit}
                >
                    <ThemedText type="smallBold" style={{ color: canSubmit ? theme.text : theme.textTertiary }}>Create</ThemedText>
                </Pressable>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        borderWidth: 2,
        borderRadius: Radius.lg,
        padding: Spacing.lg,
        gap: Spacing.sm,
    },
    input: {
        borderWidth: 2,
        borderRadius: Radius.lg,
        padding: Spacing.sm,
        paddingHorizontal: Spacing.md,
        fontSize: Typography.small,
    },
    optionsList: {
        gap: Spacing.sm,
    },
    optionRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.sm,
    },
    optionInput: {
        flex: 1,
        borderWidth: 2,
        borderRadius: Radius.lg,
        padding: Spacing.sm,
        paddingHorizontal: Spacing.md,
        fontSize: Typography.small,
    },
    removeBtn: {
        padding: Spacing.sm,
        minHeight: 44,
        justifyContent: 'center',
    },
    actions: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: Spacing.xs,
    },
    submitBtn: {
        paddingHorizontal: Spacing.lg,
        paddingVertical: Spacing.sm,
        borderRadius: Radius.full,
        borderWidth: 1.5,
        minHeight: 44,
        alignItems: 'center',
        justifyContent: 'center',
    },
});
