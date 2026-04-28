import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { useTheme } from '@/hooks/use-theme';
import { Spacing } from '@/constants/theme';
import { formatCountdown } from '@/utils/time';

interface EphemeralCountdownProps {
    expiresAt: number;
}

export function EphemeralCountdown({ expiresAt }: EphemeralCountdownProps) {
    const theme = useTheme();
    const [remaining, setRemaining] = useState(expiresAt - Date.now());

    useEffect(() => {
        const interval = setInterval(() => {
            setRemaining(expiresAt - Date.now());
        }, 1000);
        return () => clearInterval(interval);
    }, [expiresAt]);

    if (remaining <= 0) return null;

    const isUrgent = remaining < 5 * 60 * 1000;

    return (
        <View style={[
            styles.countdownBar,
            {
                backgroundColor: isUrgent ? theme.errorSoft : theme.warningSoft,
                borderTopColor: isUrgent ? theme.error : theme.warning,
            },
        ]}>
            <Text style={[styles.countdownText, { color: isUrgent ? theme.error : theme.warning }]}>
                {isUrgent ? 'ends in ' : ''}{formatCountdown(remaining)}
            </Text>
        </View>
    );
}

const styles = StyleSheet.create({
    countdownBar: {
        paddingVertical: Spacing.xs,
        paddingHorizontal: Spacing.lg,
        alignItems: 'center',
        borderTopWidth: 2,
    },
    countdownText: {
        fontSize: 13,
        fontWeight: '600',
    },
});
