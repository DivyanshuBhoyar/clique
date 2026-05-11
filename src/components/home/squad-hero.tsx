import { ThemedText } from '@/components/themed-text';
import { UserAvatar } from '@/components/user-avatar';
import { Radius, Spacing, Typography, Weight } from '@/constants/theme';
import { Id } from '@/convex/_generated/dataModel';
import { useTheme } from '@/hooks/use-theme';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

interface SquadHeroProps {
  squadName: string;
  memberCount: number;
  squadMembers: { userId: string; avatarUrl?: string | null; nickname: string }[] | undefined;
  userSquads: { squad: { _id: string; name: string } | null }[];
  activeSquadIndex: number;
  onSwitchSquad: (index: string) => void;
}

export function SquadHero({
  squadName,
  memberCount,
  squadMembers,
  userSquads,
  activeSquadIndex,
  onSwitchSquad,
}: SquadHeroProps) {
  const theme = useTheme();

  return (
    <View style={styles.hero}>
      <View style={[styles.avatar, { backgroundColor: theme.accent, borderColor: theme.outline }]}>
        <ThemedText style={{ fontSize: Typography.display }}>🏠</ThemedText>
      </View>
      <ThemedText type="title" style={{ textAlign: 'center' }}>
        {squadName}
      </ThemedText>
      <ThemedText type="small" themeColor="textSecondary">
        your cozy little corner · {memberCount} {memberCount === 1 ? 'member' : 'members'}
      </ThemedText>

      {squadMembers && squadMembers.length > 0 && (
        <View style={styles.avatarStack}>
          {squadMembers.slice(0, 4).map((m, i) => (
            <View key={m.userId} style={[styles.avatarStackItem, { left: i * 20, zIndex: 10 - i }]}>
              <UserAvatar uri={m.avatarUrl} size={30} fallbackText={m.nickname} />
            </View>
          ))}
          {memberCount > 4 && (
            <View style={[
              styles.avatarStackItem,
              styles.avatarMore,
              { left: 4 * 20, backgroundColor: theme.surface, borderColor: theme.outline },
            ]}>
              <ThemedText type="caption" style={{ fontWeight: Weight.bold, fontSize: Typography.caption }}>
                +{memberCount - 4}
              </ThemedText>
            </View>
          )}
        </View>
      )}

      <View style={styles.badgeRow}>
        <View style={[styles.badge, { backgroundColor: theme.accent, borderColor: theme.outline }]}>
          <ThemedText type="caption" style={{ fontWeight: Weight.bold, color: theme.text }}>
            cozy mode
          </ThemedText>
        </View>
        <View style={[styles.badge, { backgroundColor: theme.surface, borderColor: theme.outline }]}>
          <View style={[styles.onlineDot, { backgroundColor: '#4CAF50' }]} />
          <ThemedText type="caption" style={{ fontWeight: Weight.bold, color: theme.text }}>
            {memberCount} online
          </ThemedText>
        </View>
      </View>

      {userSquads.length > 1 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.squadChipsRow}>
          {userSquads.map((entry, idx) => {
            if (!entry.squad) return null;
            const active = idx === activeSquadIndex;
            return (
              <Pressable
                key={entry.squad._id}
                style={[
                  styles.squadChip,
                  {
                    backgroundColor: active ? theme.accent : theme.surface,
                    borderColor: theme.outline,
                  },
                ]}
                onPress={() => onSwitchSquad(entry.squad!._id)}
              >
                <ThemedText type="caption" style={{ color: theme.text, fontWeight: active ? Weight.bold : Weight.regular }}>
                  {entry.squad.name}
                </ThemedText>
              </Pressable>
            );
          })}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  hero: {
    alignItems: 'center',
    paddingTop: Spacing.xl,
    paddingHorizontal: Spacing.lg,
    gap: Spacing.sm,
  },
  avatar: {
    width: 88,
    height: 88,
    borderRadius: Radius.xl,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.xs,
  },
  avatarStack: {
    flexDirection: 'row',
    height: 34,
    width: 120,
    position: 'relative',
    alignSelf: 'center',
    marginTop: Spacing.xs,
  },
  avatarStackItem: {
    position: 'absolute',
    borderRadius: Radius.full,
    overflow: 'hidden',
  },
  avatarMore: {
    width: 30,
    height: 30,
    borderRadius: Radius.full,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginTop: Spacing.xs,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderWidth: 1.5,
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.md,
    paddingVertical: 4,
  },
  onlineDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  squadChipsRow: {
    marginTop: Spacing.xs,
  },
  squadChip: {
    borderWidth: 1.5,
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.md,
    paddingVertical: 4,
    marginRight: Spacing.sm,
  },
});
