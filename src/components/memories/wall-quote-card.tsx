import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { LineHeight, Radius, Spacing, Typography, Weight } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

interface WallQuoteCardProps {
  content: string;
  title?: string;
}

export function WallQuoteCard({ content, title }: WallQuoteCardProps) {
  const theme = useTheme();

  return (
    <View style={[styles.card, { backgroundColor: theme.accent, borderColor: theme.outline }]}>
      <View style={styles.header}>
        <ThemedText style={styles.quoteMark}>{'“'}</ThemedText>
        <View style={[styles.badge, { backgroundColor: theme.surface, borderColor: theme.outline }]}>
          <ThemedText type="caption" style={{ fontWeight: Weight.bold }}>Quote</ThemedText>
        </View>
      </View>
      <ThemedText style={styles.text}>{content}</ThemedText>
      {title && (
        <ThemedText type="small" themeColor="textSecondary" style={styles.attribution}>
          {'—'} {title}
        </ThemedText>
      )}
      <ThemedText style={[styles.quoteMark, styles.quoteMarkEnd]}>{'”'}</ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: Spacing.lg,
    borderRadius: Radius.md,
    borderWidth: 2,
    position: 'relative',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: Spacing.sm,
  },
  quoteMark: {
    fontSize: Typography.display,
    fontWeight: Weight.bold,
    lineHeight: LineHeight.display,
    opacity: 0.3,
  },
  quoteMarkEnd: {
    textAlign: 'right',
    marginTop: Spacing.xs,
  },
  badge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
    borderRadius: Radius.sm,
    borderWidth: 1.5,
  },
  text: {
    fontSize: Typography.subtitle,
    fontWeight: Weight.bold,
    lineHeight: LineHeight.heading,
    textAlign: 'center',
    paddingHorizontal: Spacing.md,
  },
  attribution: {
    textAlign: 'center',
    marginTop: Spacing.sm,
    fontStyle: 'italic',
  },
});
