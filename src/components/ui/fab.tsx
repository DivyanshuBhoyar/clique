import { Pressable, type ViewStyle } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { useTheme } from '@/hooks/use-theme';
import { BottomTabInset, Radius, Shadows, Spacing, Weight, LineHeight, Typography } from '@/constants/theme';

interface FabProps {
  onPress?: () => void;
  icon?: string;
  style?: ViewStyle;
  accessibilityLabel?: string;
}

export function Fab({ onPress, icon = '+', style, accessibilityLabel }: FabProps) {
  const theme = useTheme();

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? 'Create new'}
      style={({ pressed }) => [
        {
          position: 'absolute',
          right: Spacing.xxl,
          bottom: BottomTabInset + Spacing.lg,
          width: 56,
          height: 56,
          borderRadius: Radius.xl,
          backgroundColor: theme.fabBackground,
          alignItems: 'center',
          justifyContent: 'center',
          borderWidth: 2,
          borderColor: theme.outline,
          shadowColor: theme.shadow,
          shadowOffset: Shadows.md.offset,
          shadowOpacity: Shadows.md.opacity,
          shadowRadius: Shadows.md.radius,
          elevation: 5,
        },
        pressed && { transform: [{ translateX: 2 }, { translateY: 2 }] },
        style,
      ]}
    >
      <ThemedText style={{ fontSize: Typography.heading, fontWeight: Weight.semibold, color: theme.fabText, lineHeight: LineHeight.heading }}>
        {icon}
      </ThemedText>
    </Pressable>
  );
}
