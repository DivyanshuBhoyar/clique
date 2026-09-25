import { Link } from 'expo-router';
import { Plus } from 'lucide-react-native';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { BorderWidth, Radius, Shadows, Spacing, Typography, Weight } from '@/constants/theme';
import { Id } from '@/convex/_generated/dataModel';
import { useTheme } from '@/hooks/use-theme';

const TYPE_EMOJI: Record<string, string> = {
  main: '💬',
  mood: '🎭',
  topic: '💭',
  timed: '⏳',
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
  const iconBg = theme.chatWarmTint;
  const preview = channel.recentMessages?.[0];

  return (
    <Link href={`/squad/${squadId}/chat/${channel._id}` as any} accessibilityRole="button" accessibilityLabel={`Open ${channel.name}`} style={[
      styles.card,
      {
        backgroundColor: theme.chatSurface,
        borderColor: theme.chatBorder,
        shadowColor: theme.shadow,
        shadowOffset: Shadows.sm.shadowOffset,
        shadowOpacity: Shadows.sm.shadowOpacity,
        shadowRadius: Shadows.sm.shadowRadius,
        elevation: 1,
      },
    ]}>
      {channel.unreadCount > 0 && (
        <View style={styles.unreadWrap}>
          <View style={[styles.unreadDot, { backgroundColor: theme.chatAccent, borderColor: theme.chatAccent }]}>
            <Plus size={12} strokeWidth={2.4} color={theme.chatOnAccent} />
            <ThemedText type="caption" style={{ color: theme.chatOnAccent, fontWeight: Weight.bold, fontVariant: ['tabular-nums'] }}>
              {channel.unreadCount}
            </ThemedText>
          </View>
        </View>
      )}
      <View style={styles.inner}>
        <View style={[styles.iconCircle, { backgroundColor: iconBg, borderWidth: 1.5, borderColor: theme.chatBorder }]}>
          <ThemedText style={styles.iconEmoji}>{emoji}</ThemedText>
        </View>
        <View style={styles.content}>
          <ThemedText type="smallBold" style={{ color: theme.chatBubbleInText }} numberOfLines={1}>{channel.name}</ThemedText>
          {preview && (
            <ThemedText type="caption" style={{ color: theme.chatTextMuted }} numberOfLines={2}>
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
    position: 'relative',
    borderRadius: Radius.xl,
    borderWidth: BorderWidth.thin,
    padding: Spacing.md,
    marginBottom: Spacing.md,
  },
  inner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
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
  content: {
    flex: 1,
    gap: 4,
    paddingTop: 2,
    paddingRight: 44,
  },
  unreadWrap: {
    position: 'absolute',
    top: Spacing.md,
    right: Spacing.md,
    zIndex: 1,
  },
  unreadDot: {
    minWidth: 32,
    height: 24,
    borderRadius: Radius.full,
    borderWidth: 1,
    paddingHorizontal: 8,
    flexDirection: 'row',
    gap: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
