import { Spacing } from '@/constants/theme';
import React from 'react';
import { Pressable, StyleSheet, Text, ViewStyle } from 'react-native';

interface ButtonProps {
    title: string;
    onPress: () => void;
    color?: string;
    style?: ViewStyle;
}

export function Button({ title, onPress, color = '#007AFF', style }: ButtonProps) {
    return (
        <Pressable
            onPress={onPress}
            style={({ pressed }) => [
                styles.container,
                { backgroundColor: color },
                pressed && styles.pressed,
                style,
            ]}
        >
            <Text style={styles.text}>{title}</Text>
        </Pressable>
    );
}

const styles = StyleSheet.create({
    container: {
        paddingVertical: Spacing.three,
        paddingHorizontal: Spacing.six,
        borderRadius: 8,
        alignItems: 'center',
        justifyContent: 'center',
    },
    pressed: {
        opacity: 0.8,
    },
    text: {
        fontSize: 16,
        fontWeight: '600',
        color: '#fff',
    },
});
