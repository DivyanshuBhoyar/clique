import { useEffect, useRef, useState } from 'react';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { StyleSheet, View } from 'react-native';

interface TypingUser {
    userId: string;
    nickname: string;
}

interface TypingIndicatorProps {
    typingUsers: TypingUser[];
    currentUserId?: string;
}

const TYPING_TIMEOUT = 4000; // slightly longer than server's 3s window

export function TypingIndicator({ typingUsers, currentUserId }: TypingIndicatorProps) {
    const [visible, setVisible] = useState(false);
    const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const others = typingUsers.filter(u => u.userId !== currentUserId);

    useEffect(() => {
        if (others.length > 0) {
            setVisible(true);
            // Reset timer every time typing data updates
            if (timerRef.current) clearTimeout(timerRef.current);
            timerRef.current = setTimeout(() => setVisible(false), TYPING_TIMEOUT);
        }

        return () => {
            if (timerRef.current) clearTimeout(timerRef.current);
        };
    }, [others.length, typingUsers]);

    if (!visible || others.length === 0) return null;

    const text = formatTypingText(others);

    return (
        <View style={styles.container}>
            <ThemedText type="small" themeColor="textSecondary">{text}</ThemedText>
        </View>
    );
}

function formatTypingText(users: { nickname: string }[]): string {
    const names = users.map(u => u.nickname);

    if (names.length === 1) return `${names[0]} is typing...`;
    if (names.length === 2) return `${names[0]} and ${names[1]} are typing...`;
    return `${names[0]} and ${names.length - 1} others are typing...`;
}

const styles = StyleSheet.create({
    container: {
        paddingHorizontal: Spacing.three,
        paddingVertical: Spacing.one,
    },
});
