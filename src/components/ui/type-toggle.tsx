import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing, Weight, Typography } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

interface ToggleOption {
  label: string;
  value: string;
}

interface TypeToggleProps {
  options: [ToggleOption, ToggleOption];
  value: string;
  onChange: (value: string) => void;
}

export function TypeToggle({ options, value, onChange }: TypeToggleProps) {
  const theme = useTheme();

  return (
    <View style={styles.row}>
      {options.map((opt) => {
        const active = value === opt.value;
        return (
          <Pressable
            key={opt.value}
            onPress={() => onChange(opt.value)}
            style={[
              styles.btn,
              { backgroundColor: theme.surface, borderColor: theme.outline },
              active && { backgroundColor: theme.accent, borderColor: theme.outline },
            ]}
          >
            <ThemedText
              style={[
                styles.text,
                { color: theme.textSecondary },
                active && { color: theme.text, fontWeight: Weight.bold },
              ]}
            >
              {opt.label}
            </ThemedText>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: Spacing.lg,
  },
  btn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 2,
  },
  text: {
    fontSize: Typography.small,
    fontWeight: Weight.semibold,
  },
});
