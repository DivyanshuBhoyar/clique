import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { AnimatedPressable } from '@/components/ui/animated-pressable';
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
    return (
        <View style={styles.section}>
            <ThemedText type="bodyBold">Jump In</ThemedText>
            <View style={styles.jumpGrid}>
                {JUMP_TILES.map((tile) => {
                    return (
                        <JumpTile
                            key={tile.label}
                            tile={tile}
                            onOpenRoute={onOpenRoute}
                        />
                    );
                })}
            </View>
        </View>
    );
}

function JumpTile({
    tile,
    onOpenRoute,
}: {
    tile: typeof JUMP_TILES[number];
    onOpenRoute: (route: string) => void;
}) {
    const theme = useTheme();
    const [pressed, setPressed] = useState(false);
    const isDashed = 'dashed' in tile && tile.dashed;

    return (
        <AnimatedPressable
            style={[
                styles.jumpTile,
                {
                    backgroundColor: isDashed ? theme.surface : tile.bg,
                    borderColor: theme.outline,
                    borderStyle: isDashed ? 'dashed' : 'solid',
                    shadowColor: theme.shadow,
                    shadowOffset: pressed ? styles.pressedShadow.shadowOffset : styles.restingShadow.shadowOffset,
                    shadowOpacity: pressed ? styles.pressedShadow.shadowOpacity : styles.restingShadow.shadowOpacity,
                    shadowRadius: 0,
                    elevation: pressed ? 1 : 3,
                },
            ]}
            pressedScale={0.97}
            pressedTranslateY={2}
            onPressIn={() => setPressed(true)}
            onPressOut={() => setPressed(false)}
            onPress={() => {
                if (!tile.route) return;
                onOpenRoute(tile.route);
            }}
            accessibilityRole="button"
            accessibilityLabel={tile.route ? `Open ${tile.label}` : `${tile.label} coming soon`}
        >
            <ThemedText style={styles.jumpEmoji}>{tile.emoji}</ThemedText>
            <ThemedText type="bodyBold" style={styles.jumpLabel}>{tile.label}</ThemedText>
            {isDashed && (
                <ThemedText type="caption" themeColor="textTertiary">
                    discover more
                </ThemedText>
            )}
        </AnimatedPressable>
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
    restingShadow: {
        shadowOffset: { width: 3, height: 3 },
        shadowOpacity: 0.18,
    },
    pressedShadow: {
        shadowOffset: { width: 1, height: 1 },
        shadowOpacity: 0.12,
    },
    jumpEmoji: { fontSize: Typography.heading },
    jumpLabel: { fontSize: Typography.body },
});
