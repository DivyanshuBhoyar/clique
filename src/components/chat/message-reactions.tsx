import { useTheme } from '@/hooks/use-theme';
import { Radius, Spacing } from '@/constants/theme';
import { Pressable, StyleSheet, Text, View } from 'react-native';

interface Reaction {
    emoji: string;
    userId: string;
}

interface MessageReactionsProps {
    reactions: Reaction[];
    currentUserId?: string;
    onToggle: (emoji: string) => void;
}

export function MessageReactions({ reactions, currentUserId, onToggle }: MessageReactionsProps) {
    const theme = useTheme();

    if (reactions.length === 0) return null;

    const grouped = new Map<string, { count: number; hasMine: boolean }>();
    for (const r of reactions) {
        const existing = grouped.get(r.emoji) ?? { count: 0, hasMine: false };
        existing.count++;
        if (r.userId === currentUserId) existing.hasMine = true;
        grouped.set(r.emoji, existing);
    }

    return (
        <View style={styles.row}>
            {[...grouped.entries()].map(([emoji, { count, hasMine }]) => (
                <Pressable
                    key={emoji}
                    onPress={() => onToggle(emoji)}
                    style={[
                        styles.chip,
                        {
                            borderColor: hasMine ? theme.accent : theme.outlineLight,
                            backgroundColor: hasMine ? theme.accentSoft : theme.backgroundElement,
                        },
                    ]}
                    accessibilityRole="button"
                    accessibilityLabel={`${emoji} reaction, ${count}`}
                >
                    <Text style={styles.emoji}>{emoji}</Text>
                    {count > 1 && <Text style={[styles.count, { color: theme.textSecondary }]}>{count}</Text>}
                </Pressable>
            ))}
        </View>
    );
}

const styles = StyleSheet.create({
    row: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 4,
        marginTop: 4,
    },
    chip: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: Spacing.sm,
        paddingVertical: 2,
        borderRadius: Radius.sm,
        borderWidth: 1.5,
    },
    emoji: {
        fontSize: 14,
    },
    count: {
        fontSize: 12,
        marginLeft: 2,
    },
});
