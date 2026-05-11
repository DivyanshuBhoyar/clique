/**
 * CommentSection — shared comment list + input bar used across:
 *   - Drop detail
 *   - Memory detail (wall cards)
 *   - Event Scrapbook reflections
 *
 * Usage:
 *   <CommentSection
 *     comments={comments}
 *     currentUserAvatarUrl={avatarUrl}
 *     onAddComment={async (text) => { await addComment({ ...args, content: text }); }}
 *     onHeartComment={(commentId) => heartComment({ commentId })}
 *   />
 */
import { Heart, Send } from 'lucide-react-native';
import { useRef, useState } from 'react';
import {
    ActivityIndicator,
    Pressable,
    StyleSheet,
    TextInput,
    View,
    type ViewStyle,
} from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { UserAvatar } from '@/components/user-avatar';
import { Radius, Spacing, LineHeight, Typography } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export interface Comment {
  id: string;
  nickname: string;
  avatarUrl?: string | null;
  content: string;
  createdAt: number;
  heartCount: number;
  hearted?: boolean;
}

interface CommentSectionProps {
  comments: Comment[];
  currentUserAvatarUrl?: string | null;
  onAddComment: (content: string) => Promise<void>;
  onHeartComment?: (commentId: string) => void;
  style?: ViewStyle;
  /** Label shown above the list */
  heading?: string;
}

function timeAgo(ts: number): string {
  const diff = Date.now() - ts;
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export function CommentSection({
  comments,
  currentUserAvatarUrl,
  onAddComment,
  onHeartComment,
  style,
  heading = 'Comments',
}: CommentSectionProps) {
  const theme = useTheme();
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const inputRef = useRef<TextInput>(null);

  const handleSend = async () => {
    const trimmed = text.trim();
    if (!trimmed || sending) return;
    setSending(true);
    try {
      await onAddComment(trimmed);
      setText('');
    } finally {
      setSending(false);
    }
  };

  return (
    <View style={style}>
      {/* Heading */}
      {comments.length > 0 && (
        <ThemedText type="bodyBold" style={styles.heading}>
          {heading}
        </ThemedText>
      )}

      {/* Comment cards */}
      {comments.map((c) => (
        <View
          key={c.id}
          style={[
            styles.commentCard,
            {
              backgroundColor: theme.surface,
              borderColor: theme.outline,
            },
          ]}
        >
          <View style={styles.commentHeader}>
            <UserAvatar uri={c.avatarUrl} size={28} fallbackText={c.nickname} />
            <ThemedText type="smallBold" style={styles.commentNick}>
              @{c.nickname}
            </ThemedText>
            <ThemedText type="caption" themeColor="textSecondary">
              {timeAgo(c.createdAt)}
            </ThemedText>
          </View>
          <ThemedText type="small" style={styles.commentContent}>
            {c.content}
          </ThemedText>
          {onHeartComment && (
            <Pressable
              onPress={() => onHeartComment(c.id)}
              style={styles.heartRow}
              accessibilityRole="button"
              accessibilityLabel={`Heart comment, ${c.heartCount} hearts`}
            >
              <Heart
                size={14}
                color={c.hearted ? theme.error : theme.textSecondary}
                fill={c.hearted ? theme.error : 'transparent'}
                strokeWidth={2}
              />
              {c.heartCount > 0 && (
                <ThemedText type="caption" themeColor="textSecondary">
                  {c.heartCount}
                </ThemedText>
              )}
            </Pressable>
          )}
        </View>
      ))}

      {/* Input bar */}
      <View
        style={[
          styles.inputBar,
          {
            backgroundColor: theme.background,
            borderTopColor: theme.outlineLight,
          },
        ]}
      >
        <UserAvatar uri={currentUserAvatarUrl} size={32} fallbackText="Me" />
        <TextInput
          ref={inputRef}
          value={text}
          onChangeText={setText}
          placeholder="Add a comment…"
          placeholderTextColor={theme.placeholder}
          style={[
            styles.textInput,
            {
              backgroundColor: theme.surface,
              borderColor: theme.outline,
              color: theme.text,
            },
          ]}
          multiline={false}
          returnKeyType="send"
          onSubmitEditing={handleSend}
          editable={!sending}
        />
        <Pressable
          onPress={handleSend}
          disabled={!text.trim() || sending}
          accessibilityRole="button"
          accessibilityLabel="Send comment"
          style={({ pressed }) => [
            styles.sendBtn,
            {
              backgroundColor: theme.accent,
              borderColor: theme.outline,
            },
            pressed && styles.sendBtnPressed,
            (!text.trim() || sending) && styles.sendBtnDisabled,
          ]}
        >
          {sending ? (
            <ActivityIndicator size="small" color={theme.text} />
          ) : (
            <Send size={16} color={theme.text} strokeWidth={2.5} />
          )}
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  heading: {
    marginBottom: Spacing.md,
    marginTop: Spacing.sm,
  },
  commentCard: {
    borderRadius: Radius.md,
    borderWidth: 2,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    gap: Spacing.xs,
  },
  commentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  commentNick: {
    flex: 1,
  },
  commentContent: {
    lineHeight: LineHeight.small,
    paddingLeft: 28 + Spacing.xs, // indent under avatar
  },
  heartRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingLeft: 28 + Spacing.xs,
    marginTop: 2,
  },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderTopWidth: 1,
    marginTop: Spacing.sm,
  },
  textInput: {
    flex: 1,
    borderRadius: Radius.full,
    borderWidth: 1.5,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    fontSize: Typography.small,
    minHeight: 38,
    maxHeight: 80,
  },
  sendBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnPressed: {
    transform: [{ scale: 0.95 }],
  },
  sendBtnDisabled: {
    opacity: 0.4,
  },
});
