import { Platform, StyleSheet, Text, type TextProps } from 'react-native';

import { Fonts, ThemeColor, Typography } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export type ThemedTextType =
  | 'default'
  | 'title'
  | 'heading'
  | 'subtitle'
  | 'bodyBold'
  | 'small'
  | 'smallBold'
  | 'caption'
  | 'link'
  | 'linkPrimary'
  | 'code';

export type ThemedTextProps = TextProps & {
  type?: ThemedTextType;
  themeColor?: ThemeColor;
};

export function ThemedText({ style, type = 'default', themeColor, ...rest }: ThemedTextProps) {
  const theme = useTheme();

  return (
    <Text
      style={[
        { color: theme[themeColor ?? 'text'] },
        type === 'default' && styles.default,
        type === 'title' && styles.title,
        type === 'heading' && styles.heading,
        type === 'subtitle' && styles.subtitle,
        type === 'bodyBold' && styles.bodyBold,
        type === 'small' && styles.small,
        type === 'smallBold' && styles.smallBold,
        type === 'caption' && styles.caption,
        type === 'link' && styles.link,
        type === 'linkPrimary' && styles.linkPrimary,
        type === 'code' && styles.code,
        style,
      ]}
      {...rest}
    />
  );
}

const styles = StyleSheet.create({
  caption: {
    fontSize: Typography.caption,
    lineHeight: 16,
    fontWeight: '400',
  },
  small: {
    fontSize: Typography.small,
    lineHeight: 20,
    fontWeight: '400',
  },
  smallBold: {
    fontSize: Typography.small,
    lineHeight: 20,
    fontWeight: '700',
  },
  default: {
    fontSize: Typography.body,
    lineHeight: 24,
    fontWeight: '400',
  },
  bodyBold: {
    fontSize: Typography.body,
    lineHeight: 24,
    fontWeight: '700',
  },
  subtitle: {
    fontSize: Typography.subtitle,
    lineHeight: 28,
    fontWeight: '600',
  },
  heading: {
    fontSize: Typography.heading,
    lineHeight: 32,
    fontWeight: '600',
  },
  title: {
    fontSize: Typography.title,
    fontWeight: '700',
    lineHeight: 36,
  },
  link: {
    lineHeight: 20,
    fontSize: Typography.small,
    fontWeight: '500',
    textDecorationLine: 'underline',
  },
  linkPrimary: {
    lineHeight: 20,
    fontSize: Typography.small,
    fontWeight: '600',
  },
  code: {
    fontFamily: Fonts.mono,
    fontWeight: Platform.select({ android: '700' }) ?? '500',
    fontSize: Typography.caption,
  },
});
