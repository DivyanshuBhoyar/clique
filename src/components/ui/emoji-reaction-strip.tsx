/**
 * EmojiReactionStrip — horizontal row of emoji reaction pills with counts.
 *
 * Replaces: DropReactions, MessageReactions, and memory reactions.
 *
 * Usage:
 *   <EmojiReactionStrip
 *     reactions={[{ emoji: '❤️', count: 5, reacted: true }, ...]}
 *     onToggle={(emoji) => toggleReaction(itemId, emoji)}
 *     onAdd={() => setPickerOpen(true)}
 *   />
 *   <EmojiReactionStrip ... compact />   // smaller for chat bubbles
 */
import { ThemedText } from '@/components/themed-text';
import { LineHeight, Radius, Spacing, Typography, Weight } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { lightImpact } from '@/utils/haptics';
import { Plus } from 'lucide-react-native';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

export interface Reaction {
  emoji: string;
  count: number;
  reacted: boolean;
}

interface EmojiReactionStripProps {
  reactions: Reaction[];
  onToggle: (emoji: string) => void;
  onAdd?: () => void;
  compact?: boolean;
  wrap?: boolean; // wrap to next line instead of scrolling
  stacked?: boolean;
}

export function EmojiReactionStrip({
  reactions,
  onToggle,
  onAdd,
  compact = false,
  wrap = false,
  stacked = false,
}: EmojiReactionStripProps) {
  const theme = useTheme();
  const pillHeight = compact ? 28 : 34;
  const fontSize = compact ? 12 : 14;
  const paddingH = compact ? 7 : Spacing.md;

  const pills = reactions.map((r) => (
    <Pressable
      key={r.emoji}
      onPress={() => { lightImpact(); onToggle(r.emoji); }}
      hitSlop={8}
      accessibilityRole="button"
      accessibilityLabel={`${r.emoji} ${r.count} reactions, tap to ${r.reacted ? 'remove' : 'add'}`}
      style={({ pressed }) => [
        styles.pill,
        {
          height: pillHeight,
          paddingHorizontal: paddingH,
          borderColor: r.reacted ? theme.accent : theme.outline,
          backgroundColor: r.reacted ? theme.accentSoft : theme.surface,
        },
        pressed && styles.pillPressed,
      ]}
    >
      <ThemedText style={{ fontSize }}>{r.emoji}</ThemedText>
      <ThemedText
        style={[
          styles.pillCount,
          {
            fontSize: fontSize - 1,
            color: r.reacted ? theme.accent : theme.textSecondary,
            fontWeight: r.reacted ? Weight.bold : Weight.medium,
          },
        ]}
      >
        {r.count}
      </ThemedText>
    </Pressable>
  ));

  const addBtn = onAdd ? (
    <Pressable
      onPress={onAdd}
      hitSlop={8}
      accessibilityRole="button"
      accessibilityLabel="Add reaction"
      style={[
        styles.pill,
        styles.addBtn,
        {
          height: pillHeight,
          paddingHorizontal: paddingH,
          borderColor: theme.dashedBorder,
          borderStyle: 'dashed',
        },
      ]}
    >
      <Plus size={compact ? 12 : 14} color={theme.textSecondary} strokeWidth={2} />
    </Pressable>
  ) : null;

  if (wrap) {
    return (
      <View style={[styles.wrapContainer, stacked && styles.stackedContainer]}>
        {pills}
        {addBtn}
      </View>
    );
  }

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={[styles.scroll, { gap: Spacing.xs }]}
    >
      {pills}
      {addBtn}
    </ScrollView>
  );
}

interface EmojiReactionStackProps {
  reactions: Reaction[];
  onToggle: (emoji: string) => void;
  onAdd?: () => void;
  maxVisible?: number;
}

export function EmojiReactionStack({
  reactions,
  onToggle,
  onAdd,
  maxVisible = 3,
}: EmojiReactionStackProps) {
  const theme = useTheme();
  const visibleReactions = reactions.slice(0, maxVisible);
  const hiddenCount = Math.max(0, reactions.length - visibleReactions.length);
  const totalCount = reactions.reduce((total, reaction) => total + reaction.count, 0);

  return (
    <View style={styles.stackRow}>
      <View style={styles.stackFaces}>
        {visibleReactions.map((r, index) => (
          <Pressable
            key={r.emoji}
            onPress={() => { lightImpact(); onToggle(r.emoji); }}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel={`${r.emoji} ${r.count} reactions, tap to ${r.reacted ? 'remove' : 'add'}`}
            style={({ pressed }) => [
              styles.stackFace,
              {
                marginLeft: index === 0 ? 0 : -8,
                zIndex: visibleReactions.length - index,
                borderColor: r.reacted ? theme.accentDark : theme.surface,
                backgroundColor: r.reacted ? theme.accentSoft : theme.backgroundElement,
              },
              pressed && styles.pillPressed,
            ]}
          >
            <ThemedText style={styles.stackEmoji}>{r.emoji}</ThemedText>
          </Pressable>
        ))}
        {hiddenCount > 0 && (
          <Pressable
            onPress={onAdd}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel={`${hiddenCount} more reactions`}
            style={[
              styles.stackFace,
              styles.stackMore,
              {
                marginLeft: visibleReactions.length === 0 ? 0 : -8,
                zIndex: 0,
                borderColor: theme.surface,
                backgroundColor: theme.backgroundSelected,
              },
            ]}
          >
            <ThemedText style={[styles.stackMoreText, { color: theme.textSecondary }]}>
              +{hiddenCount}
            </ThemedText>
          </Pressable>
        )}
        {onAdd && hiddenCount === 0 && (
          <Pressable
            onPress={onAdd}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel="Add reaction"
            style={[
              styles.stackFace,
              styles.stackAdd,
              {
                marginLeft: visibleReactions.length === 0 ? 0 : -8,
                zIndex: 0,
                borderColor: theme.dashedBorder,
                backgroundColor: theme.backgroundElement,
              },
            ]}
          >
            <Plus size={12} color={theme.textSecondary} strokeWidth={2} />
          </Pressable>
        )}
      </View>
      {totalCount > 0 && (
        <ThemedText type="caption" themeColor="textSecondary" style={styles.stackCount}>
          {totalCount}
        </ThemedText>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  wrapContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.xs,
  },
  stackedContainer: {
    alignContent: 'flex-start',
    rowGap: Spacing.xs,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    borderRadius: Radius.full,
    borderWidth: 1.5,
  },
  pillCount: {
    lineHeight: LineHeight.caption,
  },
  addBtn: {
    // visual hint it's interactive
  },
  pillPressed: {
    opacity: 0.75,
  },
  stackRow: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 28,
  },
  stackFaces: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  stackFace: {
    width: 24,
    height: 24,
    borderRadius: Radius.full,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stackEmoji: {
    fontSize: Typography.caption,
    lineHeight: LineHeight.caption,
  },
  stackMore: {
    borderStyle: 'solid',
  },
  stackMoreText: {
    fontSize: Typography.caption,
    fontWeight: Weight.bold,
    lineHeight: LineHeight.caption,
  },
  stackAdd: {
    borderStyle: 'dashed',
  },
  stackCount: {
    marginLeft: 2,
    fontSize: Typography.caption,
    fontWeight: Weight.semibold,
    fontVariant: ['tabular-nums'],
  },
});
