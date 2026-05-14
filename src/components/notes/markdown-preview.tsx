import { StyleSheet, View } from 'react-native';
import Markdown from 'react-native-markdown-display';

import { LineHeight, Radius, Spacing, Typography, Weight } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

interface MarkdownPreviewProps {
  content: string;
  compact?: boolean;
}

export function markdownToPlainText(markdown: string) {
  return markdown
    .replace(/```[\s\S]*?```/g, (match) => match.replace(/```/g, ''))
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/^>\s?/gm, '')
    .replace(/^\s*[-*+]\s+/gm, '• ')
    .replace(/^\s*\d+\.\s+/gm, '')
    .replace(/[*_]{1,3}([^*_]+)[*_]{1,3}/g, '$1')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/~~([^~]+)~~/g, '$1')
    .trim();
}

export function MarkdownPreview({ content, compact = false }: MarkdownPreviewProps) {
  const theme = useTheme();

  if (!content.trim()) {
    return null;
  }

  return (
    <View style={compact ? styles.compact : styles.container}>
      <Markdown
        style={{
          body: {
            color: theme.text,
            fontSize: compact ? Typography.small : Typography.body,
            lineHeight: compact ? LineHeight.small : LineHeight.body,
          },
          heading1: {
            color: theme.text,
            fontSize: compact ? Typography.body : Typography.heading,
            lineHeight: compact ? LineHeight.body : LineHeight.heading,
            fontWeight: Weight.extrabold,
            marginBottom: Spacing.xs,
          },
          heading2: {
            color: theme.text,
            fontSize: compact ? Typography.body : Typography.subtitle,
            lineHeight: compact ? LineHeight.body : LineHeight.subtitle,
            fontWeight: Weight.bold,
            marginBottom: Spacing.xs,
          },
          heading3: {
            color: theme.text,
            fontSize: Typography.body,
            lineHeight: LineHeight.body,
            fontWeight: Weight.bold,
            marginBottom: Spacing.xs,
          },
          paragraph: {
            marginTop: 0,
            marginBottom: compact ? 2 : Spacing.sm,
          },
          bullet_list: {
            marginBottom: compact ? 2 : Spacing.sm,
          },
          ordered_list: {
            marginBottom: compact ? 2 : Spacing.sm,
          },
          list_item: {
            color: theme.text,
            marginBottom: compact ? 0 : 2,
          },
          bullet_list_icon: {
            color: theme.accent,
          },
          ordered_list_icon: {
            color: theme.accent,
          },
          strong: {
            fontWeight: Weight.bold,
            color: theme.text,
          },
          em: {
            fontStyle: 'italic',
            color: theme.text,
          },
          code_inline: {
            color: theme.text,
            backgroundColor: theme.backgroundElement,
            borderColor: theme.outlineLight,
            borderWidth: 1,
            borderRadius: Radius.sm,
            paddingHorizontal: 4,
          },
          fence: {
            color: theme.text,
            backgroundColor: theme.backgroundElement,
            borderColor: theme.outlineLight,
            borderWidth: 1.5,
            borderRadius: Radius.md,
            padding: Spacing.sm,
            marginBottom: Spacing.sm,
          },
          blockquote: {
            backgroundColor: theme.accentSoft,
            borderLeftColor: theme.accent,
            borderLeftWidth: 4,
            paddingHorizontal: Spacing.sm,
            paddingVertical: Spacing.xs,
            marginBottom: Spacing.sm,
          },
          link: {
            color: theme.accentDark,
            textDecorationLine: 'underline',
          },
        }}
      >
        {content}
      </Markdown>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  compact: {
    width: '100%',
  },
});
