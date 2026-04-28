import { StyleSheet, View } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { formatRelativeTime } from '@/utils/time';

interface JournalCardProps {
    hasEntry: boolean;
    lastUpdated?: number;
}

export function JournalCard({ hasEntry, lastUpdated }: JournalCardProps) {
    const theme = useTheme();
    const subtitle = hasEntry
        ? `Last edited ${lastUpdated ? formatRelativeTime(lastUpdated) : 'recently'}`
        : "Tap to write today's entry";

    return (
        <View style={[styles.card, { borderColor: theme.outline, backgroundColor: theme.surfaceWarm }]}>
            <View style={styles.iconColumn}>
                <ThemedText style={styles.icon}>{"📓"}</ThemedText>
            </View>
            <View style={styles.textColumn}>
                <ThemedText style={styles.title}>Daily Journal</ThemedText>
                <ThemedText type="small" themeColor="textSecondary">
                    {subtitle}
                </ThemedText>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    card: {
        width: '100%',
        flexDirection: 'row',
        alignItems: 'center',
        padding: Spacing.three,
        borderWidth: 2,
        borderRadius: Radius.md,
    },
    iconColumn: {
        marginRight: Spacing.three,
    },
    icon: {
        fontSize: 28,
    },
    textColumn: {
        flex: 1,
    },
    title: {
        fontSize: 16,
        fontWeight: '600',
    },
});
