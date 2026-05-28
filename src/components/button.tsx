/**
 * Button component — supports primary (yellow), secondary (white/outline), and dark variants.
 * All variants use 2px black border and Radius.lg for the cozy neo-brutalist look.
 *
 * Usage:
 *   <Button title="Create Squad 🎉" variant="primary" onPress={...} />
 *   <Button title="Cancel" variant="secondary" onPress={...} />
 *   <Button title="Continue with Google" variant="dark" onPress={...} />
 */
import { BorderWidth, Colors, Radius, Shadows, Spacing, Typography, Weight } from '@/constants/theme';
import React from 'react';
import { Pressable, StyleSheet, Text, ViewStyle } from 'react-native';

export type ButtonVariant = 'primary' | 'secondary' | 'dark' | 'ghost';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: ButtonVariant;
  /** Legacy color prop — overrides variant background when provided */
  color?: string;
  style?: ViewStyle;
  disabled?: boolean;
  fullWidth?: boolean;
}

const variantStyles: Record<ButtonVariant, { bg: string; text: string; borderColor: string }> = {
  primary: {
    bg: Colors.light.accent,
    text: Colors.light.text,
    borderColor: Colors.light.accentDark,
  },
  secondary: {
    bg: Colors.light.surface,
    text: Colors.light.text,
    borderColor: Colors.light.cardBorder,
  },
  dark: {
    bg: Colors.light.featureAccent,
    text: '#FFFFFF',
    borderColor: Colors.light.featureAccent,
  },
  ghost: {
    bg: 'transparent',
    text: Colors.light.featureAccent,
    borderColor: 'transparent',
  },
};

export function Button({
  title,
  onPress,
  variant = 'primary',
  color,
  style,
  disabled = false,
  fullWidth = true,
}: ButtonProps) {
  const vStyle = variantStyles[variant];
  const bgColor = color ?? vStyle.bg;

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      style={({ pressed }) => [
        styles.container,
        {
          backgroundColor: bgColor,
          borderColor: vStyle.borderColor,
          borderWidth: variant === 'ghost' ? 0 : BorderWidth.medium,
        },
        fullWidth && styles.fullWidth,
        pressed && styles.pressed,
        disabled && styles.disabled,
        style,
      ]}
    >
      <Text style={[styles.text, { color: vStyle.text }]}>
        {title}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing.xxl,
    borderRadius: Radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 52,
    shadowColor: Colors.light.shadow,
    shadowOffset: Shadows.sm.offset,
    shadowOpacity: 0.15,
    shadowRadius: Shadows.sm.radius,
    elevation: 2,
  },
  fullWidth: {
    width: '100%',
  },
  pressed: {
    transform: [{ scale: 0.97 }],
    opacity: 0.9,
  },
  disabled: {
    opacity: 0.45,
  },
  text: {
    fontSize: Typography.body,
    fontWeight: Weight.semibold,
    letterSpacing: 0.2,
  },
});
