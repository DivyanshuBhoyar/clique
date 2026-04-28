import { useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

interface MessageInputProps {
    onSend: (content: string) => Promise<void>;
    onTyping?: () => void;
}

export function MessageInput({ onSend, onTyping }: MessageInputProps) {
    const [text, setText] = useState('');
    const [sending, setSending] = useState(false);
    const theme = useTheme();

    const canSend = text.trim().length > 0 && !sending;

    const handleSend = async () => {
        if (!canSend) return;

        const content = text.trim();
        setText('');
        setSending(true);

        try {
            await onSend(content);
        } catch {
            setText(content);
        } finally {
            setSending(false);
        }
    };

    const handleChangeText = (value: string) => {
        setText(value);
        onTyping?.();
    };

    return (
        <View style={[styles.container, { borderColor: theme.outlineLight, backgroundColor: theme.surface }]}>
            <TextInput
                value={text}
                onChangeText={handleChangeText}
                placeholder="Type a message..."
                placeholderTextColor={theme.textTertiary}
                style={[styles.input, { color: theme.text }]}
                returnKeyType="send"
                onSubmitEditing={handleSend}
            />
            <Pressable
                onPress={handleSend}
                disabled={!canSend}
                style={[
                    styles.sendButton,
                    {
                        backgroundColor: canSend ? theme.accent : theme.backgroundElement,
                        borderColor: canSend ? theme.accent : theme.outlineLight,
                    },
                ]}
                accessibilityRole="button"
                accessibilityLabel="Send message"
            >
                <ThemedText style={[styles.sendText, { color: canSend ? '#fff' : theme.textTertiary }]}>
                    {sending ? '...' : 'Send'}
                </ThemedText>
            </Pressable>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: Spacing.sm,
        paddingVertical: Spacing.xs,
        borderTopWidth: 2,
    },
    input: {
        flex: 1,
        minHeight: 44,
        paddingHorizontal: Spacing.sm,
        fontSize: 16,
    },
    sendButton: {
        paddingHorizontal: Spacing.lg,
        paddingVertical: Spacing.sm,
        borderRadius: Radius.sm,
        borderWidth: 2,
        minHeight: 44,
        alignItems: 'center',
        justifyContent: 'center',
    },
    sendDisabled: {
        opacity: 0.4,
    },
    sendText: {
        fontSize: 16,
        fontWeight: '600',
    },
});
