import { CheckCircle, Info, X, XCircle } from 'lucide-react-native';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown, FadeOut } from 'react-native-reanimated';

import { BorderWidth, Colors, LineHeight, Radius, Shadows, Spacing, Typography, Weight } from '@/constants/theme';
import { ToastType, useToastStore } from './toast';

const ICON_CONFIG: Record<ToastType, { icon: typeof CheckCircle; color: string; bg: string }> = {
  success: { icon: CheckCircle, color: Colors.light.success, bg: Colors.light.successSoft },
  error: { icon: XCircle, color: Colors.light.error, bg: Colors.light.errorSoft },
  info: { icon: Info, color: Colors.light.textSecondary, bg: Colors.light.backgroundElement },
};

export function ToastHost() {
  const toasts = useToastStore((s) => s.toasts);
  const dismiss = useToastStore((s) => s.dismiss);

  if (toasts.length === 0) return null;

  return (
    <View style={styles.container} pointerEvents="box-none">
      {toasts.map((toast) => {
        const cfg = ICON_CONFIG[toast.type];
        const Icon = cfg.icon;
        return (
          <Animated.View
            key={toast.id}
            entering={FadeInDown.duration(200)}
            exiting={FadeOut.duration(150)}
            style={[styles.toast, { backgroundColor: cfg.bg, borderColor: Colors.light.outline }]}
          >
            <Icon size={18} color={cfg.color} strokeWidth={2.5} />
            <Text style={[styles.message, { color: Colors.light.text }]} numberOfLines={2}>
              {toast.message}
            </Text>
            <Pressable onPress={() => dismiss(toast.id)} hitSlop={8}>
              <X size={14} color={Colors.light.textTertiary} />
            </Pressable>
          </Animated.View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 90,
    left: Spacing.lg,
    right: Spacing.lg,
    gap: Spacing.sm,
    zIndex: 9999,
  },
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm + 2,
    borderRadius: Radius.lg,
    borderWidth: BorderWidth.thin,
    shadowColor: Colors.light.shadow,
    shadowOffset: Shadows.sm.shadowOffset,
    shadowOpacity: Shadows.sm.shadowOpacity,
    shadowRadius: Shadows.sm.shadowRadius,
    elevation: 4,
  },
  message: {
    flex: 1,
    fontSize: Typography.small,
    lineHeight: LineHeight.small,
    fontWeight: Weight.medium,
  },
});
