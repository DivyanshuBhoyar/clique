import { Pencil, Trash2 } from 'lucide-react-native';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { Radius, Spacing, Typography, Weight } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { heavyImpact } from '@/utils/haptics';

interface MemoryActionsModalProps {
  visible: boolean;
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

export function MemoryActionsModal({ visible, onClose, onEdit, onDelete }: MemoryActionsModalProps) {
  const theme = useTheme();

  if (!visible) return null;

  return (
    <Modal transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose}>
        <View style={[styles.sheet, { backgroundColor: theme.surface, borderColor: theme.outline }]}>
          <Pressable
            onPress={() => { onEdit(); onClose(); }}
            style={[styles.actionRow, { borderBottomColor: theme.outlineLight }]}
            accessibilityRole="button"
            accessibilityLabel="Edit memory"
          >
            <Pencil size={18} color={theme.text} strokeWidth={2.5} />
            <Text style={[styles.actionText, { color: theme.text }]}>Edit memory</Text>
          </Pressable>

          <Pressable
            onPress={() => { heavyImpact(); onDelete(); onClose(); }}
            style={[styles.actionRow, { borderBottomColor: theme.outlineLight }]}
            accessibilityRole="button"
            accessibilityLabel="Delete memory"
          >
            <Trash2 size={18} color={theme.error} strokeWidth={2.5} />
            <Text style={[styles.actionText, { color: theme.error }]}>Delete memory</Text>
          </Pressable>

          <Pressable onPress={onClose} style={styles.cancelBtn} accessibilityRole="button" accessibilityLabel="Cancel memory actions">
            <Text style={[styles.cancelText, { color: theme.textSecondary }]}>Cancel</Text>
          </Pressable>
        </View>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  sheet: {
    borderTopLeftRadius: Radius.xl,
    borderTopRightRadius: Radius.xl,
    borderTopWidth: 2,
    paddingBottom: Spacing.xxxl,
  },
  actionRow: {
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    borderBottomWidth: 1,
  },
  actionText: {
    fontSize: Typography.body,
    fontWeight: Weight.medium,
  },
  cancelBtn: {
    minHeight: 52,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelText: {
    fontSize: Typography.body,
    fontWeight: Weight.semibold,
  },
});
