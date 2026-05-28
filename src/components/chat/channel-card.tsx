import { Link } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { BorderWidth, Radius, Shadows, Spacing, Typography, Weight } from '@/constants/theme';
import { Id } from '@/convex/_generated/dataModel';
import { useTheme } from '@/hooks/use-theme';

const TYPE_EMOJI: Record<string, string> = {
  main: '💬',
  mood: '🎭',
  topic: '💭',
  ephemeral: '⏳',
};

interface ChannelCardProps {
  channel: {
    _id: string;
    name: string;
    unreadCount: number;
    emoji?: string;
    recentMessages?: { nickname: string; content: string }[];
  };
  squadId: Id<"squads">;
  type: string;
}

export function ChannelCard({ channel, squadId, type }: ChannelCardProps) {
  const theme = useTheme();
  const emoji = channel.emoji ?? TYPE_EMOJI[type] ?? '💬';
  const iconBg = type === 'mood'
    ? theme.surfaceWarm
    : type === 'topic'
      ? theme.accentSoft
      : theme.errorSoft;
  const preview = channel.recentMessages?.[0];

  return (
    <Link href={`/squad/${squadId}/chat/${channel._id}` as any} accessibilityRole="button" accessibilityLabel={`Open ${channel.name}`} style={[
      styles.card,
      {
        backgroundColor: theme.surface,
        borderColor: theme.cardBorder,
        shadowColor: theme.shadow,
        shadowOffset: Shadows.sm.offset,
        shadowOpacity: Shadows.sm.opacity,
        shadowRadius: Shadows.sm.radius,
        elevation: 1,
      },
    ]}>
      <View style={styles.inner}>
        <View style={[styles.iconCircle, { backgroundColor: iconBg, borderWidth: 1.5, borderColor: theme.outlineLight }]}>
          <ThemedText style={styles.iconEmoji}>{emoji}</ThemedText>
        </View>
        <View style={styles.content}>
          <View style={styles.row}>
            <ThemedText type="smallBold">{channel.name}</ThemedText>
            {channel.unreadCount > 0 && (
              <View style={[styles.unreadDot, { backgroundColor: theme.accentSoft, borderColor: theme.accentDark }]}> 
                <ThemedText type="caption" style={{ color: theme.text, fontWeight: Weight.bold, fontVariant: ['tabular-nums'] }}>
                  {channel.unreadCount}
                </ThemedText>
              </View>
            )}
          </View>
          {preview && (
            <ThemedText type="caption" themeColor="textSecondary" numberOfLines={2}>
              {preview.nickname}: {preview.content}
            </ThemedText>
          )}
        </View>
      </View>
    </Link>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: Radius.xl,
    borderWidth: BorderWidth.thin,
    padding: Spacing.md,
    marginBottom: Spacing.md,
  },
  inner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: Radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconEmoji: { fontSize: Typography.body },
  content: { flex: 1, gap: 2 },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  unreadDot: {
    minWidth: 24,
    height: 24,
    borderRadius: Radius.full,
    borderWidth: 1,
    paddingHorizontal: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
