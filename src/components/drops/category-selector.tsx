import { Pressable, StyleSheet, TextInput, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { DROP_CATEGORIES, type DropCategoryKey } from '@/constants/drops';
import { Radius, Spacing, Typography, Weight } from '@/constants/theme';
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

  return (
    <>
      <View style={styles.chipsRow}>
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
              selected === 'other' && { color: '#fff' },
            ]}
          >
            ✏️ Other
          </ThemedText>
        </Pressable>
      </View>

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
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
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
  customInput: {
    marginTop: Spacing.two,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: Typography.body,
    borderWidth: 2,
    borderRadius: Radius.md,
  },
});
