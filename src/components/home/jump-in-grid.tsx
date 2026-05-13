import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing, Typography } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

const JUMP_TILES = [
    { label: 'Chat', emoji: '💬', bg: '#F5E6C8', route: 'chat' },
    { label: 'Drops', emoji: '⚡', bg: '#FAD4A0', route: 'drops' },
    { label: 'Memories', emoji: '🏡', bg: '#F5C4C0', route: 'memories' },
    { label: 'Notes', emoji: '📖', bg: '#C8D8F0', route: 'notes' },
    { label: 'Vibes', emoji: '✨', bg: '#DDD0F0', route: 'vibes' },
    { label: 'Explore', emoji: '🔮', bg: '#E8E8E8', route: null, dashed: true },
] as const;

interface JumpInGridProps {
    onOpenRoute: (route: string) => void;
}

export function JumpInGrid({ onOpenRoute }: JumpInGridProps) {
    const theme = useTheme();

    return (
        <View style={styles.section}>
            <ThemedText type="bodyBold">Jump In</ThemedText>
            <View style={styles.jumpGrid}>
                {JUMP_TILES.map((tile) => {
                    const isDashed = 'dashed' in tile && tile.dashed;
                    return (
                        <Pressable
                            key={tile.label}
                            style={[
                                styles.jumpTile,
                                {
                                    backgroundColor: isDashed ? theme.surface : tile.bg,
                                    borderColor: theme.outline,
                                    borderStyle: isDashed ? 'dashed' : 'solid',
                                },
                            ]}
                            onPress={() => {
                                if (!tile.route) return;
                                onOpenRoute(tile.route);
                            }}
                            accessibilityRole="button"
                            accessibilityLabel={`Open ${tile.label}`}
                        >
                            <ThemedText style={styles.jumpEmoji}>{tile.emoji}</ThemedText>
                            <ThemedText type="bodyBold" style={styles.jumpLabel}>{tile.label}</ThemedText>
                            {isDashed && (
                                <ThemedText type="caption" themeColor="textTertiary">
                                    discover more
                                </ThemedText>
                            )}
                        </Pressable>
                    );
                })}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    section: {
        gap: Spacing.md,
        paddingHorizontal: Spacing.lg,
    },
    jumpGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: Spacing.md,
    },
    jumpTile: {
        width: '47%',
        borderWidth: 2,
        borderRadius: Radius.xl,
        paddingHorizontal: Spacing.lg,
        paddingVertical: Spacing.xl,
        gap: Spacing.xs,
    },
    jumpEmoji: { fontSize: Typography.heading },
    jumpLabel: { fontSize: Typography.body },
});
