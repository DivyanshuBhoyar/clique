/**
 * SegmentedControl — tab switcher with two visual variants:
 *
 * - 'filled'    (default): bordered pill with filled active tab — used for
 *                Event Scrapbook (Reflections / Photos / Links)
 * - 'underline': text-only tabs with animated underline indicator — used for
 *                Memory Wall (Wall / Events / Fun) and Notes (Mine / Ours)
 *
 * Usage:
 *   <SegmentedControl tabs={['Wall', 'Events', 'Fun']} activeIndex={0} onSelect={setTab} variant="underline" />
 *   <SegmentedControl tabs={['Reflections', 'Photos', 'Links']} activeIndex={0} onSelect={setTab} />
 */
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { useTheme } from '@/hooks/use-theme';
import { Radius, Spacing, Weight } from '@/constants/theme';

interface SegmentedControlProps {
  tabs: string[];
  activeIndex: number;
  onSelect: (index: number) => void;
  variant?: 'filled' | 'underline';
}

export function SegmentedControl({
  tabs,
  activeIndex,
  onSelect,
  variant = 'filled',
}: SegmentedControlProps) {
  const theme = useTheme();

  if (variant === 'underline') {
    return (
      <View
        style={[
          styles.underlineContainer,
          { borderBottomColor: theme.outlineLight },
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
                styles.underlineTab,
                isActive && {
                  borderBottomColor: theme.text,
                  borderBottomWidth: 2.5,
                },
              ]}
            >
              <ThemedText
                type="smallBold"
                style={{
                  color: isActive ? theme.text : theme.textSecondary,
                  fontWeight: isActive ? Weight.bold : Weight.medium,
                }}
              >
                {tab}
              </ThemedText>
            </Pressable>
          );
        })}
      </View>
    );
  }

  // 'filled' variant (default)
  return (
    <View
      style={[
        styles.filledContainer,
        {
          borderColor: theme.outline,
          borderRadius: Radius.md,
          backgroundColor: theme.surface,
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
              styles.filledSegment,
              {
                backgroundColor: isActive ? theme.accent : 'transparent',
                borderRightWidth: index < tabs.length - 1 ? 2 : 0,
                borderRightColor: theme.outline,
              },
            ]}
          >
            <ThemedText
              type="smallBold"
              style={{
                color: isActive ? theme.text : theme.textSecondary,
                fontWeight: isActive ? Weight.bold : Weight.regular,
              }}
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
  // Filled variant
  filledContainer: {
    flexDirection: 'row',
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.lg,
    marginBottom: Spacing.sm,
    borderWidth: 2,
    overflow: 'hidden',
  },
  filledSegment: {
    flex: 1,
    paddingVertical: Spacing.sm,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Underline variant
  underlineContainer: {
    flexDirection: 'row',
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.md,
    borderBottomWidth: 1.5,
  },
  underlineTab: {
    flex: 1,
    paddingVertical: Spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    borderBottomWidth: 0,
    marginBottom: -1.5, // overlap the container bottom border
  },
});
