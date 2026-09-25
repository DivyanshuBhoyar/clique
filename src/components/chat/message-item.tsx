/**
 * MessageItem — renders a single chat bubble.
 *
 * Design from mockup (chat-ui-refinement):
 *   Own messages  → right-aligned, warm gold bubble, dark text, no border
 *   Others' msgs  → left-aligned, soft lavender bubble, avatar on left
 *   Bubble radius: 16 16 4 16 outgoing · 16 16 16 4 incoming
 *   Quote blocks: flat fill, 3px left bar, no rounding
 *   Reaction pills: on --bg-surface with a --border hairline, half-overlapping
 *   the bubble's bottom edge
 *
 * Nickname shown above bubble for others (not own).
 * Reactions shown below bubble using EmojiReactionStrip (compact, chat variant).
 * Timestamp shown below reactions.
 *
 * Learning note: "inverted FlatList" renders items bottom-up. This means
 * the newest message appears at the bottom without needing to scroll.
 * The list data is still ordered newest-first from Convex.
 */
import { useEffect, useMemo, useRef } from 'react';
import { Animated, Image, PanResponder, Pressable, StyleSheet, View } from 'react-native';

import { GifAttachment } from '@/components/giphy/gif-attachment';
import { ThemedText } from '@/components/themed-text';
import { EmojiReactionStrip } from '@/components/ui/emoji-reaction-strip';
import { LinkPreviewCard } from '@/components/ui/link-preview-card';
import { LinkifiedText } from '@/components/ui/linkified-text';
import { UserAvatar } from '@/components/user-avatar';
import { LineHeight, Radius, Spacing, Typography, Weight } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { lightImpact } from '@/utils/haptics';
import { extractUrls } from '@/utils/links';

interface Reaction {
  emoji: string;
  userId: string;
}

