import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing, Typography } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

interface EmptyStateProps {
  emoji: string;
  title: string;
  subtitle?: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function EmptyState({ emoji, title, subtitle, actionLabel, onAction }: EmptyStateProps) {
  const theme = useTheme();

  return (
    <View style={styles.container}>
      <ThemedText style={styles.emoji}>{emoji}</ThemedText>
      <ThemedText type="smallBold" style={{ textAlign: 'center' }}>{title}</ThemedText>
      {subtitle && (
        <ThemedText type="small" themeColor="textSecondary" style={styles.subtitle}>
          {subtitle}
        </ThemedText>
      )}
      {actionLabel && onAction && (
        <Pressable
          style={[styles.actionBtn, { backgroundColor: theme.accent, borderColor: theme.outline }]}
          onPress={onAction}
        >
          <ThemedText type="smallBold">{actionLabel}</ThemedText>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.xxl,
    paddingVertical: Spacing.huge,
    gap: Spacing.sm,
  },
  emoji: {
    fontSize: Typography.display,
    marginBottom: Spacing.xs,
  },
  subtitle: {
    textAlign: 'center',
    maxWidth: 260,
  },
  actionBtn: {
    marginTop: Spacing.md,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.sm + 2,
    borderRadius: Radius.md,
    borderWidth: 2,
  },
});
