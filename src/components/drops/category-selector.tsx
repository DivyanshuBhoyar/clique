import { useEffect, useRef } from 'react';
import { Pressable, ScrollView, StyleSheet, TextInput } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { DROP_CATEGORIES, type DropCategoryKey } from '@/constants/drops';
import { Radius, Spacing, Typography, Weight } from '@/constants/theme';
import { useReduceMotion } from '@/hooks/use-reduce-motion';
import { useTheme } from '@/hooks/use-theme';

interface CategorySelectorProps {
  selected: DropCategoryKey | 'other' | null;
  onSelect: (category: DropCategoryKey | 'other') => void;
  customValue: string;
  onCustomChange: (text: string) => void;
}

export function CategorySelector({
  selected,
  onSelect,
  customValue,
  onCustomChange,
}: CategorySelectorProps) {
  const theme = useTheme();
  const reduceMotion = useReduceMotion();
  const scrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    if (reduceMotion || DROP_CATEGORIES.length < 4) return;

    const nudgeOut = setTimeout(() => {
      scrollRef.current?.scrollTo({ x: 44, animated: true });
    }, 350);
    const nudgeBack = setTimeout(() => {
      scrollRef.current?.scrollTo({ x: 0, animated: true });
    }, 760);

    return () => {
      clearTimeout(nudgeOut);
      clearTimeout(nudgeBack);
    };
  }, [reduceMotion]);

  return (
    <>
      <ScrollView
        ref={scrollRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.chipsRow}
        style={styles.chipsScroller}
      >
        {DROP_CATEGORIES.map((cat) => (
          <Pressable
            key={cat.key}
            onPress={() => onSelect(cat.key)}
            style={[
              styles.chip,
              { backgroundColor: theme.surface, borderColor: theme.outline },
              selected === cat.key && {
                backgroundColor: theme.accent,
                borderColor: theme.outline,
              },
            ]}
          >
            <ThemedText
              style={[
                styles.chipText,
                { color: theme.textSecondary },
                selected === cat.key && { color: theme.text, fontWeight: Weight.bold },
              ]}
            >
              {cat.label}
            </ThemedText>
          </Pressable>
        ))}

        <Pressable
          onPress={() => onSelect('other')}
          style={[
            styles.chip,
            { backgroundColor: theme.surface, borderColor: theme.outlineLight },
            selected === 'other' && { backgroundColor: theme.accent, borderColor: theme.accent },
          ]}
        >
          <ThemedText
            style={[
              styles.chipText,
              { color: theme.textSecondary },
              selected === 'other' && { color: theme.text, fontWeight: Weight.bold },
            ]}
          >
            ✏️ Other
          </ThemedText>
        </Pressable>
      </ScrollView>

      {!reduceMotion && DROP_CATEGORIES.length >= 4 ? (
        <ThemedText type="caption" style={[styles.hintText, { color: theme.textSecondary }]}>
          Swipe to see more categories →
        </ThemedText>
      ) : null}

      {selected === 'other' && (
        <TextInput
          value={customValue}
          onChangeText={onCustomChange}
          placeholder="e.g. 🎮 Game, 🍕 Food..."
          placeholderTextColor={theme.placeholder}
          style={[styles.customInput, { color: theme.text, borderColor: theme.outlineLight, backgroundColor: theme.surface }]}
          maxLength={30}
        />
      )}
    </>
  );
}

const styles = StyleSheet.create({
  chipsScroller: {
    flexGrow: 0,
  },
  chipsRow: {
    flexDirection: 'row',
    gap: 8,
    paddingRight: Spacing.lg,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: Radius.lg,
    borderWidth: 2,
  },
  chipText: {
    fontSize: Typography.small,
    fontWeight: Weight.semibold,
  },
  hintText: {
    marginTop: Spacing.xs,
  },
  customInput: {
    marginTop: Spacing.two,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: Typography.body,
    borderWidth: 2,
    borderRadius: Radius.md,
  },
});
