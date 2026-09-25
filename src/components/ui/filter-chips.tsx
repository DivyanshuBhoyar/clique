/**
 * FilterChips — horizontal scrollable chip row for category/filter selection.
 *
 * Used in: Drops tab (All/Song/Movie/Book), Notes tab (All/Pinned/Recent/Mine)
 *
 * Usage:
 *   const CHIPS = [
 *     { label: 'All', emoji: '✨' },
 *     { label: 'Song', emoji: '🎵' },
 *   ];
 *   <FilterChips chips={CHIPS} activeIndex={0} onSelect={setActiveIndex} />
 */
import { ThemedText } from '@/components/themed-text';
import { BorderWidth, LineHeight, Radius, Spacing, Typography, Weight } from '@/constants/theme';
import { useReduceMotion } from '@/hooks/use-reduce-motion';
import { useTheme } from '@/hooks/use-theme';
import { useEffect, useRef } from 'react';
import { Pressable, ScrollView, StyleSheet } from 'react-native';

interface Chip {
  label: string;
  emoji?: string;
}

interface FilterChipsProps {
  chips: Chip[];
  activeIndex: number;
  onSelect: (index: number) => void;
}

export function FilterChips({ chips, activeIndex, onSelect }: FilterChipsProps) {
  const theme = useTheme();
  const reduceMotion = useReduceMotion();
  const scrollRef = useRef<ScrollView>(null);

  // One-time "peek" nudge on mount so it's obvious the row can be swiped —
  // scrolls a few px right then eases back to the start.
  useEffect(() => {
    if (reduceMotion || chips.length < 4) return;
    const nudgeOut = setTimeout(() => {
      scrollRef.current?.scrollTo({ x: 32, animated: true });
    }, 400);
    const nudgeBack = setTimeout(() => {
      scrollRef.current?.scrollTo({ x: 0, animated: true });
    }, 750);
    return () => {
      clearTimeout(nudgeOut);
      clearTimeout(nudgeBack);
    };
  }, [chips.length, reduceMotion]);

  return (
    <ScrollView
      ref={scrollRef}
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.scroll}
      style={styles.container}
    >
      {chips.map((chip, index) => {
        const isActive = index === activeIndex;
        return (
          <Pressable
            key={`${chip.label}-${index}`}
            onPress={() => onSelect(index)}
            accessibilityRole="button"
            accessibilityLabel={`Filter by ${chip.label}`}
            accessibilityState={{ selected: isActive }}
            style={({ pressed }) => [
              styles.chip,
              {
                backgroundColor: isActive ? theme.featureAccent : theme.surface,
                borderColor: isActive ? theme.featureAccent : theme.cardBorder,
              },
              pressed && styles.chipPressed,
            ]}
          >
            {chip.emoji ? (
              <ThemedText style={[styles.chipEmoji]}>
                {chip.emoji}
              </ThemedText>
            ) : null}
            <ThemedText
              style={[
                styles.chipLabel,
                { color: isActive ? '#FFFFFF' : theme.text },
              ]}
            >
              {chip.label}
            </ThemedText>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 0,
    overflow: 'visible',
  },
  scroll: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.sm + 2,
    paddingBottom: Spacing.sm + 2,
    gap: Spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs + 2,
    minHeight: 36,
    borderRadius: Radius.full,
    borderWidth: BorderWidth.thin,
    gap: 4,
  },
  chipEmoji: {
    fontSize: Typography.small,
    lineHeight: LineHeight.caption,
  },
  chipLabel: {
    fontSize: Typography.small,
    lineHeight: LineHeight.small,
    fontWeight: Weight.semibold,
  },
  chipPressed: {
    opacity: 0.8,
  },
});
