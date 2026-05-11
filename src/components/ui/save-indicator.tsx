import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

interface SaveIndicatorProps {
  status: 'idle' | 'saving' | 'saved';
}

export function SaveIndicator({ status }: SaveIndicatorProps) {
  const theme = useTheme();

  if (status === 'idle') return null;

  const label = status === 'saving'
    ? '● Saving…'
    : '● Auto-saved · just now';

  return (
    <View style={[styles.footer, { borderTopColor: theme.outlineLight }]}>
      <ThemedText type="caption" style={{ color: status === 'saved' ? '#4CAF50' : theme.textSecondary }}>
        {label}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  footer: {
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    borderTopWidth: 1,
    alignItems: 'center',
  },
});
