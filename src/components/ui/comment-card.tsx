import { ThumbsDown, ThumbsUp, Trash2 } from 'lucide-react-native';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { UserAvatar } from '@/components/user-avatar';
import { Radius, Spacing, Weight, LineHeight, Typography } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { formatRelativeTime } from '@/utils/time';

interface CommentCardProps {
  avatarUrl?: string | null;
  nickname: string;
  content: string;
  createdAt: number;
  upvotes: number;
  downvotes: number;
  userVote: 'up' | 'down' | null;
  isOwn: boolean;
  onVote: (value: 'up' | 'down') => void;
  onDelete?: () => void;
  onLongPress?: () => void;
}

export function CommentCard({
  avatarUrl,
  nickname,
  content,
  createdAt,
  upvotes,
  downvotes,
  userVote,
  isOwn,
  onVote,
  onDelete,
  onLongPress,
}: CommentCardProps) {
  const theme = useTheme();

  return (
    <Pressable
      onLongPress={onLongPress}
      style={[
        styles.card,
        { backgroundColor: theme.surface, borderColor: theme.outline },
      ]}
      accessibilityRole="button"
      accessibilityLabel={`Comment by ${nickname}`}
    >
      <View style={styles.header}>
        <UserAvatar uri={avatarUrl} size={22} fallbackText={nickname} />
        <ThemedText type="smallBold" style={styles.author}>@{nickname}</ThemedText>
        <ThemedText type="caption" themeColor="textSecondary" style={styles.time}>
          {formatRelativeTime(createdAt)}
        </ThemedText>
        {isOwn && onDelete && (
          <Pressable
            onPress={onDelete}
            style={styles.deleteBtn}
            accessibilityRole="button"
            accessibilityLabel="Delete comment"
          >
            <Trash2 size={13} color={theme.textTertiary} strokeWidth={2} />
          </Pressable>
        )}
      </View>
      <View style={styles.bodyRow}>
        <ThemedText style={styles.content} selectable>{content}</ThemedText>
        <View style={styles.votes}>
          <Pressable
            onPress={() => onVote('up')}
            style={styles.voteButton}
            accessibilityRole="button"
            accessibilityLabel="Upvote comment"
          >
            <ThumbsUp
              size={15}
              color={userVote === 'up' ? theme.accent : theme.textTertiary}
              fill={userVote === 'up' ? theme.accent : 'transparent'}
              strokeWidth={2}
            />
          </Pressable>
          <ThemedText
            type="caption"
            style={[
              styles.score,
              {
                color: userVote === 'up'
                  ? theme.accent
                  : userVote === 'down'
                    ? theme.error
                    : theme.textSecondary,
              },
            ]}
          >
            {upvotes - downvotes}
          </ThemedText>
          <Pressable
            onPress={() => onVote('down')}
            style={styles.voteButton}
            accessibilityRole="button"
            accessibilityLabel="Downvote comment"
          >
            <ThumbsDown
              size={15}
              color={userVote === 'down' ? theme.error : theme.textTertiary}
              fill={userVote === 'down' ? theme.error : 'transparent'}
              strokeWidth={2}
            />
          </Pressable>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.sm,
    borderRadius: Radius.md,
    borderWidth: 1,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    gap: Spacing.xs,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  author: {
    flex: 1,
    marginLeft: 2,
  },
  time: {
    flexShrink: 0,
  },
  deleteBtn: {
    width: 44,
    height: 44,
    marginVertical: -Spacing.sm,
    marginRight: -Spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bodyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingLeft: 26 + Spacing.xs,
  },
  content: {
    flex: 1,
    fontSize: Typography.small,
    lineHeight: LineHeight.small,
  },
  votes: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    alignSelf: 'flex-start',
  },
  voteButton: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  score: {
    minWidth: 16,
    textAlign: 'center',
    fontWeight: Weight.bold,
    fontVariant: ['tabular-nums'],
  },
});
