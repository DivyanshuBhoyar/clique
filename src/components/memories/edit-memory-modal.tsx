import { Image } from 'expo-image';
import { X } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ImageUploadField } from '@/components/ui/image-upload-field';
import { LineHeight, Radius, Shadows, Spacing, Typography, Weight } from '@/constants/theme';
import { Id } from '@/convex/_generated/dataModel';
import { useImageUpload } from '@/hooks/use-image-upload';
import { useTheme } from '@/hooks/use-theme';

interface EditableMemory {
  type: 'wall' | 'event';
  title?: string;
  content?: string;
}

interface EditMemoryPayload {
  title?: string;
  content?: string;
  coverStorageId?: Id<'_storage'>;
  removeCover?: boolean;
}

interface EditMemoryModalProps {
  visible: boolean;
  memory: EditableMemory;
  coverUrl?: string | null;
  onClose: () => void;
  onSave: (payload: EditMemoryPayload) => Promise<void>;
}

export function EditMemoryModal({ visible, memory, coverUrl, onClose, onSave }: EditMemoryModalProps) {
  const theme = useTheme();
  const { previewUri, uploading, pickAndUpload, reset } = useImageUpload();
  const [title, setTitle] = useState(memory.title ?? '');
  const [content, setContent] = useState(memory.content ?? '');
  const [coverStorageId, setCoverStorageId] = useState<Id<'_storage'> | null>(null);
  const [removeCover, setRemoveCover] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!visible) return;
    setTitle(memory.title ?? '');
    setContent(memory.content ?? '');
    setCoverStorageId(null);
    setRemoveCover(false);
    reset();
  }, [memory.content, memory.title, reset, visible]);

  const isWall = memory.type === 'wall';
  const canSave = !saving && !uploading && (isWall ? content.trim().length > 0 : title.trim().length > 0);

  const handlePickCover = async () => {
    const storageId = await pickAndUpload();
    if (storageId) {
      setCoverStorageId(storageId);
      setRemoveCover(false);
    }
  };

  const handleRemoveCover = () => {
    setCoverStorageId(null);
    setRemoveCover(true);
    reset();
  };

  const handleSave = async () => {
    if (!canSave) return;
    setSaving(true);
    try {
      await onSave({
        title: title.trim(),
        content: content.trim(),
        coverStorageId: coverStorageId ?? undefined,
        removeCover,
      });
      onClose();
    } catch {
      // Parent owns user-facing error feedback.
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.keyboardWrap}>
          <View style={[styles.card, { backgroundColor: theme.background, borderColor: theme.outline, shadowColor: theme.shadow }]}>
            <View style={styles.header}>
              <View>
                <ThemedText type="bodyBold">Edit memory</ThemedText>
                <ThemedText type="caption" themeColor="textSecondary">
                  {isWall ? 'Tune the wall quote.' : 'Update the event details.'}
                </ThemedText>
              </View>
              <Pressable onPress={onClose} style={styles.closeBtn} accessibilityRole="button" accessibilityLabel="Close edit memory">
                <X size={18} color={theme.text} strokeWidth={2.5} />
              </Pressable>
            </View>

            <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
              <ThemedText style={styles.label}>{isWall ? 'Attribution / title' : 'Event title'}</ThemedText>
              <TextInput
                value={title}
                onChangeText={setTitle}
                placeholder={isWall ? 'Optional title or inside joke source' : 'Trip to Goa, Game night...'}
                placeholderTextColor={theme.placeholder}
                style={[styles.input, { color: theme.text, backgroundColor: theme.surface, borderColor: theme.outline }]}
                maxLength={100}
              />

              <ThemedText style={styles.label}>{isWall ? 'Memory text' : 'Description'}</ThemedText>
              <TextInput
                value={content}
                onChangeText={setContent}
                placeholder={isWall ? 'What do you want to remember?' : 'Add a short caption or context...'}
                placeholderTextColor={theme.placeholder}
                style={[styles.textArea, { color: theme.text, backgroundColor: theme.surface, borderColor: theme.outline }]}
                multiline
                maxLength={isWall ? 2000 : 2000}
              />

              {!isWall ? (
                <>
                  <ThemedText style={styles.label}>Cover photo</ThemedText>
                  {coverUrl && !previewUri && !removeCover ? (
                    <View style={styles.coverWrap}>
                      <Image source={{ uri: coverUrl }} style={styles.coverImage} contentFit="cover" />
                      <View style={styles.coverActions}>
                        <Pressable onPress={handlePickCover} style={[styles.coverBtn, { backgroundColor: theme.surface, borderColor: theme.outline }]}>
                          <ThemedText type="caption" style={{ fontWeight: Weight.bold }}>Change</ThemedText>
                        </Pressable>
                        <Pressable onPress={handleRemoveCover} style={[styles.coverBtn, { backgroundColor: theme.errorSoft, borderColor: theme.error }]}>
                          <ThemedText type="caption" style={{ color: theme.error, fontWeight: Weight.bold }}>Remove</ThemedText>
                        </Pressable>
                      </View>
                    </View>
                  ) : (
                    <ImageUploadField
                      previewUri={previewUri}
                      uploading={uploading}
                      onPick={handlePickCover}
                      onRemove={handleRemoveCover}
                      placeholder={removeCover ? '+ Add new cover photo' : '+ Change cover photo'}
                    />
                  )}
                </>
              ) : null}
            </ScrollView>

            <View style={[styles.footer, { borderTopColor: theme.outlineLight }]}>
              <Pressable
                onPress={onClose}
                style={[styles.footerBtn, { backgroundColor: theme.surface, borderColor: theme.outlineLight }]}
                accessibilityRole="button"
                accessibilityLabel="Cancel editing memory"
              >
                <ThemedText type="smallBold" themeColor="textSecondary">Cancel</ThemedText>
              </Pressable>
              <Pressable
                onPress={handleSave}
                disabled={!canSave}
                style={[styles.footerBtn, { backgroundColor: canSave ? theme.accent : theme.backgroundElement, borderColor: canSave ? theme.outline : theme.outlineLight, opacity: canSave ? 1 : 0.55 }]}
                accessibilityRole="button"
                accessibilityLabel="Save memory changes"
              >
                <ThemedText type="smallBold" style={{ color: theme.text }}>{saving ? 'Saving…' : 'Save'}</ThemedText>
              </Pressable>
            </View>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  keyboardWrap: {
    justifyContent: 'flex-end',
  },
  card: {
    maxHeight: '90%',
    borderTopLeftRadius: Radius.xl,
    borderTopRightRadius: Radius.xl,
    borderWidth: 2,
    paddingTop: Spacing.lg,
    shadowOffset: Shadows.lg.offset,
    shadowOpacity: Shadows.lg.opacity,
    shadowRadius: Shadows.lg.radius,
    elevation: 8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
  },
  closeBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    paddingHorizontal: Spacing.lg,
    gap: Spacing.sm,
    paddingBottom: Spacing.lg,
  },
  label: {
    marginTop: Spacing.sm,
    fontSize: Typography.small,
    fontWeight: Weight.bold,
  },
  input: {
    minHeight: 46,
    borderWidth: 2,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    fontSize: Typography.body,
    fontWeight: Weight.medium,
  },
  textArea: {
    minHeight: 112,
    borderWidth: 2,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    fontSize: Typography.body,
    lineHeight: LineHeight.body,
    textAlignVertical: 'top',
  },
  coverWrap: {
    borderRadius: Radius.md,
    overflow: 'hidden',
  },
  coverImage: {
    width: '100%',
    height: 160,
  },
  coverActions: {
    position: 'absolute',
    top: Spacing.sm,
    right: Spacing.sm,
    flexDirection: 'row',
    gap: Spacing.xs,
  },
  coverBtn: {
    borderWidth: 1.5,
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
  },
  footer: {
    flexDirection: 'row',
    gap: Spacing.sm,
    padding: Spacing.lg,
    borderTopWidth: 1.5,
  },
  footerBtn: {
    flex: 1,
    minHeight: 46,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderRadius: Radius.md,
  },
});
