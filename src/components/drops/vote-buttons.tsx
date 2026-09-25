/**
 * VoteButtons — upvote / downvote controls with score display.
 *
 * Design: ▲ score ▼ in a row, active state uses golden yellow (up) or red (down).
 * Lucide ThumbsUp/ThumbsDown icons for a cleaner look than text arrows.
 */
import { ThemedText } from '@/components/themed-text';
import { Typography, Weight } from '@/constants/theme';
import { useReduceMotion } from '@/hooks/use-reduce-motion';
import { useTheme } from '@/hooks/use-theme';
import { mediumImpact } from '@/utils/haptics';
import { ThumbsDown, ThumbsUp } from 'lucide-react-native';
import { useEffect } from 'react';
import { GestureResponderEvent, Pressable, StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';

interface VoteButtonsProps {
    upvotes: number;
    downvotes: number;
    userVote: 'up' | 'down' | null;
    onVote: (value: 'up' | 'down') => void;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export function VoteButtons({ upvotes, downvotes, userVote, onVote }: VoteButtonsProps) {
    const theme = useTheme();
    const reduceMotion = useReduceMotion();
    const score = upvotes - downvotes;
    const stop = (e: GestureResponderEvent) => e.stopPropagation();

    const scoreScale = useSharedValue(1);

    useEffect(() => {
        scoreScale.value = reduceMotion
            ? withTiming(1.12, { duration: 100 }, () => {
                  scoreScale.value = withTiming(1, { duration: 100 });
              })
            : withSpring(1.18, { damping: 8, stiffness: 400, mass: 0.5 }, () => {
                  scoreScale.value = withSpring(1, { damping: 12, stiffness: 300, mass: 0.5 });
              });
    }, [score, reduceMotion, scoreScale]);

    const scoreStyle = useAnimatedStyle(() => ({
        transform: [{ scale: scoreScale.value }],
    }));

    const upScale = useSharedValue(1);
    const downScale = useSharedValue(1);

    const animatePress = (target: 'up' | 'down', direction: 'in' | 'out') => {
        const value = reduceMotion
            ? withTiming(direction === 'in' ? 0.92 : 1, { duration: 80 })
            : withSpring(direction === 'in' ? 0.88 : 1, { damping: 14, stiffness: 350, mass: 0.6 });
        if (target === 'up') {
            upScale.value = value;
        } else {
            downScale.value = value;
        }
    };

    const upStyle = useAnimatedStyle(() => ({ transform: [{ scale: upScale.value }] }));
    const downStyle = useAnimatedStyle(() => ({ transform: [{ scale: downScale.value }] }));

    return (
        <View style={styles.row}>
            <AnimatedPressable
                onPress={(e) => { stop(e); mediumImpact(); onVote('up'); }}
                onPressIn={() => animatePress('up', 'in')}
                onPressOut={() => animatePress('up', 'out')}
                hitSlop={10}
                style={[styles.btn, upStyle]}
                accessibilityRole="button"
                accessibilityLabel="Upvote"
            >
                <ThumbsUp
                    size={16}
                    color={userVote === 'up' ? theme.accent : theme.textTertiary}
                    fill={userVote === 'up' ? theme.accent : 'transparent'}
                    strokeWidth={2}
                />
            </AnimatedPressable>

            <Animated.View style={scoreStyle}>
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
            </Animated.View>

            <AnimatedPressable
                onPress={(e) => { stop(e); mediumImpact(); onVote('down'); }}
                onPressIn={() => animatePress('down', 'in')}
                onPressOut={() => animatePress('down', 'out')}
                hitSlop={10}
                style={[styles.btn, downStyle]}
                accessibilityRole="button"
                accessibilityLabel="Downvote"
            >
                <ThumbsDown
                    size={16}
                    color={userVote === 'down' ? theme.error : theme.textTertiary}
                    fill={userVote === 'down' ? theme.error : 'transparent'}
                    strokeWidth={2}
                />
            </AnimatedPressable>
        </View>
    );
}

const styles = StyleSheet.create({
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 2,
    },
    btn: {
        minHeight: 30,
        minWidth: 24,
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
