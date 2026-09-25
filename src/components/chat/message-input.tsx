import { Plus, Send, X } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Image, Platform, Pressable, StyleSheet, TextInput, View } from 'react-native';

import { GifAttachment } from '@/components/giphy/gif-attachment';
import { GifPickerModal } from '@/components/giphy/gif-picker-modal';
import { ThemedText } from '@/components/themed-text';
import { LineHeight, Radius, Spacing, Typography, Weight } from '@/constants/theme';
import { Id } from '@/convex/_generated/dataModel';
import { useImageUpload } from '@/hooks/use-image-upload';
import { useTheme } from '@/hooks/use-theme';
import { type GiphyGif, pingGiphy } from '@/lib/giphy';
import { successNotification } from '@/utils/haptics';

interface ReplyTarget {
  nickname?: string;
  content: string;
}

interface MessageInputProps {
  onSend: (content: string) => Promise<void>;
  onSendImage: (storageId: Id<"_storage">, caption?: string) => Promise<void>;
  onSendGif: (gif: GiphyGif) => Promise<void>;
  onEdit?: (content: string) => Promise<void>;
  onTyping?: () => void;
  replyTo?: ReplyTarget | null;
  onCancelReply?: () => void;
  editContent?: string | null;
  onCancelEdit?: () => void;
}

