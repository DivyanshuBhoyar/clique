import { useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

interface MessageInputProps {
    onSend: (content: string) => Promise<void>;
}

export function MessageInput({ onSend }: MessageInputProps) {
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
            setText(content); // restore
        } finally {
            setSending(false);
        }
    };

    return (
        <View style={[styles.container, { borderColor: theme.textSecondary }]}>
            <TextInput
                value={text}
                onChangeText={setText}
                placeholder="Type a message..."
                placeholderTextColor={theme.textSecondary}
                style={[styles.input, { color: theme.text }]}
                returnKeyType="send"
                onSubmitEditing={handleSend}
            />
            <Pressable
                onPress={handleSend}
                disabled={!canSend}
                style={[styles.sendButton, !canSend && styles.sendDisabled]}
            >
                <ThemedText style={styles.sendText}>
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
        paddingHorizontal: Spacing.two,
        paddingVertical: Spacing.one,
        borderTopWidth: 1,
    },
    input: {
        flex: 1,
        minHeight: 40,
        paddingHorizontal: Spacing.two,
        fontSize: 16,
    },
    sendButton: {
        paddingHorizontal: Spacing.three,
        paddingVertical: Spacing.one,
    },
    sendDisabled: {
        opacity: 0.4,
    },
    sendText: {
        fontSize: 16,
        fontWeight: '600',
    },
});