interface ParentMessagePreview {
  nickname?: string;
  content: string;
  type?: 'text' | 'image' | 'gif' | 'system';
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
  gifUrl?: string | null;
  gifTitle?: string | null;
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
  gifUrl,
  gifTitle,
  seenByText,
  onToggleReaction,
  onLongPress,
  onSwipeReply,
  onImagePress,
}: MessageItemProps) {
  const theme = useTheme();
  const translateX = useRef(new Animated.Value(0)).current;
  const didTriggerReply = useRef(false);

  // Entrance animation: same spring lift as DM bubbles
  const entranceScale = useRef(new Animated.Value(0.94)).current;
  const entranceOpacity = useRef(new Animated.Value(0)).current;
  const entranceTranslateY = useRef(new Animated.Value(10)).current;
  const entranceTranslateX = useRef(new Animated.Value(isOwnMessage ? 10 : -10)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(entranceScale, {
        toValue: 1,
        useNativeDriver: true,
        tension: 170,
        friction: 12,
      }),
      Animated.spring(entranceTranslateX, {
        toValue: 0,
        useNativeDriver: true,
        tension: 170,
        friction: 12,
      }),
      Animated.spring(entranceTranslateY, {
        toValue: 0,
        useNativeDriver: true,
        tension: 170,
        friction: 12,
      }),
      Animated.timing(entranceOpacity, {
        toValue: 1,
        duration: 120,
        useNativeDriver: true,
      }),
    ]).start();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
  const firstUrl = !deleted ? extractUrls(content)[0]?.url : undefined;

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
          <ThemedText type="caption" style={[styles.replyCueText, { color: theme.chatAccent }]}>↩ Reply</ThemedText>
        </Animated.View>
      ) : null}
      <Animated.View style={{ transform: [{ translateX }] }} {...panResponder.panHandlers}>
        <Pressable onLongPress={onLongPress} delayLongPress={300}>
          <View style={[styles.row, isOwnMessage && styles.rowRight]}>
            {/* Avatar — only shown for others' messages */}
            {!isOwnMessage && (
              <View style={styles.avatarWrap}>
                <UserAvatar uri={avatarUrl} size={32} fallbackText={nickname} />
              </View>
            )}

            <Animated.View
              style={[
                styles.bubbleCol,
                isOwnMessage && styles.bubbleColRight,
                {
                  transform: [{ scale: entranceScale }, { translateX: entranceTranslateX }, { translateY: entranceTranslateY }],
                  opacity: entranceOpacity,
                },
              ]}
            >
              {/* Nickname label above bubble (others only) */}
              {!isOwnMessage && nickname && (
                <ThemedText
                  type="caption"
                  style={[styles.nickname, { color: theme.chatTextName }]}
                >
                  {nickname}
                </ThemedText>
              )}

              {/* Message bubble */}
              <View
                style={[
                  styles.bubble,
                  {
                    backgroundColor: isOwnMessage ? theme.chatBubbleOut : theme.chatBubbleIn,
                    shadowColor: theme.shadow,
                    // Rounded except the corner nearest the sender:
                    // outgoing 16 16 4 16 · incoming 16 16 16 4
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
                        backgroundColor: isOwnMessage ? theme.chatQuoteOutBg : theme.chatQuoteInBg,
                        borderLeftColor: isOwnMessage ? theme.chatQuoteOutBar : theme.chatQuoteInBar,
                      },
                    ]}
                  >
                    <ThemedText
                      type="caption"
                      style={[styles.replyName, { color: isOwnMessage ? theme.chatQuoteOutText : theme.chatQuoteInText }]}
                      numberOfLines={1}
                    >
                      ↪ {parentMessage.nickname ?? 'someone'}
                    </ThemedText>
                    <ThemedText
                      style={[styles.replyContent, { color: isOwnMessage ? theme.chatQuoteOutText : theme.chatQuoteInText }]}
                      numberOfLines={2}
                    >
                      {parentMessage.deleted
                        ? 'Message deleted'
                        : parentMessage.type === 'image'
                          ? parentMessage.content || '📷 Photo'
                          : parentMessage.type === 'gif'
                            ? '🎞 GIF'
                            : parentMessage.content}
                    </ThemedText>
                  </View>
                ) : null}

                {deleted ? (
                  <ThemedText
                    type="small"
                    style={{ color: isOwnMessage ? theme.chatBubbleOutText : theme.chatTextMuted, opacity: 0.7, fontStyle: 'italic' }}
                  >
                    Message deleted
                  </ThemedText>
                ) : gifUrl ? (
                  <GifAttachment gifUrl={gifUrl} gifTitle={gifTitle} maxWidth={220} />
                ) : imageUrl ? (
                  <Pressable onPress={() => onImagePress?.(imageUrl)}>
                    <Image
                      source={{ uri: imageUrl }}
                      style={styles.image}
                      resizeMode="cover"
                      accessibilityLabel="Photo message"
                    />
                    {content ? (
                      <LinkifiedText
                        style={[styles.content, { color: isOwnMessage ? theme.chatBubbleOutText : theme.chatBubbleInText, marginTop: 4 }]}
                        linkColor={theme.chatAccent}
                      >
                        {content}
                      </LinkifiedText>
                    ) : null}
                    {firstUrl ? (
                      <View style={styles.linkPreviewWrap}>
                        <LinkPreviewCard url={firstUrl} compact embedded={isOwnMessage} tone={isOwnMessage ? 'out' : 'in'} />
                      </View>
                    ) : null}
                  </Pressable>
                ) : (
                  <>
                    <LinkifiedText
                      style={[
                        styles.content,
                        { color: isOwnMessage ? theme.chatBubbleOutText : theme.chatBubbleInText },
                      ]}
                      linkColor={theme.chatAccent}
                    >
                      {content}
                    </LinkifiedText>
                    {firstUrl ? (
                      <View style={styles.linkPreviewWrap}>
                        <LinkPreviewCard url={firstUrl} compact embedded={isOwnMessage} tone={isOwnMessage ? 'out' : 'in'} />
                      </View>
                    ) : null}
                  </>
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
                    chat
                  />
                </View>
              )}

              {/* Timestamp + edited */}
              <ThemedText
                type="caption"
                style={[
                  styles.time,
                  { color: theme.chatTextMuted },
                  isOwnMessage && styles.timeRight,
                ]}
              >
                {time}{editedAt ? ' · edited' : ''}
              </ThemedText>

              {seenByText ? (
                <ThemedText
                  type="caption"
                  style={[styles.seenBy, { color: theme.chatTextMuted }, isOwnMessage && styles.timeRight]}
                  numberOfLines={1}
                >
                  👁 {seenByText}
                </ThemedText>
              ) : null}
            </Animated.View>
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
    gap: Spacing.sm,
    marginBottom: Spacing.md,
    paddingHorizontal: Spacing.lg,
  },
  rowRight: {
    justifyContent: 'flex-end',
  },
  avatarWrap: {
    marginBottom: 18, // align with bottom of bubble (above time)
  },
  bubbleCol: {
    maxWidth: '78%',
    gap: 3,
  },
  bubbleColRight: {
    alignItems: 'flex-end',
  },
  nickname: {
    marginLeft: Spacing.sm,
    marginBottom: 1,
    fontWeight: Weight.semibold,
  },
  bubble: {
    // Deliberate chat ratio: roomier sides, cozy top/bottom
    paddingVertical: 8,
    paddingHorizontal: 14,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.07,
    shadowRadius: 8,
    elevation: 1,
  },
  replyPreview: {
    marginBottom: Spacing.sm,
    paddingVertical: 6,
    paddingHorizontal: Spacing.sm,
    borderLeftWidth: 3,
    // Quote blocks: no rounding — a rounded corner on a single-sided bar looks broken
    borderRadius: 0,
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
    // Tighter than body copy: keeps single-line bubbles short and multi-line gaps chat-like
    lineHeight: 21,
    // Android-only: drop the extra font-metric padding so 8/8 bubble padding renders symmetric
    includeFontPadding: false,
  },
  linkPreviewWrap: {
    marginTop: Spacing.sm,
  },
  image: {
    width: 200,
    height: 200,
    borderRadius: Radius.md,
  },
  reactionsWrap: {
    // Slight tuck under the bubble's bottom edge, inset from the corner curve
    marginTop: -7,
    marginLeft: 6,
  },
  reactionsRight: {
    alignSelf: 'flex-end',
    marginLeft: 0,
    marginRight: 6,
  },
  time: {
    marginTop: 4,
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
