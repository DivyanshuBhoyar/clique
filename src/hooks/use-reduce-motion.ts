import { useEffect, useState } from 'react';
import { AccessibilityInfo } from 'react-native';

/**
 * Returns true when the user has reduced motion enabled.
 * Subscribes to changes so the app reacts to settings toggles.
 */
export function useReduceMotion(): boolean {
    const [reduceMotion, setReduceMotion] = useState(false);

    useEffect(() => {
        AccessibilityInfo.isReduceMotionEnabled().then(setReduceMotion);
        const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduceMotion);
        return () => subscription.remove();
    }, []);

    return reduceMotion;
}
