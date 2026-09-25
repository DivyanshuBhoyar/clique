import { Bell, BellOff, LogOut, Plus, Share } from 'lucide-react-native';
import type React from 'react';
import { Modal, Platform, Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { LineHeight, Radius, Shadows, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useWebPushNotifications } from '@/hooks/use-web-push-notifications';

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
  const isWeb = Platform.OS === 'web';

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
              shadowOffset: Shadows.lg.shadowOffset,
              shadowOpacity: Shadows.lg.shadowOpacity,
              shadowRadius: Shadows.lg.shadowRadius,
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
              title="Create another space"
              subtitle="Start a new cozy space"
              onPress={onCreateSquad}
            />

            {isWeb && <WebPushSettingsSection />}
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

function WebPushSettingsSection() {
  const theme = useTheme();
  const { supported, standalone, status, enable } = useWebPushNotifications();

  if (!supported) return null;

  const isSubscribed = status.state === 'subscribed';
  const isDenied = status.state === 'denied';
  const isRequesting = status.state === 'requesting';
  const subtitle = isSubscribed
    ? 'Browser notifications on'
    : isDenied
      ? 'Notifications blocked in browser'
      : 'Get notified when someone messages you';

  return (
    <View style={styles.webPushBlock}>
      <SettingsRow
        icon={
          isSubscribed ? (
            <Bell size={18} color={theme.success} strokeWidth={2.3} />
          ) : (
            <BellOff size={18} color={theme.text} strokeWidth={2.3} />
          )
        }
        title="Browser notifications"
        subtitle={subtitle}
        onPress={() => {
          if (!isSubscribed && !isDenied) {
            void enable();
          }
        }}
      />

      {!standalone && isIosSafariHint() && (
        <View style={[styles.installHint, { borderColor: theme.outlineLight, backgroundColor: theme.backgroundElement }]}>
          <View style={styles.installHintRow}>
            <Share size={16} color={theme.text} strokeWidth={2.3} />
            <ThemedText type="smallBold">Enable push on iPhone</ThemedText>
          </View>
          <ThemedText type="caption" themeColor="textSecondary" style={styles.installHintBody}>
            Tap Share → “Add to Home Screen”, open Clique from your Home Screen, then allow notifications here.
          </ThemedText>
        </View>
      )}
    </View>
  );
}

function isIosSafariHint() {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent;
  return /iPhone|iPad|iPod/.test(ua) && /Safari/.test(ua) && !/CriOS|FxiOS|OPiOS/.test(ua);
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
  webPushBlock: {
    gap: Spacing.sm,
  },
  installHint: {
    borderWidth: 1.5,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    gap: Spacing.xs,
  },
  installHintRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  installHintBody: {
    lineHeight: LineHeight.small,
  },
});
