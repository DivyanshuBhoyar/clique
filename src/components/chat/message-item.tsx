/**
 * MessageItem — renders a single chat bubble.
 *
 * Design from mockup:
 *   Own messages  → right-aligned, golden yellow bubble, black text, no border
 *   Others' msgs  → left-aligned, white bubble, 2px black border, avatar on left
 *
 * Nickname shown above bubble for others (not own).
 * Reactions shown below bubble using EmojiReactionStrip (compact).
 * Timestamp shown below reactions.
 *
 * Learning note: "inverted FlatList" renders items bottom-up. This means
 * the newest message appears at the bottom without needing to scroll.
 * The list data is still ordered newest-first from Convex.
 */
import { useMemo, useRef } from 'react';
import { Animated, Image, PanResponder, Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { EmojiReactionStrip } from '@/components/ui/emoji-reaction-strip';
import { UserAvatar } from '@/components/user-avatar';
import { LineHeight, Radius, Spacing, Typography, Weight } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { lightImpact } from '@/utils/haptics';

interface Reaction {
  emoji: string;
  userId: string;
}

interface ParentMessagePreview {
  nickname?: string;
  content: string;
  type?: 'text' | 'image' | 'system';
  deleted?: boolean;
}

interface MessageItemProps {
  messageId: string;
  nickname?: string;
  avatarUrl?: string | null;
  content: string;
  createdAt: number;
  editedAt?: number;
  deleted?: boolean;
  parentMessage?: ParentMessagePreview | null;
  isOwnMessage: boolean;
  reactions?: Reaction[];
  currentUserId?: string;
  imageUrl?: string | null;
  seenByText?: string | null;
  onToggleReaction?: (messageId: string, emoji: string) => void;
  onLongPress?: () => void;
  onSwipeReply?: () => void;
  onImagePress?: (imageUrl: string) => void;
}

export function MessageItem({
  messageId,
  nickname,
  avatarUrl,
  content,
  createdAt,
  editedAt,
  deleted,
  parentMessage,
  isOwnMessage,
  reactions = [],
  currentUserId,
  imageUrl,
  seenByText,
  onToggleReaction,
  onLongPress,
  onSwipeReply,
  onImagePress,
}: MessageItemProps) {
  const theme = useTheme();
  const translateX = useRef(new Animated.Value(0)).current;
  const didTriggerReply = useRef(false);

  const replyCueOpacity = translateX.interpolate({
    inputRange: [0, 24, 64],
    outputRange: [0, 0.55, 1],
    extrapolate: 'clamp',
  });

  const panResponder = useMemo(
    () => PanResponder.create({
      onMoveShouldSetPanResponder: (_, gesture) => {
        if (!onSwipeReply || deleted) return false;
        return gesture.dx > 14 && Math.abs(gesture.dx) > Math.abs(gesture.dy) * 1.5;
      },
      onPanResponderMove: (_, gesture) => {
        const nextX = Math.max(0, Math.min(gesture.dx, 84));
        translateX.setValue(nextX);
        if (nextX >= 64 && !didTriggerReply.current) {
          didTriggerReply.current = true;
          lightImpact();
        }
      },
      onPanResponderRelease: (_, gesture) => {
        if (gesture.dx >= 64 && onSwipeReply && !deleted) {
          onSwipeReply();
        }
        didTriggerReply.current = false;
        Animated.spring(translateX, {
          toValue: 0,
          useNativeDriver: true,
          friction: 7,
          tension: 70,
        }).start();
      },
      onPanResponderTerminate: () => {
        didTriggerReply.current = false;
        Animated.spring(translateX, {
          toValue: 0,
          useNativeDriver: true,
          friction: 7,
          tension: 70,
        }).start();
      },
    }),
    [deleted, onSwipeReply, translateX],
  );

  const time = new Date(createdAt).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });

  // Group reactions by emoji for EmojiReactionStrip format
  const groupedReactions = (() => {
    const map = new Map<string, { count: number; reacted: boolean }>();
    for (const r of reactions) {
      const existing = map.get(r.emoji) ?? { count: 0, reacted: false };
      existing.count++;
      if (r.userId === currentUserId) existing.reacted = true;
      map.set(r.emoji, existing);
    }
    return [...map.entries()].map(([emoji, { count, reacted }]) => ({
      emoji,
      count,
      reacted,
    }));
  })();

  return (
    <View style={styles.swipeShell}>
      {onSwipeReply ? (
        <Animated.View style={[styles.replyCue, { opacity: replyCueOpacity }]}>
          <ThemedText type="caption" style={[styles.replyCueText, { color: theme.accent }]}>↩ Reply</ThemedText>
        </Animated.View>
      ) : null}
      <Animated.View style={{ transform: [{ translateX }] }} {...panResponder.panHandlers}>
        <Pressable onLongPress={onLongPress} delayLongPress={300}>
          <View style={[styles.row, isOwnMessage && styles.rowRight]}>
        {/* Avatar — only shown for others' messages */}
        {!isOwnMessage && (
          <View style={styles.avatarWrap}>
            <UserAvatar uri={avatarUrl} size={30} fallbackText={nickname} />
          </View>
        )}

        <View style={[styles.bubbleCol, isOwnMessage && styles.bubbleColRight]}>
          {/* Nickname label above bubble (others only) */}
          {!isOwnMessage && nickname && (
            <ThemedText
              type="caption"
              style={[styles.nickname, { color: theme.textSecondary }]}
            >
              {nickname}
            </ThemedText>
          )}

          {/* Message bubble */}
          <View
            style={[
              styles.bubble,
              {
                backgroundColor: isOwnMessage ? theme.bubbleOwn : theme.bubbleOther,
                borderWidth: isOwnMessage ? 0 : 1.5,
                borderColor: theme.outline,
                // Rounded except the corner nearest the avatar/sender
                borderTopLeftRadius: Radius.lg,
                borderTopRightRadius: Radius.lg,
                borderBottomLeftRadius: isOwnMessage ? Radius.lg : 4,
                borderBottomRightRadius: isOwnMessage ? 4 : Radius.lg,
              },
            ]}
          >
            {parentMessage ? (
              <View
                style={[
                  styles.replyPreview,
                  {
                    backgroundColor: isOwnMessage ? 'rgba(255,255,255,0.28)' : theme.backgroundElement,
                    borderLeftColor: isOwnMessage ? theme.text : theme.accent,
                  },
                ]}
              >
                <ThemedText
                  type="caption"
                  style={[styles.replyName, { color: isOwnMessage ? theme.text : theme.textSecondary }]}
                  numberOfLines={1}
                >
                  ↪ {parentMessage.nickname ?? 'someone'}
                </ThemedText>
                <ThemedText
                  style={[styles.replyContent, { color: isOwnMessage ? theme.text : theme.textSecondary }]}
                  numberOfLines={2}
                >
                  {parentMessage.deleted
                    ? 'Message deleted'
                    : parentMessage.type === 'image'
                      ? parentMessage.content || '📷 Photo'
                      : parentMessage.content}
                </ThemedText>
              </View>
            ) : null}

            {deleted ? (
              <ThemedText
                type="small"
                style={{ color: isOwnMessage ? 'rgba(0,0,0,0.4)' : theme.textTertiary, fontStyle: 'italic' }}
              >
                Message deleted
              </ThemedText>
            ) : imageUrl ? (
              <Pressable onPress={() => onImagePress?.(imageUrl)}>
                <Image
                  source={{ uri: imageUrl }}
                  style={styles.image}
                  resizeMode="cover"
                  accessibilityLabel="Photo message"
                />
                {content ? (
                  <ThemedText
                    style={[styles.content, { color: isOwnMessage ? theme.bubbleOwnText : theme.bubbleOtherText, marginTop: 4 }]}
                  >
                    {content}
                  </ThemedText>
                ) : null}
              </Pressable>
            ) : (
              <ThemedText
                style={[
                  styles.content,
                  { color: isOwnMessage ? theme.bubbleOwnText : theme.bubbleOtherText },
                ]}
              >
                {content}
              </ThemedText>
            )}
          </View>

          {/* Reactions below bubble */}
          {groupedReactions.length > 0 && (
            <View style={[styles.reactionsWrap, isOwnMessage && styles.reactionsRight]}>
              <EmojiReactionStrip
                reactions={groupedReactions}
                onToggle={(emoji) => onToggleReaction?.(messageId, emoji)}
                compact
                wrap
              />
            </View>
          )}

          {/* Timestamp + edited */}
          <ThemedText
            type="caption"
            style={[
              styles.time,
              { color: theme.textTertiary },
              isOwnMessage && styles.timeRight,
            ]}
          >
            {time}{editedAt ? ' · edited' : ''}
          </ThemedText>

          {seenByText ? (
            <ThemedText
              type="caption"
              style={[styles.seenBy, { color: theme.textTertiary }, isOwnMessage && styles.timeRight]}
              numberOfLines={1}
            >
              👁 {seenByText}
            </ThemedText>
          ) : null}
        </View>
          </View>
        </Pressable>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  swipeShell: {
    position: 'relative',
  },
  replyCue: {
    position: 'absolute',
    left: Spacing.lg,
    top: 0,
    bottom: Spacing.sm,
    justifyContent: 'center',
  },
  replyCueText: {
    fontWeight: Weight.bold,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: Spacing.xs,
    marginBottom: Spacing.sm,
    paddingHorizontal: Spacing.md,
  },
  rowRight: {
    justifyContent: 'flex-end',
  },
  avatarWrap: {
    marginBottom: 18, // align with bottom of bubble (above time)
  },
  bubbleCol: {
    maxWidth: '75%',
    gap: 2,
  },
  bubbleColRight: {
    alignItems: 'flex-end',
  },
  nickname: {
    marginLeft: Spacing.sm,
    marginBottom: 2,
  },
  bubble: {
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
  },
  replyPreview: {
    marginBottom: Spacing.sm,
    paddingVertical: 6,
    paddingHorizontal: Spacing.sm,
    borderLeftWidth: 3,
    borderRadius: Radius.sm,
  },
  replyName: {
    fontSize: 11,
    lineHeight: 14,
    fontWeight: Weight.black,
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
  replyContent: {
    marginTop: 2,
    fontSize: Typography.caption,
    lineHeight: LineHeight.caption,
    fontWeight: Weight.medium,
  },
  content: {
    fontSize: Typography.body,
    lineHeight: LineHeight.body,
  },
  image: {
    width: 200,
    height: 200,
    borderRadius: Radius.md,
  },
  reactionsWrap: {
    marginTop: 2,
  },
  reactionsRight: {
    alignSelf: 'flex-end',
  },
  time: {
    marginTop: 1,
    marginLeft: Spacing.xs,
  },
  timeRight: {
    alignSelf: 'flex-end',
    marginRight: Spacing.xs,
  },
  seenBy: {
    marginTop: 1,
    marginLeft: Spacing.xs,
  },
});