export function MessageInput({ onSend, onSendImage, onSendGif, onEdit, onTyping, replyTo, onCancelReply, editContent, onCancelEdit }: MessageInputProps) {
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [gifPickerVisible, setGifPickerVisible] = useState(false);
  const [pendingGif, setPendingGif] = useState<GiphyGif | null>(null);
  const theme = useTheme();
  const { previewUri, storageId, uploading, pickAndUpload, reset } = useImageUpload({ target: 'chatImage' });
  const isEditing = editContent !== undefined && editContent !== null;

  useEffect(() => {
    if (isEditing) {
      reset();
      setPendingGif(null);
      setText(editContent ?? '');
    }
  }, [editContent, isEditing, reset]);

  const canSend = (isEditing ? text.trim().length > 0 : (text.trim().length > 0 || (previewUri && storageId) || pendingGif !== null)) && !sending && !uploading;

  const handleSend = async () => {
    if (!canSend) return;

    setSending(true);
    try {
      if (isEditing && onEdit) {
        await onEdit(text.trim());
      } else if (pendingGif) {
        pingGiphy('onsent', pendingGif);
        await onSendGif(pendingGif);
        setPendingGif(null);
      } else if (previewUri && storageId) {
        await onSendImage(storageId, text.trim() || undefined);
        reset();
      } else {
        const content = text.trim();
        await onSend(content);
      }
      successNotification();
      setText('');
    } catch {
      // keep text on failure
    } finally {
      setSending(false);
    }
  };

  // Web: plain Enter sends, Shift+Enter inserts a newline (default textarea behavior).
  // react-native-web invokes onKeyPress with the DOM keyboard event and skips its
  // own submit handling once preventDefault is called, so no double-send is possible.
  // NOTE: a custom onKeyDown prop does NOT work — react-native-web overwrites it
  // internally (supportedProps.onKeyDown = handleKeyDown).
  const handleWebKeyPress = (e: any) => {
    const key = e?.key ?? e?.nativeEvent?.key;
    if (key !== 'Enter' || e?.shiftKey) return;
    if (e?.nativeEvent?.isComposing || e?.isComposing || e?.keyCode === 229) return;
    e.preventDefault?.();
    void handleSend();
  };

  return (
    <>
    <View
      style={[
        styles.container,
        {
          backgroundColor: theme.chatSurface,
          borderTopColor: theme.chatBorder,
        },
      ]}
    >
      {isEditing ? (
        <View style={[styles.replyComposer, { borderBottomColor: theme.chatBorder }]}>
          <View style={[styles.replyBar, { backgroundColor: theme.chatAccent }]} />
          <View style={styles.replyCopy}>
            <ThemedText type="caption" style={[styles.replyLabel, { color: theme.chatTextMuted }]}>Editing message</ThemedText>
            <ThemedText type="small" style={{ color: theme.chatBubbleInText }} numberOfLines={1}>
              Save changes or cancel to keep the original.
            </ThemedText>
          </View>
          <Pressable
            onPress={onCancelEdit}
            accessibilityRole="button"
            accessibilityLabel="Cancel editing"
            hitSlop={8}
            style={styles.cancelReplyButton}
          >
            <X size={16} color={theme.chatTextMuted} />
          </Pressable>
        </View>
      ) : replyTo ? (
        <View style={[styles.replyComposer, { borderBottomColor: theme.chatBorder }]}>
          <View style={[styles.replyBar, { backgroundColor: theme.chatAccent }]} />
          <View style={styles.replyCopy}>
            <ThemedText type="caption" style={[styles.replyLabel, { color: theme.chatTextMuted }]}>
              Replying to {replyTo.nickname ?? 'someone'}
            </ThemedText>
            <ThemedText type="small" style={{ color: theme.chatBubbleInText }} numberOfLines={1}>
              {replyTo.content}
            </ThemedText>
          </View>
          <Pressable
            onPress={onCancelReply}
            accessibilityRole="button"
            accessibilityLabel="Cancel reply"
            hitSlop={8}
            style={styles.cancelReplyButton}
          >
            <X size={16} color={theme.chatTextMuted} />
          </Pressable>
        </View>
      ) : null}

      {/* Image preview */}
      {!isEditing && previewUri && (
        <View style={styles.previewRow}>
          <View style={styles.previewWrap}>
            <Image source={{ uri: previewUri }} style={styles.previewImage} resizeMode="cover" />
            <Pressable onPress={reset} style={styles.previewClose}>
              <X size={14} color="#fff" />
            </Pressable>
            {uploading && (
              <View style={styles.uploadingOverlay}>
                <ActivityIndicator size="small" color={theme.chatAccent} />
              </View>
            )}
          </View>
        </View>
      )}

      {/* GIF preview */}
      {!isEditing && pendingGif && (
        <View style={styles.previewRow}>
          <View style={styles.previewWrap}>
            <GifAttachment gifUrl={pendingGif.previewUrl} gifTitle={pendingGif.title} maxWidth={80} />
            <Pressable onPress={() => setPendingGif(null)} style={styles.previewClose}>
              <X size={14} color="#fff" />
            </Pressable>
          </View>
        </View>
      )}

      <View style={styles.inputRow}>
        {/* Attachment button */}
        {!isEditing ? (
          <Pressable
            accessibilityLabel="Add attachment"
            accessibilityRole="button"
            style={[styles.sideBtn, { backgroundColor: theme.chatSurface, borderColor: theme.chatBorder }]}
            onPress={pickAndUpload}
            disabled={uploading}
          >
            {uploading ? (
              <ActivityIndicator size="small" color={theme.chatTextMuted} />
            ) : (
              <Plus size={16} color={theme.chatTextMuted} strokeWidth={2} />
            )}
          </Pressable>
        ) : null}

        {/* GIF button */}
        {!isEditing ? (
          <Pressable
            accessibilityLabel="Send a GIF"
            accessibilityRole="button"
            style={[styles.gifBtn, { backgroundColor: theme.chatSurface, borderColor: theme.chatBorder }]}
            onPress={() => setGifPickerVisible(true)}
            disabled={uploading}
          >
            <ThemedText style={[styles.gifBtnLabel, { color: theme.chatTextMuted }]}>GIF</ThemedText>
          </Pressable>
        ) : null}

        {/* Text input */}
        <View
          style={[
            styles.inputWrap,
            {
              backgroundColor: theme.chatSurface,
              borderColor: theme.chatBorder,
            },
          ]}
        >
          <TextInput
            value={text}
            onChangeText={(v) => { setText(v); onTyping?.(); }}
            placeholder={isEditing ? "Edit message..." : previewUri ? "Add a caption..." : "Say something..."}
            placeholderTextColor={theme.chatTextMuted}
            style={[
              styles.input,
              Platform.OS === 'web' && styles.webInput,
              { color: theme.chatBubbleInText },
            ]}
            cursorColor={theme.chatBubbleInText}
            selectionColor={theme.chatAccent}
            returnKeyType="send"
            blurOnSubmit={false}
            onSubmitEditing={Platform.OS === 'web' ? undefined : handleSend}
            onKeyPress={Platform.OS === 'web' ? handleWebKeyPress : undefined}
            testID="chat-message-input"
            multiline
          />
        </View>

        {/* Send button */}
        <Pressable
          onPress={handleSend}
          disabled={!canSend}
          accessibilityRole="button"
          accessibilityLabel={isEditing ? 'Save edited message' : 'Send message'}
          style={({ pressed }) => [
            styles.sendBtn,
            {
              backgroundColor: canSend ? theme.chatAccent : theme.chatBorder,
              borderColor: canSend ? theme.chatAccent : theme.chatBorder,
            },
            pressed && canSend && styles.sendBtnPressed,
          ]}
        >
          <Send
            size={14}
            color={canSend ? theme.chatOnAccent : theme.chatTextMuted}
            strokeWidth={2.5}
          />
        </Pressable>
      </View>
    </View>
    <GifPickerModal
      visible={gifPickerVisible}
      onClose={() => setGifPickerVisible(false)}
      onSelect={(gif) => {
        setPendingGif(gif);
        pingGiphy('onload', gif);
      }}
    />
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    borderTopWidth: 1,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    gap: Spacing.sm,
  },
  previewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.sm,
  },
  replyComposer: {
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
  },
  replyBar: {
    width: 4,
    alignSelf: 'stretch',
    borderRadius: Radius.full,
  },
  replyCopy: {
    flex: 1,
    minWidth: 0,
  },
  replyLabel: {
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  cancelReplyButton: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewWrap: {
    position: 'relative',
  },
  previewImage: {
    width: 80,
    height: 80,
    borderRadius: Radius.md,
    borderWidth: 1.5,
  },
  previewClose: {
    position: 'absolute',
    top: -6,
    right: -6,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  uploadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: Radius.md,
    backgroundColor: 'rgba(255,255,255,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sideBtn: {
    width: 32,
    height: 32,
    borderRadius: Radius.full,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  gifBtn: {
    height: 32,
    paddingHorizontal: Spacing.xs,
    borderRadius: Radius.full,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  gifBtnLabel: {
    fontSize: 11,
    fontWeight: Weight.bold,
    lineHeight: 14,
  },
  inputWrap: {
    flex: 1,
    justifyContent: 'center',
    borderRadius: Radius.full,
    borderWidth: 1,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    maxHeight: 104,
  },
  input: {
    fontSize: Typography.small,
    lineHeight: LineHeight.small,
    paddingTop: 0,
    paddingBottom: 0,
    textAlignVertical: 'center',
  },
  webInput: {
    outlineWidth: 0,
    outlineColor: 'transparent',
  },
  sendBtn: {
    width: 36,
    height: 36,
    borderRadius: Radius.full,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  sendBtnPressed: {
    transform: [{ scale: 0.92 }],
  },
});
