import { Link } from 'expo-router';
import { ArrowRight, MessageCircleHeart, Sparkles } from 'lucide-react-native';
import { StyleSheet, useWindowDimensions, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { UserAvatar } from '@/components/user-avatar';
import { Radius, Spacing, Typography, Weight } from '@/constants/theme';
import { Id } from '@/convex/_generated/dataModel';
import { useTheme } from '@/hooks/use-theme';

type LoungeMessagePreview = {
  nickname: string;
  content: string;
};

type LoungeMemberPreview = {
  userId: string;
  avatarUrl?: string | null;
  nickname: string;
  isOnline?: boolean;
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
              <UserAvatar uri={member.avatarUrl} size={34} fallbackText={member.nickname} />
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
    <View style={[styles.messageStack, isWide && styles.messageStackWide]}>
      {previewMessages.map((message, index) => (
        <View
          key={`${message.nickname}-${message.content}-${index}`}
          style={[
            styles.messagePill,
            index === 1 && styles.messagePillLower,
            {
              backgroundColor: index % 2 === 0
                ? 'rgba(255, 255, 255, 0.54)'
                : 'rgba(255, 241, 184, 0.76)',
            },
          ]}
        >
          <UserAvatar uri={null} size={24} fallbackText={message.nickname} />
          <ThemedText type="caption" numberOfLines={1} style={{ color: theme.textSecondary }}>
            {message.content}
          </ThemedText>
        </View>
      ))}
    </View>
  );

  const cta = (
    <View style={[styles.cta, { backgroundColor: '#7357E8' }]}> 
      <ThemedText type="smallBold" style={{ color: theme.surface }}>
        Open
      </ThemedText>
      <ArrowRight size={18} color={theme.surface} strokeWidth={2.6} />
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
          borderColor: 'rgba(224, 176, 53, 0.7)',
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
                    <View style={[styles.pill, { backgroundColor: theme.surfaceAccent, borderColor: 'rgba(45,45,45,0.14)' }]}> 
                      <ThemedText type="captionBold" style={{ color: '#7357E8' }}>
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
                    <ThemedText type="captionBold" style={{ color: '#7357E8', fontVariant: ['tabular-nums'] }}>
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
                    <ThemedText type="captionBold" style={{ color: '#7357E8' }}>
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
    borderWidth: 1.25,
    borderRadius: Radius.xxl,
    marginBottom: Spacing.xl,
    overflow: 'hidden',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.1,
    shadowRadius: 14,
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
    shadowColor: '#8C6D13',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
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
    color: '#111827',
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
    color: '#1F2937',
    fontSize: Typography.small,
    lineHeight: 19,
  },
  peopleCluster: {
    gap: Spacing.xs,
    minWidth: 116,
  },
  avatarStack: {
    height: 36,
    minWidth: 92,
    position: 'relative',
  },
  avatarWrap: {
    position: 'absolute',
    borderWidth: 2,
    borderRadius: Radius.full,
    overflow: 'hidden',
  },
  avatarMore: {
    position: 'absolute',
    width: 34,
    height: 34,
    borderRadius: Radius.full,
    borderWidth: 2,
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
    shadowColor: '#4F35BA',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.22,
    shadowRadius: 10,
    elevation: 3,
  },
  sparkleIcon: {
    position: 'absolute',
    right: 18,
    top: 16,
    opacity: 0.72,
  },
});
