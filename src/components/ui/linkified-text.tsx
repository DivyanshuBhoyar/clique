import { Text } from 'react-native';

import { ThemedText, type ThemedTextProps } from '@/components/themed-text';
import { openExternalUrl } from '@/components/ui/link-preview-card';
import { useTheme } from '@/hooks/use-theme';
import { splitTextByUrls } from '@/utils/links';

type LinkifiedTextProps = Omit<ThemedTextProps, 'children'> & {
  children: string;
  linkColor?: string;
};

export function LinkifiedText({ children, linkColor, ...textProps }: LinkifiedTextProps) {
  const theme = useTheme();
  const parts = splitTextByUrls(children);
  const resolvedLinkColor = linkColor ?? theme.accentDark;

  return (
    <ThemedText {...textProps}>
      {parts.map((part, index) => {
        if (!part.isUrl || !part.url) return part.text;

        return (
          <Text
            key={`${part.url}-${index}`}
            onPress={(event) => openExternalUrl(part.url!, event)}
            style={{ color: resolvedLinkColor, textDecorationLine: 'underline' }}
          >
            {part.displayText}
          </Text>
        );
      })}
    </ThemedText>
  );
}
