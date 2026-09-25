import { Link } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing, Typography, Weight } from '@/constants/theme';
import { Id } from '@/convex/_generated/dataModel';
import { useTheme } from '@/hooks/use-theme';

function formatTimeRemaining(ms: number): string {
  if (ms <= 0) return 'Expired';
  const minutes = Math.floor(ms / 60000);
  if (minutes < 60) return `${minutes}m left`;
  const hours = Math.floor(minutes / 60);
  const remainMin = minutes % 60;
  if (hours < 24) return remainMin > 0 ? `${hours}h ${remainMin}m left` : `${hours}h left`;
  const days = Math.floor(hours / 24);
  return `${days}d left`;
}

interface EphemeralChannelCardProps {
  channel: {
    _id: string;
    name: string;
    unreadCount: number;
    expiresAt?: number;
    isExpired?: boolean;
  };
  squadId: Id<"squads">;
}

export function EphemeralChannelCard({ channel, squadId }: EphemeralChannelCardProps) {
  const theme = useTheme();
  const remaining = channel.expiresAt ? channel.expiresAt - Date.now() : 0;
  const expired = channel.isExpired ?? remaining <= 0;

  return (
    <Link href={`/squad/${squadId}/chat/${channel._id}` as any} accessibilityRole="button" accessibilityLabel={`Open ${channel.name}`} style={[
      styles.card,
      {
        backgroundColor: expired ? theme.backgroundElement : theme.chatSurface,
        borderColor: theme.chatBorder,
        shadowColor: theme.shadow,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.08,
        shadowRadius: 10,
        elevation: 1,
      },
      expired && { opacity: 0.6 },
    ]}>
      <View style={styles.inner}>
        <View style={[styles.iconCircle, { backgroundColor: theme.chatWarmTint }]}>
          <ThemedText style={styles.iconEmoji}>⏳</ThemedText>
        </View>
        <View style={styles.content}>
          <View style={styles.row}>
            <ThemedText type="smallBold" style={{ color: theme.chatBubbleInText }}>{channel.name}</ThemedText>
            <View style={styles.rowRight}>
              {channel.unreadCount > 0 && (
                <View style={[styles.unreadDot, { backgroundColor: theme.chatAccent, borderColor: theme.chatAccent }]}>
                  <ThemedText type="caption" style={{ color: theme.chatOnAccent, fontWeight: Weight.bold, fontVariant: ['tabular-nums'] }}>
                    {channel.unreadCount}
                  </ThemedText>
                </View>
              )}
              <View style={[styles.timerBadge, { backgroundColor: expired ? theme.errorSoft : theme.warningSoft }]}>
                <ThemedText type="caption" style={{ color: expired ? theme.error : theme.warning, fontWeight: Weight.semibold }}>
                  {formatTimeRemaining(remaining)}
                </ThemedText>
              </View>
            </View>
          </View>
        </View>
      </View>
    </Link>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: Radius.xl,
    borderWidth: 1.25,
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
  rowRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
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
  timerBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: 8,
  },
});
