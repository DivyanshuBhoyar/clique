import { ThemedText } from '@/components/themed-text';
import { UserAvatar } from '@/components/user-avatar';
import { Radius, Shadows, Spacing, Typography, Weight } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface YourVibeCardProps {
  userName?: string;
  avatarUrl?: string | null;
  vibe?: string;
  vibeLabel?: string;
  onEdit: () => void;
}

export function YourVibeCard({ userName, avatarUrl, vibe, vibeLabel, onEdit }: YourVibeCardProps) {
  const theme = useTheme();

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: theme.accent,
          borderColor: theme.outline,
          shadowColor: theme.shadow,
        },
      ]}
    >
      <View style={styles.topRow}>
        <View style={[styles.pill, { backgroundColor: theme.text }]}>
          <ThemedText style={[styles.pillText, { color: theme.accent }]}>
            YOUR VIBE
          </ThemedText>
        </View>
        <View style={styles.onlineRow}>
          <View style={[styles.onlineDot, { backgroundColor: theme.success }]} />
          <ThemedText type="small" style={styles.onlineLabel}>online</ThemedText>
        </View>
      </View>

      <View style={styles.body}>
        <UserAvatar
          uri={avatarUrl ?? null}
          size={64}
          fallbackText={userName ?? 'You'}
          vibeEmoji={vibe}
        />
        <View style={styles.info}>
          <ThemedText type="bodyBold">
            {userName ?? 'you'}{' '}
            <ThemedText style={styles.regularText}>· you</ThemedText>
          </ThemedText>
          {vibeLabel ? (
            <ThemedText type="small" style={styles.infoLabel}>
              {vibeLabel}
            </ThemedText>
          ) : (
            <ThemedText type="small" style={styles.infoLabelMuted}>
              no vibe set yet
            </ThemedText>
          )}
          {vibe ? (
            <Text style={styles.vibeEmoji}>{vibe}</Text>
          ) : null}
        </View>
      </View>

      <TouchableOpacity
        style={[styles.editBtn, { backgroundColor: theme.surface, borderColor: theme.outline }]}
        onPress={onEdit}
        activeOpacity={0.75}
      >
        <Text style={styles.editBtnIcon}>✏️</Text>
        <ThemedText type="bodyBold">Edit Vibe</ThemedText>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 2,
    borderRadius: Radius.xxl,
    padding: Spacing.lg,
    gap: Spacing.lg,
    shadowOffset: Shadows.md.shadowOffset,
    shadowOpacity: Shadows.md.shadowOpacity,
    shadowRadius: Shadows.md.shadowRadius,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  pill: {
    paddingHorizontal: Spacing.md,
    paddingVertical: 4,
    borderRadius: Radius.full,
  },
  pillText: {
    fontSize: Typography.caption,
    fontWeight: Weight.extrabold,
    letterSpacing: 0.8,
  },
  onlineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  onlineDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  onlineLabel: {
    fontWeight: Weight.semibold,
  },
  body: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.lg,
  },
  info: {
    flex: 1,
    gap: 2,
  },
  regularText: {
    fontWeight: Weight.regular,
  },
  infoLabel: {
    marginTop: 2,
  },
  infoLabelMuted: {
    marginTop: 2,
    opacity: 0.7,
  },
  vibeEmoji: {
    fontSize: Typography.subtitle,
    marginTop: Spacing.xs,
  },
  editBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    borderWidth: 2,
    borderRadius: Radius.full,
    paddingVertical: Spacing.md,
  },
  editBtnIcon: {
    fontSize: Typography.small,
  },
});
