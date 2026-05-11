/**
 * VoteButtons — upvote / downvote controls with score display.
 *
 * Design: ▲ score ▼ in a row, active state uses golden yellow (up) or red (down).
 * Lucide ThumbsUp/ThumbsDown icons for a cleaner look than text arrows.
 */
import { GestureResponderEvent, Pressable, StyleSheet, View } from 'react-native';
import { ThumbsUp, ThumbsDown } from 'lucide-react-native';
import { ThemedText } from '@/components/themed-text';
import { useTheme } from '@/hooks/use-theme';
import { Spacing, Typography, Weight } from '@/constants/theme';

interface VoteButtonsProps {
    upvotes: number;
    downvotes: number;
    userVote: 'up' | 'down' | null;
    onVote: (value: 'up' | 'down') => void;
}

export function VoteButtons({ upvotes, downvotes, userVote, onVote }: VoteButtonsProps) {
    const theme = useTheme();
    const score = upvotes - downvotes;
    const stop = (e: GestureResponderEvent) => e.stopPropagation();

    return (
        <View style={styles.row}>
            <Pressable
                onPress={(e) => { stop(e); onVote('up'); }}
                hitSlop={8}
                style={styles.btn}
                accessibilityRole="button"
                accessibilityLabel="Upvote"
            >
                <ThumbsUp
                    size={16}
                    color={userVote === 'up' ? theme.accent : theme.textTertiary}
                    fill={userVote === 'up' ? theme.accent : 'transparent'}
                    strokeWidth={2}
                />
            </Pressable>

            <ThemedText
                style={[
                    styles.score,
                    {
                        color: userVote === 'up'
                            ? theme.accent
                            : userVote === 'down'
                                ? theme.error
                                : theme.textSecondary,
                    },
                ]}
                numberOfLines={1}
            >
                {score}
            </ThemedText>

            <Pressable
                onPress={(e) => { stop(e); onVote('down'); }}
                hitSlop={8}
                style={styles.btn}
                accessibilityRole="button"
                accessibilityLabel="Downvote"
            >
                <ThumbsDown
                    size={16}
                    color={userVote === 'down' ? theme.error : theme.textTertiary}
                    fill={userVote === 'down' ? theme.error : 'transparent'}
                    strokeWidth={2}
                />
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
    btn: {
        minHeight: 34,
        minWidth: 30,
        alignItems: 'center',
        justifyContent: 'center',
    },
    score: {
        fontSize: Typography.small,
        fontWeight: Weight.bold,
        minWidth: 16,
        textAlign: 'center',
        fontVariant: ['tabular-nums'],
    },
});
