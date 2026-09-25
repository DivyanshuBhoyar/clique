import { ThemedText } from '@/components/themed-text';
import { LineHeight, Radius, Spacing, Typography } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface EmptySectionCardProps {
  emoji: string;
  title: string;
  subtitle: string;
  onPress?: () => void;
}

export function EmptySectionCard({ emoji, title, subtitle, onPress }: EmptySectionCardProps) {
  const theme = useTheme();

  const content = (
    <>
      <Text style={styles.emoji}>{emoji}</Text>
      <ThemedText type="bodyBold">{title}</ThemedText>
      <ThemedText type="small" themeColor="textSecondary">
        {subtitle}
      </ThemedText>
    </>
  );

  if (onPress) {
    return (
      <TouchableOpacity
        onPress={onPress}
        style={[styles.card, { borderColor: theme.outlineLight, backgroundColor: theme.surface }]}
        activeOpacity={0.7}
      >
        {content}
      </TouchableOpacity>
    );
  }

  return (
    <View style={[styles.card, { borderColor: theme.outlineLight, backgroundColor: theme.surface }]}>
      {content}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 2,
    borderRadius: Radius.xl,
    padding: Spacing.xl,
    alignItems: 'center',
    gap: Spacing.xs,
    borderStyle: 'dashed',
  },
  emoji: {
    fontSize: Typography.heading,
    lineHeight: LineHeight.heading,
  },
});
