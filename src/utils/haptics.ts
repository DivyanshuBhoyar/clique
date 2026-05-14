import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

async function runHaptic(effect: () => Promise<void>) {
  if (Platform.OS === 'web') return;

  try {
    await effect();
  } catch {
    // Haptics are a delight layer; never block the primary interaction.
  }
}

export function lightImpact() {
  return runHaptic(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light));
}

export function mediumImpact() {
  return runHaptic(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium));
}

export function heavyImpact() {
  return runHaptic(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy));
}

export function successNotification() {
  return runHaptic(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success));
}
