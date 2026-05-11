/**
 * CategoryChip — rounded pill showing a drop's category.
 *
 * Uses warm pastel tint from theme tokens (songBg/songText, movieBg/movieText, etc.)
 * Full pill shape (Radius.full) to match the cozy design system.
 *
 * Usage: <CategoryChip category="song" />  →  "Song 🎵"
 */
import { StyleSheet, View } from 'react-native';
import { useTheme } from '@/hooks/use-theme';
import { getCategoryLabel } from '@/constants/drops';
import { Radius, Spacing, Typography, Weight } from '@/constants/theme';
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
    size?: 'sm' | 'md';
}

export function CategoryChip({ category, size = 'sm' }: CategoryChipProps) {
    const theme = useTheme();
    const colors = getCategoryColors(theme, category);
    const label = getCategoryLabel(category);

    return (
        <View
            style={[
                styles.chip,
                {
                    backgroundColor: colors.bg,
                    borderColor: colors.text,
                    paddingHorizontal: size === 'md' ? Spacing.md : Spacing.sm,
                    paddingVertical: size === 'md' ? Spacing.xs + 2 : 3,
                },
            ]}
        >
            <ThemedText
                style={[
                    styles.label,
                    {
                        color: colors.text,
                        fontSize: size === 'md' ? Typography.small : Typography.caption,
                    },
                ]}
            >
                {label}
            </ThemedText>
        </View>
    );
}

const styles = StyleSheet.create({
    chip: {
        borderRadius: Radius.full,
        borderWidth: 1.5,
        alignSelf: 'flex-start',
    },
    label: {
        fontWeight: Weight.bold,
        letterSpacing: 0.2,
    },
});
