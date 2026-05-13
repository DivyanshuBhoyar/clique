import { Settings } from 'lucide-react-native';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing, Weight } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

interface HomeMiniHeaderProps {
    onSettingsPress: () => void;
}

export function HomeMiniHeader({ onSettingsPress }: HomeMiniHeaderProps) {
    const theme = useTheme();

    return (
        <View style={[styles.miniHeader, { borderBottomColor: theme.outlineLight }]}>
            <ThemedText
                type="caption"
                style={{ letterSpacing: 1.5, fontWeight: Weight.bold, color: theme.textSecondary }}
            >
                SQUAD HOME
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
