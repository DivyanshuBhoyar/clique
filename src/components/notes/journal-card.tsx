/**
 * JournalCard — hero card for today's daily journal entry.
 *
 * Design: warm cream surfaceWarm background, 2px border, book emoji, yellow accent badge.
 * Renders a CTA if no entry today, or "last edited X ago" if one exists.
 *
 * Usage: <JournalCard hasEntry={false} /> → "Write today's entry"
 *        <JournalCard hasEntry={true} lastUpdated={ts} /> → "Last edited 2 hrs ago"
 */
import { StyleSheet, View } from 'react-native';
import { ChevronRight } from 'lucide-react-native';

import { ThemedText } from '@/components/themed-text';
import { DashedSeparator } from '@/components/ui/dashed-separator';
import { Radius, Spacing, Typography, Weight } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { formatRelativeTime } from '@/utils/time';

interface JournalCardProps {
    hasEntry: boolean;
    lastUpdated?: number;
}

export function JournalCard({ hasEntry, lastUpdated }: JournalCardProps) {
    const theme = useTheme();

    const subtitleText = hasEntry
        ? `Last edited ${lastUpdated ? formatRelativeTime(lastUpdated) : 'recently'}`
        : "Write today's entry";

    return (
        <View
            style={[
                styles.card,
                {
                    borderColor: theme.outline,
                    backgroundColor: theme.surfaceWarm,
                },
            ]}
        >
            <View style={styles.top}>
                {/* Left: icon + text */}
                <View style={styles.left}>
                    <ThemedText style={styles.icon}>📓</ThemedText>
                    <View style={styles.textBlock}>
                        <ThemedText style={styles.title}>Daily Journal</ThemedText>
                        <ThemedText type="small" themeColor="textSecondary">
                            {subtitleText}
                        </ThemedText>
                    </View>
                </View>

                {/* Right: status badge + chevron */}
                <View style={styles.right}>
                    <View
                        style={[
                            styles.badge,
                            {
                                backgroundColor: hasEntry ? theme.accentSoft : theme.accent,
                                borderColor: theme.outline,
                            },
                        ]}
                    >
                        <ThemedText
                            type="caption"
                            style={{
                                color: hasEntry ? theme.accent : theme.text,
                                fontWeight: Weight.bold,
                            }}
                        >
                            {hasEntry ? 'Written ✓' : 'Today'}
                        </ThemedText>
                    </View>
                    <ChevronRight size={18} color={theme.textSecondary} strokeWidth={2} />
                </View>
            </View>

            {hasEntry && (
                <>
                    <DashedSeparator marginVertical={Spacing.sm} />
                    <ThemedText type="caption" themeColor="textSecondary">
                        Tap to continue writing…
                    </ThemedText>
                </>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    card: {
        width: '100%',
        padding: Spacing.lg,
        borderWidth: 2,
        borderRadius: Radius.lg,
    },
    top: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    left: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.md,
        flex: 1,
    },
    icon: {
        fontSize: Typography.heading,
    },
    textBlock: {
        flex: 1,
        gap: 2,
    },
    title: {
        fontSize: Typography.body,
        fontWeight: Weight.bold,
    },
    right: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.xs,
    },
    badge: {
        paddingHorizontal: Spacing.sm,
        paddingVertical: 3,
        borderRadius: Radius.full,
        borderWidth: 1.5,
    },
});
