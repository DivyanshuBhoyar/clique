import { ThemedText } from '@/components/themed-text';
import { Radius, Shadows, Spacing, Typography } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { StyleSheet, View } from 'react-native';

interface AuthHeroCardProps {
  emoji: string;
  title: string;
  subtitle: string;
}

export function AuthHeroCard({ emoji, title, subtitle }: AuthHeroCardProps) {
  const theme = useTheme();

  return (
    <View style={[styles.card, {
      backgroundColor: theme.accent,
      borderColor: theme.outline,
      shadowColor: theme.shadow,
      shadowOffset: Shadows.md.shadowOffset,
      shadowOpacity: Shadows.md.shadowOpacity,
      shadowRadius: Shadows.md.shadowRadius,
      elevation: 6,
    }]}>
      <ThemedText style={styles.emoji}>{emoji}</ThemedText>
      <ThemedText type="title" style={styles.centerText}>{title}</ThemedText>
      <ThemedText type="small" style={[styles.centerText, { color: theme.text, opacity: 0.75 }]}>
        {subtitle}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    alignItems: 'center',
    paddingVertical: Spacing.xxl,
    borderRadius: Radius.xl,
    borderWidth: 2,
    gap: Spacing.sm,
  },
  emoji: { fontSize: Typography.display, lineHeight: Typography.display * 1.2 },
  centerText: { textAlign: 'center' },
});
