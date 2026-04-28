import { GestureResponderEvent, Pressable, StyleSheet, Text, View } from 'react-native';
import { useTheme } from '@/hooks/use-theme';
import { Spacing } from '@/constants/theme';

interface VoteButtonsProps {
    upvotes: number;
    downvotes: number;
    userVote: "up" | "down" | null;
    onVote: (value: "up" | "down") => void;
}

export function VoteButtons({ upvotes, downvotes, userVote, onVote }: VoteButtonsProps) {
    const theme = useTheme();
    const score = upvotes - downvotes;

    const stop = (e: GestureResponderEvent) => e.stopPropagation();

    return (
        <View style={styles.row}>
            <Pressable
                onPress={(e) => { stop(e); onVote("up"); }}
                hitSlop={4}
                style={[styles.button, { minHeight: 44, minWidth: 44, alignItems: 'center', justifyContent: 'center' }]}
                accessibilityRole="button"
                accessibilityLabel="Upvote"
            >
                <Text style={[styles.arrow, { color: theme.textTertiary }, userVote === "up" && { color: theme.accent }]}>▲</Text>
            </Pressable>

            <Text style={[
                styles.score,
                { color: theme.textTertiary },
                userVote === "up" && { color: theme.accent },
                userVote === "down" && { color: theme.error },
            ]}>
                {score}
            </Text>

            <Pressable
                onPress={(e) => { stop(e); onVote("down"); }}
                hitSlop={4}
                style={[styles.button, { minHeight: 44, minWidth: 44, alignItems: 'center', justifyContent: 'center' }]}
                accessibilityRole="button"
                accessibilityLabel="Downvote"
            >
                <Text style={[styles.arrow, { color: theme.textTertiary }, userVote === "down" && { color: theme.error }]}>▼</Text>
            </Pressable>
        </View>
    );
}

const styles = StyleSheet.create({
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.xs,
    },
    button: {
        padding: 2,
    },
    arrow: {
        fontSize: 16,
    },
    score: {
        fontSize: 14,
        fontWeight: '600',
        minWidth: 20,
        textAlign: 'center',
    },
});
