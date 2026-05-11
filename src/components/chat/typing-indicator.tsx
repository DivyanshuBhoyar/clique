/**
 * TypingIndicator — shows which squadmates are typing.
 *
 * Renders as a small bubble on the left side of the chat (like an incoming message).
 * Uses animated dots to signal live activity.
 *
 * Example: "maya is typing…" | "maya and leo are typing…"
 */
import { useEffect, useRef, useState } from 'react';
import { Animated, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { useTheme } from '@/hooks/use-theme';
import { Radius, Spacing } from '@/constants/theme';

interface TypingUser {
  userId: string;
  nickname: string;
}

interface TypingIndicatorProps {
  typingUsers: TypingUser[];
  currentUserId?: string;
}

const TYPING_TIMEOUT = 4000;

export function TypingIndicator({ typingUsers, currentUserId }: TypingIndicatorProps) {
  const theme = useTheme();
  const [visible, setVisible] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dot1 = useRef(new Animated.Value(0)).current;
  const dot2 = useRef(new Animated.Value(0)).current;
  const dot3 = useRef(new Animated.Value(0)).current;

  const others = typingUsers.filter((u) => u.userId !== currentUserId);

  useEffect(() => {
    if (others.length > 0) {
      setVisible(true);
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => setVisible(false), TYPING_TIMEOUT);
    }
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [others.length, typingUsers]);

  // Animate dots in sequence
  useEffect(() => {
    if (!visible) return;
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
  }, [visible, dot1, dot2, dot3]);

  if (!visible || others.length === 0) return null;

  const label = formatTypingText(others);

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
