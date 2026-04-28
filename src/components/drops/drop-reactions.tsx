import { useTheme } from '@/hooks/use-theme';
import { Radius, Spacing } from '@/constants/theme';
import { GestureResponderEvent, Pressable, StyleSheet, Text, View } from 'react-native';
import { useState, useCallback } from 'react';

const QUICK_EMOJIS = ['❤️', '🔥', '😂', '😮', '😢', '👏'];

interface Reaction {
    emoji: string;
    userId: string;
}

interface DropReactionsProps {
    reactions: Reaction[];
    currentUserId?: string;
    onToggle: (emoji: string) => void;
}

export function DropReactions({ reactions, currentUserId, onToggle }: DropReactionsProps) {
    const theme = useTheme();
    const [pickerOpen, setPickerOpen] = useState(false);

    const stop = useCallback((e: GestureResponderEvent) => e.stopPropagation(), []);

    const grouped = new Map<string, { count: number; hasMine: boolean }>();
    for (const r of reactions) {
        const existing = grouped.get(r.emoji) ?? { count: 0, hasMine: false };
        existing.count++;
        if (r.userId === currentUserId) existing.hasMine = true;
        grouped.set(r.emoji, existing);
    }

    return (
        <View style={styles.container}>
            <View style={styles.row}>
                {[...grouped.entries()].map(([emoji, { count, hasMine }]) => (
                    <Pressable
                        key={emoji}
                        onPress={(e) => { stop(e); onToggle(emoji); }}
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

                <Pressable
                    onPress={(e) => { stop(e); setPickerOpen((v) => !v); }}
                    style={[styles.addChip, { borderColor: theme.outlineLight, backgroundColor: theme.backgroundElement }]}
                    accessibilityRole="button"
                    accessibilityLabel="Add reaction"
                >
                    <Text style={[styles.addIcon, { color: theme.textSecondary }]}>+</Text>
                </Pressable>
            </View>

            {pickerOpen && (
                <View style={[styles.pickerRow, { borderTopColor: theme.outlineLight }]}>
                    {QUICK_EMOJIS.map((emoji) => (
                        <Pressable
                            key={emoji}
                            onPress={(e) => {
                                stop(e);
                                onToggle(emoji);
                                setPickerOpen(false);
                            }}
                            style={styles.pickerEmoji}
                        >
                            <Text style={styles.pickerEmojiText}>{emoji}</Text>
                        </Pressable>
                    ))}
                </View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        marginTop: Spacing.sm,
    },
    row: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 4,
    },
    chip: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: Spacing.sm,
        paddingVertical: 2,
        borderRadius: Radius.sm,
        borderWidth: 1.5,
        minHeight: 32,
    },
    addChip: {
        paddingHorizontal: Spacing.sm,
        paddingVertical: 2,
        borderRadius: Radius.sm,
        borderWidth: 1.5,
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: 32,
    },
    emoji: {
        fontSize: 14,
    },
    count: {
        fontSize: 12,
        marginLeft: 2,
    },
    addIcon: {
        fontSize: 14,
        fontWeight: '600',
    },
    pickerRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: Spacing.sm,
        marginTop: Spacing.xs,
        paddingTop: Spacing.xs,
        borderTopWidth: 1,
    },
    pickerEmoji: {
        padding: Spacing.xs,
    },
    pickerEmojiText: {
        fontSize: 20,
    },
});
