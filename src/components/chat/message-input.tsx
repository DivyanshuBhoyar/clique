import { Plus, Send, X } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Image, Platform, Pressable, StyleSheet, TextInput, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { LineHeight, Radius, Spacing, Typography } from '@/constants/theme';
import { Id } from '@/convex/_generated/dataModel';
import { useImageUpload } from '@/hooks/use-image-upload';
import { useTheme } from '@/hooks/use-theme';
import { successNotification } from '@/utils/haptics';

interface ReplyTarget {
  nickname?: string;
  content: string;
}

interface MessageInputProps {
  onSend: (content: string) => Promise<void>;
  onSendImage: (storageId: Id<"_storage">, caption?: string) => Promise<void>;
  onEdit?: (content: string) => Promise<void>;
  onTyping?: () => void;
  replyTo?: ReplyTarget | null;
  onCancelReply?: () => void;
  editContent?: string | null;
  onCancelEdit?: () => void;
}

export function MessageInput({ onSend, onSendImage, onEdit, onTyping, replyTo, onCancelReply, editContent, onCancelEdit }: MessageInputProps) {
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const theme = useTheme();
  const { previewUri, storageId, uploading, pickAndUpload, reset } = useImageUpload();
  const isEditing = editContent !== undefined && editContent !== null;

  useEffect(() => {
    if (isEditing) {
      reset();
      setText(editContent ?? '');
    }
  }, [editContent, isEditing, reset]);

  const canSend = (isEditing ? text.trim().length > 0 : (text.trim().length > 0 || (previewUri && storageId))) && !sending && !uploading;

  const handleSend = async () => {
    if (!canSend) return;

    setSending(true);
    try {
      if (isEditing && onEdit) {
        await onEdit(text.trim());
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

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: theme.background,
          borderTopColor: theme.outlineLight,
        },
      ]}
    >
      {isEditing ? (
        <View style={[styles.replyComposer, { borderBottomColor: theme.outlineLight }]}> 
          <View style={[styles.replyBar, { backgroundColor: theme.accent }]} />
          <View style={styles.replyCopy}>
            <ThemedText type="caption" style={[styles.replyLabel, { color: theme.textSecondary }]}>Editing message</ThemedText>
            <ThemedText type="small" style={{ color: theme.text }} numberOfLines={1}>
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
            <X size={16} color={theme.textSecondary} />
          </Pressable>
        </View>
      ) : replyTo ? (
        <View style={[styles.replyComposer, { borderBottomColor: theme.outlineLight }]}>
          <View style={[styles.replyBar, { backgroundColor: theme.accent }]} />
          <View style={styles.replyCopy}>
            <ThemedText type="caption" style={[styles.replyLabel, { color: theme.textSecondary }]}>
              Replying to {replyTo.nickname ?? 'someone'}
            </ThemedText>
            <ThemedText type="small" style={{ color: theme.text }} numberOfLines={1}>
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
            <X size={16} color={theme.textSecondary} />
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
                <ActivityIndicator size="small" color={theme.accent} />
              </View>
            )}
          </View>
        </View>
      )}

      <View style={styles.inputRow}>
        {/* Attachment button */}
        {!isEditing ? (
          <Pressable
            accessibilityLabel="Add attachment"
            accessibilityRole="button"
            style={styles.sideBtn}
            onPress={pickAndUpload}
            disabled={uploading}
          >
            {uploading ? (
              <ActivityIndicator size="small" color={theme.textSecondary} />
            ) : (
              <Plus size={20} color={theme.textSecondary} strokeWidth={2} />
            )}
          </Pressable>
        ) : null}

        {/* Text input */}
        <View
          style={[
            styles.inputWrap,
            {
              backgroundColor: theme.surface,
              borderColor: theme.outline,
            },
          ]}
        >
          <TextInput
            value={text}
            onChangeText={(v) => { setText(v); onTyping?.(); }}
            placeholder={isEditing ? "Edit message..." : previewUri ? "Add a caption..." : "Say something cozy..."}
            placeholderTextColor={theme.placeholder}
            style={[
              styles.input,
              Platform.OS === 'web' && styles.webInput,
              { color: theme.text },
            ]}
            cursorColor={theme.text}
            selectionColor={theme.accent}
            returnKeyType="send"
            onSubmitEditing={handleSend}
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
              backgroundColor: canSend ? theme.accent : theme.backgroundElement,
              borderColor: canSend ? theme.outline : theme.outlineLight,
            },
            pressed && canSend && styles.sendBtnPressed,
          ]}
        >
          <Send
            size={16}
            color={canSend ? theme.text : theme.textSecondary}
            strokeWidth={2.5}
          />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderTopWidth: 1.5,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 6,
    gap: Spacing.xs,
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
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inputWrap: {
    flex: 1,
    justifyContent: 'center',
    borderRadius: Radius.lg,
    borderWidth: 1.5,
    paddingHorizontal: Spacing.md,
    paddingVertical: 7,
    minHeight: 40,
    maxHeight: 104,
  },
  input: {
    fontSize: Typography.body,
    lineHeight: LineHeight.body,
    paddingTop: 0,
    paddingBottom: 0,
    textAlignVertical: 'center',
  },
  webInput: {
    outlineWidth: 0,
  },
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnPressed: {
    transform: [{ scale: 0.92 }],
  },
});
