import { LogOut, Plus } from 'lucide-react-native';
import type React from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { LineHeight, Radius, Shadows, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

interface HomeSettingsSheetProps {
  visible: boolean;
  squadName: string;
  memberCount: number;
  onClose: () => void;
  onCreateSquad: () => void;
  onSignOutPress: () => void;
}

export function HomeSettingsSheet({
  visible,
  squadName,
  memberCount,
  onClose,
  onCreateSquad,
  onSignOutPress,
}: HomeSettingsSheetProps) {
  const theme = useTheme();

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable
          style={[
            styles.sheet,
            {
              backgroundColor: theme.surface,
              borderColor: theme.outline,
              shadowColor: theme.shadow,
              shadowOffset: Shadows.lg.offset,
              shadowOpacity: Shadows.lg.opacity,
              shadowRadius: Shadows.lg.radius,
            },
          ]}
          onPress={(event) => event.stopPropagation()}
        >
          <View style={styles.handleWrap}>
            <View style={[styles.handle, { backgroundColor: theme.outlineLight }]} />
          </View>

          <View style={styles.header}>
            <ThemedText type="heading">Settings</ThemedText>
            <ThemedText type="small" themeColor="textSecondary" style={styles.subtitle}>
              {squadName} · {memberCount} member{memberCount === 1 ? '' : 's'}
            </ThemedText>
          </View>

          <View style={styles.actions}>
            <SettingsRow
              icon={<Plus size={18} color={theme.text} strokeWidth={2.3} />}
              title="Create another squad"
              subtitle="Start a new cozy space"
              onPress={onCreateSquad}
            />
          </View>

          <Pressable
            onPress={onSignOutPress}
            style={[styles.signOutButton, { borderColor: theme.error, backgroundColor: theme.errorSoft }]}
            accessibilityRole="button"
            accessibilityLabel="Sign out"
          >
            <LogOut size={18} color={theme.error} strokeWidth={2.3} />
            <ThemedText type="smallBold" style={{ color: theme.error }}>
              Sign out
            </ThemedText>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

interface SettingsRowProps {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  onPress: () => void;
}

function SettingsRow({ icon, title, subtitle, onPress }: SettingsRowProps) {
  const theme = useTheme();

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.row,
        { borderColor: theme.outlineLight, backgroundColor: theme.backgroundElement },
        pressed && styles.rowPressed,
      ]}
      accessibilityRole="button"
      accessibilityLabel={title}
    >
      <View style={[styles.rowIcon, { borderColor: theme.outline, backgroundColor: theme.surface }]}>
        {icon}
      </View>
      <View style={styles.rowCopy}>
        <ThemedText type="smallBold">{title}</ThemedText>
        <ThemedText type="caption" themeColor="textSecondary" numberOfLines={1}>
          {subtitle}
        </ThemedText>
      </View>
      <ThemedText type="small" themeColor="textSecondary">→</ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  sheet: {
    borderTopLeftRadius: Radius.xl,
    borderTopRightRadius: Radius.xl,
    borderWidth: 2,
    padding: Spacing.lg,
    paddingBottom: Spacing.xxxl,
    gap: Spacing.lg,
  },
  handleWrap: {
    alignItems: 'center',
  },
  handle: {
    width: 44,
    height: 5,
    borderRadius: Radius.full,
  },
  header: {
    gap: 2,
  },
  subtitle: {
    lineHeight: LineHeight.small,
  },
  actions: {
    gap: Spacing.sm,
  },
  row: {
    minHeight: 64,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    borderWidth: 1.5,
    borderRadius: Radius.lg,
    padding: Spacing.md,
  },
  rowPressed: {
    opacity: 0.75,
  },
  rowIcon: {
    width: 36,
    height: 36,
    borderWidth: 1.5,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowCopy: {
    flex: 1,
    minWidth: 0,
  },
  signOutButton: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    borderWidth: 2,
    borderRadius: Radius.lg,
  },
});
