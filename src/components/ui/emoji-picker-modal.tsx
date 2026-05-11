import { useMemo, useState } from 'react';
import {
    Modal,
    Pressable,
    ScrollView,
    StyleSheet,
    View,
} from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { EMOJI_LIBRARY } from '@/constants/emojis';
import { Radius, Spacing, Weight, LineHeight, Typography } from '@/constants/theme';
import { useMostUsedEmojis } from '@/hooks/use-most-used-emojis';
import { useTheme } from '@/hooks/use-theme';

interface EmojiPickerModalProps {
  visible: boolean;
  title?: string;
  onClose: () => void;
  onSelect: (emoji: string) => void;
}

const GRID_COLUMNS = 8;

type EmojiCategory = 'all' | 'smileys' | 'hearts' | 'gestures' | 'nature' | 'symbols';

const CATEGORY_OPTIONS: { id: EmojiCategory; label: string; emoji: string }[] = [
  { id: 'all', label: 'All', emoji: '✨' },
  { id: 'smileys', label: 'Smileys', emoji: '😀' },
  { id: 'hearts', label: 'Hearts', emoji: '❤️' },
  { id: 'gestures', label: 'Gestures', emoji: '👍' },
  { id: 'nature', label: 'Nature', emoji: '🌈' },
  { id: 'symbols', label: 'Symbols', emoji: '💬' },
];

function matchesCategory(label: string, category: EmojiCategory): boolean {
  if (category === 'all') return true;

  const value = label.toLowerCase();

  if (category === 'hearts') {
    return value.includes('heart');
  }

  if (category === 'gestures') {
    return (
      value.includes('hand') ||
      value.includes('thumb') ||
      value.includes('finger') ||
      value.includes('point') ||
      value.includes('clapping') ||
      value.includes('folded') ||
      value.includes('biceps') ||
      value.includes('gesture') ||
      value.includes('salute') ||
      value.includes('wave') ||
      value.includes('handshake')
    );
  }

  if (category === 'nature') {
    return (
      value.includes('sun') ||
      value.includes('rainbow') ||
      value.includes('cloud') ||
      value.includes('rain') ||
      value.includes('moon') ||
      value.includes('star') ||
      value.includes('fire') ||
      value.includes('lightning')
    );
  }

  if (category === 'smileys') {
    return (
      value.includes('face') ||
      value.includes('cat') ||
      value.includes('devil') ||
      value.includes('ghost') ||
      value.includes('alien') ||
      value.includes('robot') ||
      value.includes('ogre') ||
      value.includes('goblin') ||
      value.includes('clown') ||
      value.includes('poo') ||
      value.includes('skull') ||
      value.includes('monkey')
    );
  }

  // symbols
  return !(
    matchesCategory(value, 'smileys') ||
    matchesCategory(value, 'hearts') ||
    matchesCategory(value, 'gestures') ||
    matchesCategory(value, 'nature')
  );
}

