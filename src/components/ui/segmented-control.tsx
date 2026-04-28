import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { useTheme } from '@/hooks/use-theme';
import { Radius, Spacing } from '@/constants/theme';

interface SegmentedControlProps {
  tabs: string[];
  activeIndex: number;
  onSelect: (index: number) => void;
}

export function SegmentedControl({ tabs, activeIndex, onSelect }: SegmentedControlProps) {
  const theme = useTheme();

  return (
    <View
      style={[
        styles.container,
        {
          borderColor: theme.outline,
          borderRadius: Radius.md,
        },
      ]}
    >
      {tabs.map((tab, index) => {
        const isActive = activeIndex === index;
        return (
          <Pressable
            key={tab}
            onPress={() => onSelect(index)}
            accessibilityRole="tab"
            accessibilityState={{ selected: isActive }}
            accessibilityLabel={tab}
            style={[
              styles.segment,
              {
                backgroundColor: isActive ? theme.accent : theme.surface,
                borderRightWidth: index < tabs.length - 1 ? 2 : 0,
                borderRightColor: theme.outline,
              },
            ]}
          >
            <ThemedText
              type="smallBold"
              style={{ color: isActive ? '#ffffff' : theme.textSecondary }}
            >
              {tab}
            </ThemedText>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.lg,
    marginBottom: Spacing.sm,
    borderWidth: 2,
    overflow: 'hidden',
  },
  segment: {
    flex: 1,
    paddingVertical: Spacing.sm,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
