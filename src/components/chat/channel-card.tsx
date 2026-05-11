import { Link } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Shadows, Spacing, Typography, Weight } from '@/constants/theme';
import { Id } from '@/convex/_generated/dataModel';
import { useTheme } from '@/hooks/use-theme';

const TYPE_EMOJI: Record<string, string> = {
  main: '💬',
  mood: '🎭',
  topic: '💭',
  ephemeral: '⏳',
};

function iconBgForType(type: string) {
  const theme = useTheme();
  if (type === 'mood') return theme.surfaceWarm;
  if (type === 'topic') return theme.accentSoft;
  return theme.errorSoft;
}

interface ChannelCardProps {
  channel: {
    _id: string;
    name: string;
    unreadCount: number;
    recentMessages?: { nickname: string; content: string }[];
  };
  squadId: Id<"squads">;
  type: string;
}

export function ChannelCard({ channel, squadId, type }: ChannelCardProps) {
  const theme = useTheme();
  const emoji = TYPE_EMOJI[type] ?? '💬';
  const iconBg = iconBgForType(type);
  const preview = channel.recentMessages?.[0];

  return (
    <Link href={`/squad/${squadId}/chat/${channel._id}` as any} style={[
      styles.card,
      {
        backgroundColor: theme.surface,
        borderWidth: 2,
        borderColor: theme.outline,
        shadowColor: theme.shadow,
        shadowOffset: Shadows.sm.offset,
        shadowOpacity: Shadows.sm.opacity,
        shadowRadius: Shadows.sm.radius,
        elevation: 2,
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
              <View style={[styles.unreadDot, { backgroundColor: theme.accent, borderWidth: 1.5, borderColor: theme.outline }]}>
                <ThemedText type="caption" style={{ color: theme.text, fontWeight: Weight.bold }}>
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
    borderRadius: 16,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
  },
  inner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
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
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