export function EmojiPickerModal({
  visible,
  title = 'Pick an emoji',
  onClose,
  onSelect,
}: EmojiPickerModalProps) {
  const theme = useTheme();
  const [activeCategory, setActiveCategory] = useState<EmojiCategory>('all');
  const { mostUsedEmojis, recordEmojiUsage } = useMostUsedEmojis(12);

  const uniqueLibrary = useMemo(
    () => Array.from(new Map(EMOJI_LIBRARY.map((entry) => [entry.emoji, entry])).values()),
    [],
  );

  const filtered = useMemo(() => {
    return uniqueLibrary.filter((entry) => matchesCategory(entry.label, activeCategory));
  }, [activeCategory, uniqueLibrary]);

  const handleSelect = (emoji: string) => {
    recordEmojiUsage(emoji);
    onSelect(emoji);
    onClose();
  };

  const rows = useMemo(() => {
    const data = filtered.map((entry) => entry.emoji);
    const result: string[][] = [];

    for (let i = 0; i < data.length; i += GRID_COLUMNS) {
      result.push(data.slice(i, i + GRID_COLUMNS));
    }

    return result;
  }, [filtered]);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View
          style={[
            styles.sheet,
            {
              backgroundColor: theme.surface,
              borderColor: theme.outline,
            },
          ]}
        >
          <View style={[styles.header, { borderBottomColor: theme.outlineLight }]}>
            <ThemedText type="bodyBold">{title}</ThemedText>
            <Pressable onPress={onClose} hitSlop={8} accessibilityLabel="Close emoji picker">
              <ThemedText style={{ color: theme.accent, fontWeight: Weight.semibold }}>Close</ThemedText>
            </Pressable>
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.categorySection}
            contentContainerStyle={styles.categoryRow}
          >
            {CATEGORY_OPTIONS.map((category) => {
              const isActive = category.id === activeCategory;
              return (
                <Pressable
                  key={category.id}
                  onPress={() => setActiveCategory(category.id)}
                  style={[
                    styles.categoryChip,
                    {
                      borderColor: isActive ? theme.outline : theme.outlineLight,
                      backgroundColor: isActive ? theme.accentSoft : theme.surface,
                    },
                  ]}
                >
                  <ThemedText style={styles.categoryEmoji}>{category.emoji}</ThemedText>
                  <ThemedText
                    type="small"
                    style={{
                      color: isActive ? theme.text : theme.textSecondary,
                      fontWeight: isActive ? Weight.bold : Weight.medium,
                      fontSize: Typography.small,
                      lineHeight: LineHeight.small,
                    }}
                  >
                    {category.label}
                  </ThemedText>
                </Pressable>
              );
            })}
          </ScrollView>

          {mostUsedEmojis.length > 0 && (
            <View style={styles.mostUsedBlock}>
              <ThemedText type="caption" themeColor="textSecondary" style={styles.sectionLabel}>
                Most used
              </ThemedText>
              <View style={styles.mostUsedRow}>
                {mostUsedEmojis.map((emoji) => (
                  <Pressable
                    key={emoji}
                    onPress={() => handleSelect(emoji)}
                    style={[styles.emojiButton, { borderColor: theme.outlineLight }]}
                  >
                    <ThemedText style={styles.emoji}>{emoji}</ThemedText>
                  </Pressable>
                ))}
              </View>
            </View>
          )}

          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.gridContainer}
          >
            {rows.map((row, rowIndex) => (
              <View key={rowIndex} style={styles.gridRow}>
                {row.map((emoji) => (
                  <Pressable
                    key={`${rowIndex}-${emoji}`}
                    onPress={() => handleSelect(emoji)}
                    style={[styles.emojiButton, { borderColor: theme.outlineLight }]}
                  >
                    <ThemedText style={styles.emoji}>{emoji}</ThemedText>
                  </Pressable>
                ))}
                {Array.from({ length: GRID_COLUMNS - row.length }).map((_, index) => (
                  <View key={`spacer-${rowIndex}-${index}`} style={styles.emojiButtonSpacer} />
                ))}
              </View>
            ))}

            {rows.length === 0 && (
              <View style={styles.emptyState}>
                <ThemedText type="small" themeColor="textSecondary">
                  No emoji found in this category.
                </ThemedText>
              </View>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
  },
  sheet: {
    maxHeight: '78%',
    borderTopLeftRadius: Radius.xl,
    borderTopRightRadius: Radius.xl,
    borderWidth: 1.5,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.xl,
    gap: Spacing.sm,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    paddingBottom: Spacing.sm,
  },
  mostUsedBlock: {
    gap: Spacing.xs,
  },
  sectionLabel: {
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  mostUsedRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.xs,
  },
  categoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingHorizontal: Spacing.xs,
    paddingTop: Spacing.xs + 2,
    paddingBottom: Spacing.xs + 2,
  },
  categorySection: {
    marginTop: Spacing.sm,
    marginBottom: Spacing.sm,
    overflow: 'visible',
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs + 4,
    minHeight: 36,
    borderRadius: Radius.full,
    borderWidth: 1.5,
  },
  categoryEmoji: {
    fontSize: Typography.body,
    lineHeight: LineHeight.small,
  },
  gridContainer: {
    paddingBottom: Spacing.xxxl,
    gap: Spacing.xs,
  },
  gridRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: Spacing.xs,
  },
  emojiButton: {
    width: 38,
    height: 38,
    borderRadius: Radius.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emojiButtonSpacer: {
    width: 38,
    height: 38,
  },
  emoji: {
    fontSize: Typography.subtitle,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: Spacing.xl,
  },
});
