import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
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
    if (reactions.length === 0) return null;

    // Group by emoji → count + whether current user reacted
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
                    style={[styles.chip, hasMine && styles.chipActive]}
                >
                    <Text style={styles.emoji}>{emoji}</Text>
                    {count > 1 && <Text style={styles.count}>{count}</Text>}
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
        paddingHorizontal: Spacing.two,
        paddingVertical: 2,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: 'rgba(0,0,0,0.15)',
        backgroundColor: 'rgba(0,0,0,0.05)',
    },
    chipActive: {
        backgroundColor: '#E3F2FD',
        borderColor: '#2196F3',
    },
    emoji: {
        fontSize: 14,
    },
    count: {
        fontSize: 12,
        marginLeft: 2,
        color: '#666',
    },
});
