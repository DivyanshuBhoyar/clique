import { useTheme } from '@/hooks/use-theme';
import { getCategoryLabel } from '@/constants/drops';
import { Radius, Spacing } from '@/constants/theme';
import { StyleSheet, View } from 'react-native';
import { ThemedText } from '@/components/themed-text';

type CategoryKey = 'song' | 'movie' | 'book' | 'lifehack' | 'quote' | 'random';

function getCategoryColors(theme: Record<string, string>, category: string) {
    const key = category as CategoryKey;
    return {
        bg: theme[`${key}Bg` as keyof typeof theme] ?? theme.backgroundElement,
        text: theme[`${key}Text` as keyof typeof theme] ?? theme.text,
    };
}

interface CategoryChipProps {
    category: string;
}

export function CategoryChip({ category }: CategoryChipProps) {
    const theme = useTheme();
    const colors = getCategoryColors(theme, category);

    return (
        <View style={[styles.chip, { backgroundColor: colors.bg, borderColor: colors.text }]}>
            <ThemedText type="caption" style={{ color: colors.text, fontWeight: '600' }}>
                {getCategoryLabel(category)}
            </ThemedText>
        </View>
    );
}

const styles = StyleSheet.create({
    chip: {
        paddingHorizontal: Spacing.sm,
        paddingVertical: Spacing.xs,
        borderRadius: Radius.sm,
        borderWidth: 1.5,
        overflow: 'hidden',
        alignSelf: 'flex-start',
    },
});
