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
 *   <EmojiReactionStrip ... chat />      // chat variant: surface bg + hairline border
 */
import { ThemedText } from '@/components/themed-text';
import { LineHeight, Radius, Spacing, Typography, Weight } from '@/constants/theme';
import { useReduceMotion } from '@/hooks/use-reduce-motion';
import { useTheme } from '@/hooks/use-theme';
import { lightImpact } from '@/utils/haptics';
import { Plus } from 'lucide-react-native';
import { useEffect } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';

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
  /** Chat variant: pills sit on --bg-surface with a --border hairline (chat refinement). */
  chat?: boolean;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

function AnimatedPill({
  reaction,
  compact,
  chat,
  onToggle,
}: {
  reaction: Reaction;
  compact: boolean;
  chat: boolean;
  onToggle: (emoji: string) => void;
}) {
  const theme = useTheme();
  const reduceMotion = useReduceMotion();
  const scale = useSharedValue(1);
  const pillHeight = compact ? 28 : 34;
  const fontSize = compact ? 12 : 14;
  const paddingH = compact ? 7 : Spacing.md;

  useEffect(() => {
    if (!reaction.reacted) {
      scale.value = withTiming(1, { duration: 120 });
      return;
    }
    scale.value = reduceMotion
      ? withTiming(1.04, { duration: 120 }, () => {
          scale.value = withTiming(1, { duration: 120 });
        })
      : withSpring(1.06, { damping: 10, stiffness: 400, mass: 0.5 }, () => {
          scale.value = withSpring(1, { damping: 14, stiffness: 300, mass: 0.5 });
        });
  }, [reaction.reacted, reaction.emoji, reduceMotion, scale]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <AnimatedPressable
      onPress={() => { lightImpact(); onToggle(reaction.emoji); }}
      hitSlop={8}
      accessibilityRole="button"
      accessibilityLabel={`${reaction.emoji} ${reaction.count} reactions, tap to ${reaction.reacted ? 'remove' : 'add'}`}
      style={({ pressed }) => [
        styles.pill,
        animatedStyle,
        {
          height: pillHeight,
          paddingHorizontal: paddingH,
          borderWidth: chat ? 1 : 1.5,
          borderColor: reaction.reacted
            ? (chat ? theme.chatAccent : theme.accent)
            : (chat ? theme.chatBorder : theme.outline),
          backgroundColor: reaction.reacted
            ? (chat ? theme.chatAccentTint : theme.accentSoft)
            : (chat ? theme.chatSurface : theme.surface),
        },
        chat && styles.chatPillShadow,
        pressed && styles.pillPressed,
      ]}
    >
      <Text style={{ fontSize, color: chat ? theme.chatBubbleInText : theme.text }}>
        {reaction.emoji}
        <Text
          style={[
            styles.pillCount,
            {
              fontSize: fontSize - 1,
              color: reaction.reacted
                ? (chat ? theme.chatAccent : theme.accent)
                : (chat ? theme.chatTextMuted : theme.textSecondary),
              fontWeight: reaction.reacted ? Weight.bold : Weight.medium,
            },
          ]}
        >
          {'  '}
          {reaction.count}
        </Text>
      </Text>
    </AnimatedPressable>
  );
}

export function EmojiReactionStrip({
  reactions,
  onToggle,
  onAdd,
  compact = false,
  wrap = false,
  stacked = false,
  chat = false,
}: EmojiReactionStripProps) {
  const theme = useTheme();
  const pillHeight = compact ? 28 : 34;
  const paddingH = compact ? 7 : Spacing.md;

  const pills = reactions.map((r) => (
    <AnimatedPill key={r.emoji} reaction={r} compact={compact} chat={chat} onToggle={onToggle} />
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
          borderWidth: chat ? 1 : 1.5,
          borderColor: chat ? theme.chatBorder : theme.dashedBorder,
          borderStyle: 'dashed',
        },
        chat && styles.chatPillShadow,
      ]}
    >
      <Plus size={compact ? 12 : 14} color={chat ? theme.chatTextMuted : theme.textSecondary} strokeWidth={2} />
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

function AnimatedStackFace({
  reaction,
  index,
  total,
  onToggle,
}: {
  reaction: Reaction;
  index: number;
  total: number;
  onToggle: (emoji: string) => void;
}) {
  const theme = useTheme();
  const reduceMotion = useReduceMotion();
  const scale = useSharedValue(1);

  useEffect(() => {
    if (!reaction.reacted) {
      scale.value = withTiming(1, { duration: 120 });
      return;
    }
    scale.value = reduceMotion
      ? withTiming(1.08, { duration: 120 }, () => {
          scale.value = withTiming(1, { duration: 120 });
        })
      : withSpring(1.12, { damping: 10, stiffness: 400, mass: 0.5 }, () => {
          scale.value = withSpring(1, { duration: 120 });
        });
  }, [reaction.reacted, reaction.emoji, reduceMotion, scale]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <AnimatedPressable
      key={reaction.emoji}
      onPress={() => { lightImpact(); onToggle(reaction.emoji); }}
      hitSlop={8}
      accessibilityRole="button"
      accessibilityLabel={`${reaction.emoji} ${reaction.count} reactions, tap to ${reaction.reacted ? 'remove' : 'add'}`}
      style={({ pressed }) => [
        styles.stackFace,
        animatedStyle,
        {
          marginLeft: index === 0 ? 0 : -8,
          zIndex: total - index,
          borderColor: reaction.reacted ? theme.accentDark : theme.surface,
          backgroundColor: reaction.reacted ? theme.accentSoft : theme.backgroundElement,
        },
        pressed && styles.pillPressed,
      ]}
    >
      <ThemedText style={styles.stackEmoji}>{reaction.emoji}</ThemedText>
    </AnimatedPressable>
  );
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
          <AnimatedStackFace
            key={r.emoji}
            reaction={r}
            index={index}
            total={visibleReactions.length}
            onToggle={onToggle}
          />
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
  chatPillShadow: {
    // Lift chat pills off the bubble/canvas so the tuck reads as floating, not glued
    shadowColor: '#4A3512',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
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
