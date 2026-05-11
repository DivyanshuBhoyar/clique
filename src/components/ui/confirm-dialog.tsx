import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { Colors, Radius, Shadows, Spacing, Weight, LineHeight, Typography } from '@/constants/theme';

interface ConfirmDialogProps {
  visible: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  destructive?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  visible,
  title,
  message,
  confirmLabel = 'Confirm',
  destructive = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <Pressable style={styles.backdrop} onPress={onCancel}>
        <Pressable style={styles.card} onPress={(e) => e.stopPropagation()}>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.message}>{message}</Text>
          <View style={styles.buttons}>
            <Pressable style={[styles.btn, styles.cancelBtn]} onPress={onCancel}>
              <Text style={styles.cancelText}>Cancel</Text>
            </Pressable>
            <Pressable
              style={[styles.btn, destructive ? styles.destructBtn : styles.confirmBtn]}
              onPress={onConfirm}
            >
              <Text style={[styles.btnText, destructive && styles.destructText]}>
                {confirmLabel}
              </Text>
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.xl,
  },
  card: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: Colors.light.surface,
    borderRadius: Radius.xl,
    borderWidth: 2,
    borderColor: Colors.light.outline,
    padding: Spacing.xl,
    gap: Spacing.md,
    shadowColor: Colors.light.shadow,
    shadowOffset: Shadows.lg.offset,
    shadowOpacity: 0.15,
    shadowRadius: 0,
    elevation: 8,
  },
  title: {
    fontSize: Typography.body,
    fontWeight: Weight.bold,
    color: Colors.light.text,
  },
  message: {
    fontSize: Typography.small,
    lineHeight: LineHeight.small,
    color: Colors.light.textSecondary,
  },
  buttons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: Spacing.sm,
    marginTop: Spacing.sm,
  },
  btn: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm + 2,
    borderRadius: Radius.md,
    borderWidth: 1.5,
  },
  cancelBtn: {
    backgroundColor: Colors.light.surface,
    borderColor: Colors.light.outlineLight,
  },
  cancelText: {
    fontSize: Typography.small,
    fontWeight: Weight.semibold,
    color: Colors.light.textSecondary,
  },
  confirmBtn: {
    backgroundColor: Colors.light.accent,
    borderColor: Colors.light.outline,
  },
  destructBtn: {
    backgroundColor: Colors.light.errorSoft,
    borderColor: Colors.light.error,
  },
  btnText: {
    fontSize: Typography.small,
    fontWeight: Weight.bold,
    color: Colors.light.text,
  },
  destructText: {
    color: Colors.light.error,
  },
});
