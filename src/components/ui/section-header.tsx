import { ThemedText } from '@/components/themed-text';
import { Spacing, Weight, Typography } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { StyleSheet, Text, View } from 'react-native';

interface SectionHeaderProps {
  emoji: string;
  label: string;
}

export function SectionHeader({ emoji, label }: SectionHeaderProps) {
  const theme = useTheme();
  return (
    <View style={styles.row}>
      <Text style={styles.emoji}>{emoji}</Text>
      <ThemedText
        type="caption"
        style={{ letterSpacing: 1.2, fontWeight: Weight.extrabold, color: theme.textSecondary }}
      >
        {label}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs },
  emoji: { fontSize: Typography.small },
});
