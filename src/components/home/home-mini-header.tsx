import { MessageCircle, Settings } from 'lucide-react-native';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing, Weight } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

interface HomeMiniHeaderProps {
    onSettingsPress: () => void;
    onMessagesPress: () => void;
}

export function HomeMiniHeader({ onSettingsPress, onMessagesPress }: HomeMiniHeaderProps) {
    const theme = useTheme();

    return (
        <View style={[styles.miniHeader, { borderBottomColor: theme.outlineLight }]}>
            <Pressable
                hitSlop={8}
                style={[styles.messagesBtn, { backgroundColor: theme.surface, borderColor: theme.outline }]}
                onPress={onMessagesPress}
                accessibilityRole="button"
                accessibilityLabel="Open messages"
            >
                <MessageCircle size={18} color={theme.text} strokeWidth={2} />
            </Pressable>
            <ThemedText
                type="caption"
                style={{ letterSpacing: 1.25, fontWeight: Weight.bold, color: theme.textSecondary }}
            >
                <ThemedText style={{ fontSize: 16}}>🐥</ThemedText>: WELCOME
            </ThemedText>
            <Pressable
                hitSlop={8}
                style={[styles.settingsBtn, { backgroundColor: theme.surface, borderColor: theme.outline }]}
                onPress={onSettingsPress}
                accessibilityRole="button"
                accessibilityLabel="Open settings"
            >
                <Settings size={18} color={theme.text} strokeWidth={2} />
            </Pressable>
        </View>
    );
}

const styles = StyleSheet.create({
    miniHeader: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: Spacing.lg,
        paddingVertical: Spacing.md,
        borderBottomWidth: 1,
        position: 'relative',
    },
    messagesBtn: {
        position: 'absolute',
        left: Spacing.lg,
        width: 36,
        height: 36,
        borderRadius: Radius.md,
        borderWidth: 2,
        alignItems: 'center',
        justifyContent: 'center',
    },
    settingsBtn: {
        position: 'absolute',
        right: Spacing.lg,
        width: 36,
        height: 36,
        borderRadius: Radius.md,
        borderWidth: 2,
        alignItems: 'center',
        justifyContent: 'center',
    },
});
