import { Send } from 'lucide-react-native';
import { ActivityIndicator, Pressable, StyleSheet, TextInput, View } from 'react-native';

import { UserAvatar } from '@/components/user-avatar';
import { Radius, Spacing, LineHeight, Typography } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

interface CommentInputBarProps {
  value: string;
  onChangeText: (text: string) => void;
  onSubmit: () => void;
  placeholder?: string;
  sending?: boolean;
  avatarUrl?: string | null;
  fallbackText?: string;
  maxLength?: number;
}

export function CommentInputBar({
  value,
  onChangeText,
  onSubmit,
  placeholder = 'Add a comment...',
  sending = false,
  avatarUrl,
  fallbackText = 'Me',
  maxLength = 500,
}: CommentInputBarProps) {
  const theme = useTheme();

  return (
    <View style={[styles.inputBar, { backgroundColor: theme.background, borderTopColor: theme.outlineLight }]}>
      <UserAvatar uri={avatarUrl} size={30} fallbackText={fallbackText} />
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={theme.placeholder}
        editable={!sending}
        maxLength={maxLength}
        multiline
        returnKeyType="send"
        onSubmitEditing={onSubmit}
        accessibilityLabel={placeholder}
        style={[
          styles.input,
          {
            backgroundColor: theme.surface,
            borderColor: theme.outline,
            color: theme.text,
          },
        ]}
      />
      <Pressable
        onPress={onSubmit}
        disabled={!value.trim() || sending}
        accessibilityRole="button"
        accessibilityLabel="Send comment"
        style={({ pressed }) => [
          styles.sendButton,
          {
            backgroundColor: theme.accent,
            borderColor: theme.outline,
          },
          pressed && styles.sendButtonPressed,
          (!value.trim() || sending) && styles.sendButtonDisabled,
        ]}
      >
        {sending ? (
          <ActivityIndicator size="small" color={theme.text} />
        ) : (
          <Send size={17} color={theme.text} strokeWidth={2.5} />
        )}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderTopWidth: 1.5,
  },
  input: {
    flex: 1,
    borderRadius: Radius.full,
    borderWidth: 1.5,
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.sm,
    minHeight: 44,
    maxHeight: 96,
    fontSize: Typography.small,
    lineHeight: LineHeight.small,
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: Radius.full,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonPressed: {
    transform: [{ scale: 0.96 }],
  },
  sendButtonDisabled: {
    opacity: 0.45,
  },
});
