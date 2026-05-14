import { useMemo } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { Radius, Shadows, Spacing, Typography, Weight } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

interface LoadingStateProps {
  fullScreen?: boolean;
  message?: string;
}

const PLAYFUL_MESSAGES = [
  'Gathering squad gossip…',
  'Warming up the group chat…',
  'Sorting the tea…',
  'Checking who brought snacks…',
];

export function LoadingState({ fullScreen = true, message }: LoadingStateProps) {
  const theme = useTheme();
  const loadingMessage = useMemo(
    () => message ?? PLAYFUL_MESSAGES[Math.floor(Math.random() * PLAYFUL_MESSAGES.length)],
    [message],
  );

  const indicator = (
    <View
      style={[
        styles.card,
        {
          backgroundColor: theme.surface,
          borderColor: theme.outline,
          shadowColor: theme.shadow,
        },
      ]}
      accessibilityRole="progressbar"
      accessibilityLabel={loadingMessage}
    >
      <ThemedText style={styles.emoji}>✨</ThemedText>
      <ActivityIndicator size="large" color={theme.accent} />
      <ThemedText type="bodyBold" style={styles.message}>
        {loadingMessage}
      </ThemedText>
      <ThemedText type="caption" themeColor="textSecondary" style={styles.subtext}>
        One tiny sec.
      </ThemedText>
    </View>
  );

  if (fullScreen) {
    return (
      <SafeAreaView style={[styles.fullScreen, { backgroundColor: theme.background }]}>
        {indicator}
      </SafeAreaView>
    );
  }

  return <View style={styles.inline}>{indicator}</View>;
}

const styles = StyleSheet.create({
  fullScreen: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
  },
  inline: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.lg,
  },
  card: {
    width: '100%',
    maxWidth: 320,
    alignItems: 'center',
    gap: Spacing.md,
    padding: Spacing.xl,
    borderWidth: 2,
    borderRadius: Radius.xl,
    shadowOffset: Shadows.md.offset,
    shadowOpacity: Shadows.md.opacity,
    shadowRadius: Shadows.md.radius,
    elevation: 3,
  },
  emoji: {
    fontSize: Typography.title,
    lineHeight: Typography.title + 6,
  },
  message: {
    textAlign: 'center',
    fontWeight: Weight.bold,
  },
  subtext: {
    textAlign: 'center',
  },
});
