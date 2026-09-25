import { useCallback, useState } from 'react';
import { Modal, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { PaginatedList } from '@/components/ui/paginated-list';
import { LineHeight, Spacing, Typography, Weight } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { formatRelativeTime } from '@/utils/time';

interface ItemComment {
  _id: string;
  avatarUrl?: string | null;
  nickname: string;
  content: string;
  createdAt: number;
}

interface ItemCommentsModalProps {
  visible: boolean;
  comments: ItemComment[];
  status: string;
  loadMore: (numItems: number) => void;
  onClose: () => void;
  onSend: (content: string) => Promise<void>;
}

export function ItemCommentsModal({
  visible,
  comments,
  status,
  loadMore,
  onClose,
  onSend,
}: ItemCommentsModalProps) {
  const theme = useTheme();
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);

  const handleSend = useCallback(async () => {
    const trimmed = text.trim();
    if (!trimmed || sending) return;
    setSending(true);
    try {
      await onSend(trimmed);
      setText('');
    } finally {
      setSending(false);
    }
  }, [text, sending, onSend]);

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <ThemedView style={styles.modal}>
        <SafeAreaView style={styles.modalSafe}>
          <View style={[styles.modalHeader, { borderBottomColor: theme.outlineLight }]}>
            <Pressable onPress={onClose}>
              <ThemedText type="smallBold">Close</ThemedText>
            </Pressable>
            <ThemedText style={styles.modalTitle}>Comments</ThemedText>
            <View style={styles.headerSpacer} />
          </View>

          <PaginatedList
            data={comments}
            keyExtractor={(c) => c._id}
            status={status}
            loadMore={loadMore}
            renderItem={({ item }) => (
              <View style={[styles.commentCard, { backgroundColor: theme.surface, borderColor: theme.outline }]}>
                <View style={styles.commentHeader}>
                  <ThemedText type="smallBold">@{item.nickname}</ThemedText>
                  <ThemedText type="caption" themeColor="textSecondary" style={styles.commentTime}>
                    {formatRelativeTime(item.createdAt)}
                  </ThemedText>
                </View>
                <ThemedText style={styles.commentContent}>{item.content}</ThemedText>
              </View>
            )}
          />

          <View style={[styles.inputRow, { borderTopColor: theme.outlineLight, backgroundColor: theme.background }]}>
            <TextInput
              value={text}
              onChangeText={setText}
              placeholder="Add a comment..."
              placeholderTextColor={theme.textSecondary}
              style={[styles.input, { color: theme.text, backgroundColor: theme.surface, borderColor: theme.outline }]}
              returnKeyType="send"
              onSubmitEditing={handleSend}
            />
            <Pressable
              onPress={handleSend}
              disabled={!text.trim() || sending}
              style={[
                styles.sendBtn,
                { backgroundColor: text.trim() && !sending ? theme.accent : theme.backgroundElement, borderColor: theme.outline },
                (!text.trim() || sending) && styles.sendDisabled,
              ]}
            >
              <ThemedText style={[styles.sendText, { color: text.trim() && !sending ? theme.text : theme.textTertiary }]}>
                {sending ? '...' : 'Send'}
              </ThemedText>
            </Pressable>
          </View>
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
  headerSpacer: {
    width: 50,
  },
  commentCard: {
    padding: Spacing.md,
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.sm,
    borderWidth: 1.5,
    borderRadius: 12,
    gap: Spacing.xs,
  },
  commentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  commentTime: {
    marginLeft: 'auto',
  },
  commentContent: {
    fontSize: Typography.body,
    lineHeight: LineHeight.subtitle,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderTopWidth: 1.5,
    gap: Spacing.sm,
  },
  input: {
    flex: 1,
    minHeight: 38,
    paddingHorizontal: Spacing.md,
    borderRadius: 9999,
    borderWidth: 1.5,
    fontSize: Typography.body,
  },
  sendBtn: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: 9999,
    borderWidth: 1.5,
    minHeight: 38,
    justifyContent: 'center',
  },
  sendDisabled: {
    opacity: 0.4,
  },
  sendText: {
    fontSize: Typography.small,
    fontWeight: Weight.bold,
  },
});
