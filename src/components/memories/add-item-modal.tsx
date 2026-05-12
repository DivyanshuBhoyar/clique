import { useCallback, useState } from 'react';
import { Modal, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { ImageUploadField } from '@/components/ui/image-upload-field';
import { LineHeight, Radius, Spacing, Typography, Weight } from '@/constants/theme';
import { Id } from '@/convex/_generated/dataModel';
import { useImageUpload } from '@/hooks/use-image-upload';
import { useTheme } from '@/hooks/use-theme';

type AddDropType = 'reflection' | 'photo' | 'link';

interface AddItemModalProps {
  visible: boolean;
  onClose: () => void;
  onAdd: (args: {
    type: AddDropType;
    content: string;
    caption?: string;
    storageId?: Id<"_storage">;
  }) => Promise<void>;
}

export function AddItemModal({ visible, onClose, onAdd }: AddItemModalProps) {
  const theme = useTheme();
  const [dropType, setDropType] = useState<AddDropType>('reflection');
  const [dropContent, setDropContent] = useState('');
  const [dropCaption, setDropCaption] = useState('');
  const [sendingDrop, setSendingDrop] = useState(false);
  const [photoStorageId, setPhotoStorageId] = useState<Id<"_storage"> | null>(null);
  const { previewUri: dropPreviewUri, uploading: uploadingPhoto, pickAndUpload: pickDropPhoto, reset: resetDropPhoto } = useImageUpload();

  const handleAdd = useCallback(async () => {
    const trimmed = dropContent.trim();
    if (!trimmed || sendingDrop) return;
    setSendingDrop(true);
    try {
      await onAdd({
        type: dropType,
        content: trimmed,
        caption: dropCaption.trim() || undefined,
        storageId: dropType === 'photo' && photoStorageId ? photoStorageId : undefined,
      });
      setDropContent('');
      setDropCaption('');
      setPhotoStorageId(null);
      resetDropPhoto();
      onClose();
    } finally {
      setSendingDrop(false);
    }
  }, [dropContent, dropCaption, sendingDrop, dropType, photoStorageId, onAdd, onClose, resetDropPhoto]);

  const handlePickPhoto = useCallback(async () => {
    const storageId = await pickDropPhoto();
    if (storageId) setPhotoStorageId(storageId);
  }, [pickDropPhoto]);

  const handleRemovePhoto = useCallback(() => {
    setPhotoStorageId(null);
    resetDropPhoto();
  }, [resetDropPhoto]);

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <ThemedView style={styles.modal}>
        <SafeAreaView style={styles.modalSafe}>
          <View style={[styles.modalHeader, { borderBottomColor: theme.outlineLight }]}>
            <Pressable onPress={onClose}>
              <ThemedText type="smallBold">Cancel</ThemedText>
            </Pressable>
            <ThemedText style={styles.modalTitle}>Add Drop</ThemedText>
            <Pressable
              onPress={handleAdd}
              disabled={!dropContent.trim() || sendingDrop}
            >
              <ThemedText type="smallBold" style={(!dropContent.trim() || sendingDrop) && { opacity: 0.4 }}>
                {sendingDrop ? '...' : 'Add'}
              </ThemedText>
            </Pressable>
          </View>

          <View style={styles.typeRow}>
            {(['reflection', 'photo', 'link'] as const).map((t) => (
              <Pressable
                key={t}
                onPress={() => setDropType(t)}
                style={[
                  styles.typeBtn,
                  { backgroundColor: theme.surface, borderColor: theme.outline },
                  dropType === t && { backgroundColor: theme.accent, borderColor: theme.outline },
                ]}
              >
                <ThemedText style={[
                  styles.typeText,
                  { color: theme.textSecondary },
                  dropType === t && { color: theme.text, fontWeight: Weight.bold },
                ]}>
                  {t === 'reflection' ? '💭 Reflection' : t === 'photo' ? '📸 Photo' : '🔗 Link'}
                </ThemedText>
              </Pressable>
            ))}
          </View>

          {dropType === 'photo' && (
            <ImageUploadField
              previewUri={dropPreviewUri}
              uploading={uploadingPhoto}
              onPick={handlePickPhoto}
              onRemove={handleRemovePhoto}
              placeholder="+ Pick a photo"
            />
          )}

          <TextInput
            value={dropContent}
            onChangeText={setDropContent}
            placeholder={
              dropType === 'reflection' ? 'What does this moment mean to you...'
              : dropType === 'link' ? 'Paste a URL...'
              : 'Photo description...'
            }
            placeholderTextColor={theme.textSecondary}
            style={[styles.input, { color: theme.text, borderColor: theme.outlineLight, backgroundColor: theme.surface, borderRadius: Radius.md }]}
            multiline
            autoFocus
          />

          {dropType === 'photo' && (
            <TextInput
              value={dropCaption}
              onChangeText={setDropCaption}
              placeholder="Caption (optional)"
              placeholderTextColor={theme.textSecondary}
              style={[styles.captionInput, { color: theme.text, borderColor: theme.outlineLight, backgroundColor: theme.surface, borderRadius: Radius.md }]}
              maxLength={200}
            />
          )}
        </SafeAreaView>
      </ThemedView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modal: {
    flex: 1,
  },
  modalSafe: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderBottomWidth: 1,
  },
  modalTitle: {
    fontSize: Typography.body,
    fontWeight: Weight.bold,
  },
  typeRow: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.three,
  },
  typeBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 2,
  },
  typeText: {
    fontSize: Typography.small,
    fontWeight: Weight.semibold,
  },
  input: {
    minHeight: 100,
    marginHorizontal: Spacing.three,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: Typography.body,
    lineHeight: LineHeight.body,
    borderWidth: 2,
    textAlignVertical: 'top',
  },
  captionInput: {
    marginHorizontal: Spacing.three,
    marginTop: Spacing.two,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: Typography.body,
    borderWidth: 2,
  },
});
