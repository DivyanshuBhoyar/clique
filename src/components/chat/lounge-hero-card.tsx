import { Link } from 'expo-router';
import { ArrowRight, MessageCircleHeart, Sparkles } from 'lucide-react-native';
import { StyleSheet, useWindowDimensions, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { UserAvatar } from '@/components/user-avatar';
import { BorderWidth, Radius, Shadows, Spacing, Typography, Weight } from '@/constants/theme';
import { Id } from '@/convex/_generated/dataModel';
import { useTheme } from '@/hooks/use-theme';

type LoungeMessagePreview = {
  nickname: string;
  content: string;
};

// Playful pill colors for message previews (pink, cyan, lavender, mint)
const PILL_COLORS = ['#FFD0DC', '#C8F0FF', '#E8E4FF', '#D4F5E0'];

type LoungeMemberPreview = {
  userId: string;
  avatarUrl?: string | null;
  nickname: string;
  isOnline?: boolean;
  vibe?: string | null;
};

type LoungeChannel = {
  _id: string;
  name: string;
  unreadCount: number;
  recentMessages?: LoungeMessagePreview[];
};

interface LoungeHeroCardProps {
  channel: LoungeChannel;
  squadId: Id<'squads'>;
  members?: LoungeMemberPreview[];
}

const FALLBACK_MESSAGE: LoungeMessagePreview = {
  nickname: 'Lounge',
  content: 'Say hi when you jump in 👋',
};

export function LoungeHeroCard({ channel, squadId, members = [] }: LoungeHeroCardProps) {
  const theme = useTheme();
  const { width } = useWindowDimensions();
  const isWide = width >= 560;
  const onlineCount = members.filter((member) => member.isOnline).length;
  const visibleMembers = members.slice(0, 3);
  const extraCount = Math.max(members.length - visibleMembers.length, 0);
  const previewMessages = (channel.recentMessages?.length ? channel.recentMessages : [FALLBACK_MESSAGE]).slice(-2);
  const memberLabel = members.length === 1 ? 'member' : 'people';
  const presenceLabel = members.length === 0
    ? 'friends online'
    : `${(onlineCount || members.length).toLocaleString()} ${onlineCount ? 'online' : memberLabel}`;

  const peopleCluster = (
    <View style={styles.peopleCluster}>
      {visibleMembers.length > 0 ? (
        <View style={styles.avatarStack}>
          {visibleMembers.map((member, index) => (
            <View
              key={member.userId}
              style={[
                styles.avatarWrap,
                {
                  left: index * 19,
                  zIndex: 10 - index,
                  borderColor: theme.surface,
                },
              ]}
            >
              <UserAvatar uri={member.avatarUrl} size={34} fallbackText={member.nickname} vibeEmoji={member.vibe ?? undefined} />
            </View>
          ))}
          {extraCount > 0 ? (
            <View
              style={[
                styles.avatarMore,
                {
                  left: visibleMembers.length * 19,
                  backgroundColor: theme.surfaceAccent,
                  borderColor: theme.surface,
                },
              ]}
            >
              <ThemedText type="captionBold" style={{ color: theme.textSecondary }}>
                +{extraCount}
              </ThemedText>
            </View>
          ) : null}
        </View>
      ) : null}

      <View style={styles.onlineRow}>
        <View style={[styles.onlineDot, { backgroundColor: theme.success }]} />
        <ThemedText type="caption" style={{ color: theme.textSecondary }}>
          {presenceLabel}
        </ThemedText>
      </View>
    </View>
  );

  const messagePreview = (
    <View style={[styles.messageStack, isWide ? styles.messageStackWide : styles.messageStackNarrow]}>
      {previewMessages.map((message, index) => (
        <View
          key={`${message.nickname}-${message.content}-${index}`}
          style={[
            styles.messagePill,
            isWide && index === 1 && styles.messagePillLower,
            {
              backgroundColor: PILL_COLORS[index % PILL_COLORS.length],
            },
          ]}
        >
          <UserAvatar uri={null} size={24} fallbackText={message.nickname} />
          <ThemedText type="caption" numberOfLines={1} style={{ color: theme.text }}>
            {message.content}
          </ThemedText>
        </View>
      ))}
    </View>
  );

  const cta = (
    <View style={[styles.cta, { backgroundColor: theme.featureAccent }]}>
      <ThemedText type="smallBold" style={{ color: '#FFFFFF' }}>
        Open Lounge
      </ThemedText>
      <ArrowRight size={16} color="#FFFFFF" strokeWidth={2.6} />
    </View>
  );

  return (
    <Link
      href={`/squad/${squadId}/chat/${channel._id}` as any}
      accessibilityRole="button"
      accessibilityLabel={`Open Lounge channel${channel.unreadCount > 0 ? `, ${channel.unreadCount} unread` : ''}`}
      style={[
        styles.card,
        {
          backgroundColor: '#FFDB63',
          borderColor: 'rgba(210, 170, 50, 0.4)',
          shadowColor: theme.shadow,
        },
      ]}
    >
      <View style={styles.inner}>
        <Sparkles size={18} color={theme.surface} style={styles.sparkleIcon} strokeWidth={2.4} />

        {isWide ? (
          <View style={styles.wideRow}>
            <View style={styles.wideLeft}>
              <View style={styles.headerRow}>
                <View style={[styles.iconTile, { backgroundColor: theme.surface }]}> 
                  <MessageCircleHeart size={30} color={theme.text} strokeWidth={2.5} />
                </View>

                <View style={styles.copyColumn}>
                  <View style={styles.nameRow}>
                    <ThemedText style={styles.title}>Lounge</ThemedText>
                    <View style={[styles.pill, { backgroundColor: theme.surface, borderColor: 'rgba(0,0,0,0.06)' }]}> 
                      <ThemedText type="captionBold" style={{ color: theme.featureAccent }}>
                        Main Chat
                      </ThemedText>
                    </View>
                  </View>
                  <ThemedText style={styles.description} numberOfLines={1}>
                    The place for everything, everyone
                  </ThemedText>
                  <ThemedText style={styles.description} numberOfLines={1}>
                    Hop in, say hi, and vibe.
                  </ThemedText>
                </View>
              </View>

              {peopleCluster}
            </View>

            <View style={styles.wideRight}>
              {messagePreview}
              <View style={styles.wideActionRow}>
                {channel.unreadCount > 0 ? (
                  <View style={[styles.unreadBadge, { backgroundColor: theme.surface }]}> 
                    <ThemedText type="captionBold" style={{ color: theme.featureAccent, fontVariant: ['tabular-nums'] }}>
                      {channel.unreadCount} new
                    </ThemedText>
                  </View>
                ) : null}
                {cta}
              </View>
            </View>
          </View>
        ) : (
          <>
            <View style={styles.headerRow}>
              <View style={[styles.iconTile, { backgroundColor: theme.surface }]}> 
                <MessageCircleHeart size={36} color={theme.text} strokeWidth={2} />
              </View>

              <View style={styles.copyColumn}>
                <View style={styles.nameRow}>
                  <ThemedText style={styles.title}>Lounge</ThemedText>
                  <View style={[styles.pill, { backgroundColor: theme.surfaceAccent, borderColor: 'rgba(45,45,45,0.14)' }]}> 
                    <ThemedText type="captionBold" style={{ color: theme.featureAccent }}>
                      Main Chat
                    </ThemedText>
                  </View>
                </View>
                <ThemedText style={styles.description} numberOfLines={2}>
                  The place for everything, everyone. Hop in, say hi, and vibe.
                </ThemedText>
              </View>
            </View>

            <View style={styles.mobileMetaRow}>
              {peopleCluster}
              {messagePreview}
            </View>

            <View style={styles.mobileFooterRow}>
              {channel.unreadCount > 0 ? (
                <View style={[styles.unreadBadge, { backgroundColor: theme.surface }]}> 
                  <ThemedText type="captionBold" style={{ color: '#7357E8', fontVariant: ['tabular-nums'] }}>
                    {channel.unreadCount} new
                  </ThemedText>
                </View>
              ) : (
                <View />
              )}
              {cta}
            </View>
          </>
        )}
      </View>
    </Link>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: BorderWidth.thin,
    borderRadius: Radius.xxl,
    marginBottom: Spacing.xl,
    overflow: 'hidden',
    shadowOffset: Shadows.md.offset,
    shadowOpacity: Shadows.md.opacity,
    shadowRadius: Shadows.md.radius,
    elevation: 3,
  },
  inner: {
    overflow: 'hidden',
    padding: Spacing.lg,
  },
  wideRow: {
    minHeight: 126,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.xl,
  },
  wideLeft: {
    flex: 1,
    minWidth: 0,
    gap: Spacing.lg,
  },
  wideRight: {
    width: 300,
    alignItems: 'flex-end',
    justifyContent: 'center',
    gap: Spacing.md,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  iconTile: {
    width: 58,
    height: 58,
    borderRadius: Radius.xl,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: undefined,
    shadowOffset: Shadows.sm.offset,
    shadowOpacity: Shadows.sm.opacity,
    shadowRadius: Shadows.sm.radius,
    elevation: 2,
  },
  copyColumn: {
    flex: 1,
    gap: 2,
    minWidth: 0,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  title: {
    color: '#1A1A1A',
    marginBottom: 4,
    fontSize: 32,
    lineHeight: 36,
    fontWeight: Weight.black,
  },
  pill: {
    borderWidth: 1,
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
  },
  description: {
    color: '#2D2D2D',
    fontSize: Typography.small,
    lineHeight: 19,
  },
  peopleCluster: {
    gap: Spacing.xs,
    minWidth: 116,
  },
  avatarStack: {
    height: 42,
    minWidth: 92,
    position: 'relative',
  },
  avatarWrap: {
    position: 'absolute',
    borderWidth: BorderWidth.medium,
    borderRadius: Radius.full,
  },
  avatarMore: {
    position: 'absolute',
    width: 34,
    height: 34,
    borderRadius: Radius.full,
    borderWidth: BorderWidth.medium,
    alignItems: 'center',
    justifyContent: 'center',
  },
  onlineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  onlineDot: {
    width: 9,
    height: 9,
    borderRadius: 5,
  },
  messageStack: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'flex-end',
    gap: Spacing.xs,
  },
  messageStackWide: {
    width: '100%',
  },
  messageStackNarrow: {
    flexDirection: 'column',
    alignItems: 'flex-end',
    justifyContent: 'flex-start',
    gap: Spacing.xs,
    flexShrink: 1,
  },
  messagePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    maxWidth: 142,
    minHeight: 36,
    borderRadius: Radius.lg,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
  },
  messagePillLower: {
    marginTop: Spacing.lg,
  },
  wideActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: Spacing.sm,
  },
  mobileMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.md,
    marginTop: Spacing.md,
  },
  mobileFooterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.md,
    marginTop: Spacing.md,
  },
  unreadBadge: {
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.md,
    paddingVertical: 4,
  },
  cta: {
    minHeight: 42,
    minWidth: 96,
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    shadowColor: undefined,
    shadowOffset: Shadows.sm.offset,
    shadowOpacity: Shadows.sm.opacity,
    shadowRadius: Shadows.sm.radius,
    elevation: 3,
  },
  sparkleIcon: {
    position: 'absolute',
    right: 18,
    top: 16,
    opacity: 0.72,
  },
});
