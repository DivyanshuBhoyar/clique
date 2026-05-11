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
import { Pressable, StyleSheet, View, Image } from 'react-native';

import { EmojiReactionStrip } from '@/components/ui/emoji-reaction-strip';
import { ThemedText } from '@/components/themed-text';
import { UserAvatar } from '@/components/user-avatar';
import { useTheme } from '@/hooks/use-theme';
import { LineHeight, Radius, Spacing, Typography } from '@/constants/theme';

interface Reaction {
  emoji: string;
  userId: string;
}

interface MessageItemProps {
  messageId: string;
  nickname?: string;
  avatarUrl?: string | null;
  content: string;
  createdAt: number;
  editedAt?: number;
  deleted?: boolean;
  isOwnMessage: boolean;
  reactions?: Reaction[];
  currentUserId?: string;
  imageUrl?: string | null;
  onToggleReaction?: (messageId: string, emoji: string) => void;
  onLongPress?: () => void;
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
  isOwnMessage,
  reactions = [],
  currentUserId,
  imageUrl,
  onToggleReaction,
  onLongPress,
  onImagePress,
}: MessageItemProps) {
  const theme = useTheme();

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
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
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
});
