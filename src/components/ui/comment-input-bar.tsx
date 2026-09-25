import { Send } from 'lucide-react-native';
import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, TextInput, View } from 'react-native';

import { GifPickerModal } from '@/components/giphy/gif-picker-modal';
import { ThemedText } from '@/components/themed-text';
import { UserAvatar } from '@/components/user-avatar';
import { LineHeight, Radius, Spacing, Typography, Weight } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { type GiphyGif } from '@/lib/giphy';

interface CommentInputBarProps {
  value: string;
  onChangeText: (text: string) => void;
  onSubmit: () => void;
  placeholder?: string;
  sending?: boolean;
  avatarUrl?: string | null;
  fallbackText?: string;
  maxLength?: number;
  /** When provided a GIF button is shown and gif selection is enabled */
  onGifSelect?: (gif: GiphyGif) => void;
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
  onGifSelect,
}: CommentInputBarProps) {
  const theme = useTheme();
  const [gifPickerVisible, setGifPickerVisible] = useState(false);

  return (
    <>
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
              borderColor: theme.cardBorder,
              color: theme.text,
            },
          ]}
        />
        {onGifSelect && (
          <Pressable
            onPress={() => setGifPickerVisible(true)}
            disabled={sending}
            accessibilityRole="button"
            accessibilityLabel="Send a GIF"
            style={[styles.gifButton, { borderColor: theme.cardBorder, backgroundColor: theme.surface }]}
          >
            <ThemedText style={[styles.gifLabel, { color: theme.textSecondary }]}>GIF</ThemedText>
          </Pressable>
        )}
        <Pressable
          onPress={onSubmit}
          disabled={!value.trim() || sending}
          accessibilityRole="button"
          accessibilityLabel="Send comment"
          style={({ pressed }) => [
            styles.sendButton,
            {
              backgroundColor: theme.accent,
              borderColor: theme.accentDark,
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
      {onGifSelect && (
        <GifPickerModal
          visible={gifPickerVisible}
          onClose={() => setGifPickerVisible(false)}
          onSelect={(gif) => {
            onGifSelect(gif);
            setGifPickerVisible(false);
          }}
        />
      )}
    </>
  );
}

const styles = StyleSheet.create({
  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderTopWidth: 1,
  },
  input: {
    flex: 1,
    borderRadius: Radius.full,
    borderWidth: 1,
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.sm,
    minHeight: 44,
    maxHeight: 96,
    fontSize: Typography.small,
    lineHeight: LineHeight.small,
  },
  gifButton: {
    height: 44,
    paddingHorizontal: Spacing.sm,
    borderRadius: Radius.full,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  gifLabel: {
    fontSize: Typography.caption,
    fontWeight: Weight.bold,
    lineHeight: 18,
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: Radius.full,
    borderWidth: 1,
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
