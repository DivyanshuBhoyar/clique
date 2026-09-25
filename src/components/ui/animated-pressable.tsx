import { ReactNode } from 'react';
import { Pressable, PressableProps, StyleProp, ViewStyle } from 'react-native';
import Animated, {
    useAnimatedStyle,
    useSharedValue,
    withSpring,
    withTiming,
} from 'react-native-reanimated';

import { useReduceMotion } from '@/hooks/use-reduce-motion';

interface AnimatedPressableProps extends Omit<PressableProps, 'style' | 'children'> {
    children: ReactNode;
    style?: StyleProp<ViewStyle>;
    pressedScale?: number;
    pressedTranslateY?: number;
    onPressInHaptic?: () => void;
}

const AnimatedView = Animated.createAnimatedComponent(Pressable);

/**
 * Pressable wrapper that gives tactile press feedback via scale/translateY.
 * Respects reduced motion and preserves accessibility props.
 */
export function AnimatedPressable({
    children,
    style,
    pressedScale = 0.97,
    pressedTranslateY = 1,
    onPressInHaptic,
    onPressIn,
    onPressOut,
    disabled,
    ...props
}: AnimatedPressableProps) {
    const reduceMotion = useReduceMotion();
    const pressed = useSharedValue(0);

    const animatedStyle = useAnimatedStyle(() => {
        const scale = 1 - (1 - pressedScale) * pressed.value;
        const translateY = pressedTranslateY * pressed.value;
        return {
            transform: [{ scale }, { translateY }],
        };
    });

    const handlePressIn = (event: Parameters<NonNullable<PressableProps['onPressIn']>>[0]) => {
        if (disabled) return;
        pressed.value = reduceMotion
            ? withTiming(1, { duration: 80 })
            : withSpring(1, { damping: 20, stiffness: 300, mass: 0.6 });
        onPressInHaptic?.();
        onPressIn?.(event);
    };

    const handlePressOut = (event: Parameters<NonNullable<PressableProps['onPressOut']>>[0]) => {
        pressed.value = reduceMotion
            ? withTiming(0, { duration: 80 })
            : withSpring(0, { damping: 20, stiffness: 300, mass: 0.6 });
        onPressOut?.(event);
    };

    return (
        <AnimatedView
            {...props}
            disabled={disabled}
            onPressIn={handlePressIn}
            onPressOut={handlePressOut}
            style={[style, animatedStyle]}
        >
            {children}
        </AnimatedView>
    );
}
