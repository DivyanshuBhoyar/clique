import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { backOrReplace } from '@/utils/navigation';
import { router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

interface SquadHeaderProps {
    name?: string;
    disabled?: boolean;
}

export function SquadHeader({ name, disabled }: SquadHeaderProps) {
    const theme = useTheme();

    return (
        <View style={[styles.strip, !disabled && { borderBottomColor: theme.outlineLight }]}>
            {disabled ? (
                <View />
            ) : (
                <ThemedText type="caption" style={{ color: theme.textSecondary }}>
                    {name || '...'}
                </ThemedText>
            )}
            <Pressable onPress={() => backOrReplace(router, '/')} hitSlop={12}>
                <ThemedText type="small" style={{ color: theme.textSecondary }}>
                    Close
                </ThemedText>
            </Pressable>
        </View>
    );
}

const styles = StyleSheet.create({
    strip: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: Spacing.md,
        paddingVertical: Spacing.xs,
        borderBottomWidth: 1,
    },
});
