import { Platform, StyleSheet, Text, type TextProps } from 'react-native';

import {
  Fonts,
  LineHeight,
  ThemeColor,
  Typography,
  Weight,
} from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export type ThemedTextType =
  | 'default'
  | 'display'
  | 'title'
  | 'heading'
  | 'subtitle'
  | 'bodyBold'
  | 'small'
  | 'smallBold'
  | 'caption'
  | 'captionBold'
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
        type === 'display' && styles.display,
        type === 'title' && styles.title,
        type === 'heading' && styles.heading,
        type === 'subtitle' && styles.subtitle,
        type === 'bodyBold' && styles.bodyBold,
        type === 'small' && styles.small,
        type === 'smallBold' && styles.smallBold,
        type === 'caption' && styles.caption,
        type === 'captionBold' && styles.captionBold,
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
  display: {
    fontSize: Typography.display,
    lineHeight: LineHeight.display,
    fontWeight: Weight.bold,
    fontFamily: Fonts.rounded,
  },
  title: {
    fontSize: Typography.title,
    fontWeight: Weight.bold,
    lineHeight: LineHeight.title,
    fontFamily: Fonts.rounded,
  },
  heading: {
    fontSize: Typography.heading,
    lineHeight: LineHeight.heading,
    fontWeight: Weight.semibold,
    fontFamily: Fonts.rounded,
  },
  subtitle: {
    fontSize: Typography.subtitle,
    lineHeight: LineHeight.subtitle,
    fontWeight: Weight.semibold,
    fontFamily: Fonts.rounded,
  },
  default: {
    fontSize: Typography.body,
    lineHeight: LineHeight.body,
    fontWeight: Weight.regular,
  },
  bodyBold: {
    fontSize: Typography.body,
    lineHeight: LineHeight.body,
    fontWeight: Weight.bold,
  },
  small: {
    fontSize: Typography.small,
    lineHeight: LineHeight.small,
    fontWeight: Weight.regular,
  },
  smallBold: {
    fontSize: Typography.small,
    lineHeight: LineHeight.small,
    fontWeight: Weight.bold,
  },
  caption: {
    fontSize: Typography.caption,
    lineHeight: LineHeight.caption,
    fontWeight: Weight.regular,
  },
  captionBold: {
    fontSize: Typography.caption,
    lineHeight: LineHeight.caption,
    fontWeight: Weight.bold,
  },
  link: {
    lineHeight: LineHeight.small,
    fontSize: Typography.small,
    fontWeight: Weight.medium,
    textDecorationLine: 'underline',
  },
  linkPrimary: {
    lineHeight: LineHeight.small,
    fontSize: Typography.small,
    fontWeight: Weight.semibold,
  },
  code: {
    fontFamily: Fonts.mono,
    fontWeight: Platform.select({ android: Weight.bold }) ?? Weight.medium,
    fontSize: Typography.caption,
  },
});
