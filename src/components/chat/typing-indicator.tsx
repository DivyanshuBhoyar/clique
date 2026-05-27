/**
 * TypingIndicator — shows which squadmates are typing.
 *
 * Renders as a small bubble on the left side of the chat (like an incoming message).
 * Uses animated dots to signal live activity.
 *
 * Example: "maya is typing…" | "maya and leo are typing…"
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

interface TypingUser {
  userId: string;
  nickname: string;
  lastTypingAt?: number;
}

interface TypingIndicatorProps {
  typingUsers: TypingUser[];
  currentUserId?: string;
}

const TYPING_TIMEOUT = 4000;

export function TypingIndicator({ typingUsers, currentUserId }: TypingIndicatorProps) {
  const theme = useTheme();
  const [visibleUntilByUser, setVisibleUntilByUser] = useState<Record<string, {
    nickname: string;
    lastTypingAt: number;
    visibleUntil: number;
  }>>({});
  const seenTypingVersionRef = useRef<Record<string, number>>({});
  const dot1 = useRef(new Animated.Value(0)).current;
  const dot2 = useRef(new Animated.Value(0)).current;
  const dot3 = useRef(new Animated.Value(0)).current;

  const others = useMemo(
    () => typingUsers.filter((u) => u.userId !== currentUserId),
    [currentUserId, typingUsers],
  );

  useEffect(() => {
    const now = Date.now();
    const activeUserIds = new Set(others.map((user) => user.userId));

    setVisibleUntilByUser((current) => {
      let changed = false;
      const next = { ...current };

      for (const user of others) {
        const lastTypingAt = user.lastTypingAt ?? 0;
        const existing = next[user.userId];
        const seenVersion = seenTypingVersionRef.current[user.userId];

        if (seenVersion !== lastTypingAt) {
          seenTypingVersionRef.current[user.userId] = lastTypingAt;
          next[user.userId] = {
            nickname: user.nickname,
            lastTypingAt,
            visibleUntil: now + TYPING_TIMEOUT,
          };
          changed = true;
        } else if (existing && existing.nickname !== user.nickname) {
          next[user.userId] = { ...existing, nickname: user.nickname };
          changed = true;
        }
      }

      for (const userId of Object.keys(next)) {
        if (!activeUserIds.has(userId)) {
          delete next[userId];
          delete seenTypingVersionRef.current[userId];
          changed = true;
        }
      }

      return changed ? next : current;
    });
  }, [others]);

  useEffect(() => {
    const clearExpired = () => {
      const now = Date.now();
      setVisibleUntilByUser((current) => {
        let changed = false;
        const next = { ...current };
        for (const [userId, entry] of Object.entries(next)) {
          if (entry.visibleUntil <= now) {
            delete next[userId];
            changed = true;
          }
        }
        return changed ? next : current;
      });
    };

    const nextExpiry = Math.min(
      ...Object.values(visibleUntilByUser).map((entry) => entry.visibleUntil),
    );
    if (!Number.isFinite(nextExpiry)) return;

    const timer = setTimeout(clearExpired, Math.max(0, nextExpiry - Date.now() + 50));
    return () => clearTimeout(timer);
  }, [visibleUntilByUser]);

  const visibleUsers = Object.values(visibleUntilByUser).filter(
    (entry) => entry.visibleUntil > Date.now(),
  );

  // Animate dots in sequence
  useEffect(() => {
    if (visibleUsers.length === 0) return;
    const anim = Animated.loop(
      Animated.stagger(200, [
        Animated.sequence([
          Animated.timing(dot1, { toValue: 1, duration: 300, useNativeDriver: true }),
          Animated.timing(dot1, { toValue: 0, duration: 300, useNativeDriver: true }),
        ]),
        Animated.sequence([
          Animated.timing(dot2, { toValue: 1, duration: 300, useNativeDriver: true }),
          Animated.timing(dot2, { toValue: 0, duration: 300, useNativeDriver: true }),
        ]),
        Animated.sequence([
          Animated.timing(dot3, { toValue: 1, duration: 300, useNativeDriver: true }),
          Animated.timing(dot3, { toValue: 0, duration: 300, useNativeDriver: true }),
        ]),
      ])
    );
    anim.start();
    return () => anim.stop();
  }, [visibleUsers.length, dot1, dot2, dot3]);

  if (visibleUsers.length === 0) return null;

  const label = formatTypingText(visibleUsers);

  return (
    <View style={[styles.container, { paddingHorizontal: Spacing.md }]}>
      <View style={[styles.bubble, { backgroundColor: theme.surface, borderColor: theme.outline }]}>
        <ThemedText type="caption" style={{ color: theme.textSecondary }}>
          {label}
        </ThemedText>
        <View style={styles.dots}>
          {[dot1, dot2, dot3].map((dot, i) => (
            <Animated.View
              key={i}
              style={[
                styles.dot,
                {
                  backgroundColor: theme.textSecondary,
                  transform: [{ translateY: dot.interpolate({ inputRange: [0, 1], outputRange: [0, -4] }) }],
                },
              ]}
            />
          ))}
        </View>
      </View>
    </View>
  );
}

function formatTypingText(users: { nickname: string }[]): string {
  const names = users.map((u) => u.nickname);
  if (names.length === 1) return `${names[0]} is typing`;
  if (names.length === 2) return `${names[0]} & ${names[1]} are typing`;
  return `${names[0]} + ${names.length - 1} are typing`;
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: Spacing.xs,
  },
  bubble: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: Spacing.xs,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs + 2,
    borderRadius: Radius.lg,
    borderWidth: 1.5,
  },
  dots: {
    flexDirection: 'row',
    gap: 3,
    alignItems: 'center',
  },
  dot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
  },
});
