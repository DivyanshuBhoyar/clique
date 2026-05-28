import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { EmptySectionCard } from "@/components/ui/empty-section-card";
import { ScreenHeader } from "@/components/ui/screen-header";
import { UserAvatar } from "@/components/user-avatar";
import { Radius, Shadows, Spacing } from "@/constants/theme";
import { api } from "@/convex/_generated/api";
import { useTheme } from "@/hooks/use-theme";
import { backOrReplace } from "@/utils/navigation";
import { useQuery } from "convex/react";
import { useRouter } from "expo-router";
import { PenSquare } from "lucide-react-native";
import { useMemo } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  View,
} from "react-native";

export default function DmInboxScreen() {
  const router = useRouter();
  const theme = useTheme();
  const conversations = useQuery(api.dm.listConversations);

  // Sort by most recent activity (server doesn't sort)
  const sorted = useMemo(() => {
    if (!conversations) return [];
    return [...conversations].sort(
      (a, b) => b.lastEnvelopeAt - a.lastEnvelopeAt
    );
  }, [conversations]);

  if (conversations === undefined) {
    return (
      <ThemedView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.accent} />
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <ScreenHeader
        title="Messages 💬"
        onBack={() => backOrReplace(router, "/")}
        rightIcon={PenSquare}
        onRightPress={() => router.push("/(auth)/dm/new")}
      />

      {sorted.length === 0 ? (
        <View style={styles.emptyContainer}>
          <EmptySectionCard
            emoji="✉️"
            title="No messages yet"
            subtitle="Start an encrypted conversation with a friend"
            onPress={() => router.push("/(auth)/dm/new")}
          />
        </View>
      ) : (
        <FlatList
          data={sorted}
          keyExtractor={(item) => item._id}
          contentContainerStyle={styles.listContent}
          contentInsetAdjustmentBehavior="automatic"
          ListHeaderComponent={
            <View style={[styles.helperCard, { backgroundColor: theme.surfaceWarm, borderColor: theme.outlineLight }]}>
              <ThemedText type="captionBold">Private DMs</ThemedText>
              <ThemedText type="caption" themeColor="textSecondary">
                Message contents stay E2E encrypted. You can use upto 5 devices.
              </ThemedText>
            </View>
          }
          renderItem={({ item }) => (
            <Pressable
              onPress={() =>
                router.push(`/(auth)/dm/${item._id}`)
              }
              accessibilityRole="button"
              accessibilityLabel={`Open conversation with ${item.otherUserName}`}
              style={({ pressed }) => [
                styles.row,
                {
                  backgroundColor: theme.surface,
                  borderColor: theme.outline,
                },
                pressed && {
                  transform: [{ translateX: 1 }, { translateY: 1 }],
                  shadowOffset: { width: 1, height: 1 },
                },
              ]}
            >
              <UserAvatar
                uri={item.otherUserAvatar}
                fallbackText={item.otherUserName}
                size={44}
              />
              <View style={styles.rowText}>
                <ThemedText type="bodyBold" numberOfLines={1}>
                  {item.otherUserName}
                </ThemedText>
                <ThemedText type="caption" themeColor="textSecondary">
                  {formatRelativeTime(item.lastEnvelopeAt)}
                </ThemedText>
              </View>
              {/* Lock icon indicates E2EE */}
              <ThemedText type="caption" themeColor="textTertiary">
                🔒
              </ThemedText>
            </Pressable>
          )}
        />
      )}
    </ThemedView>
  );
}

/**
 * Formats a timestamp into a human-readable relative time.
 * Keeps the inbox lightweight without pulling in a date library.
 */
function formatRelativeTime(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp;
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (seconds < 60) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  return new Date(timestamp).toLocaleDateString();
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    padding: Spacing.xl,
  },
  listContent: {
    padding: Spacing.lg,
    gap: Spacing.sm,
  },
  helperCard: {
    padding: Spacing.md,
    borderRadius: Radius.lg,
    borderWidth: 1.5,
    gap: Spacing.xs,
    marginBottom: Spacing.xs,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.md,
    borderRadius: Radius.lg,
    borderWidth: 2,
    ...Shadows.sm,
    gap: Spacing.md,
  },
  rowText: {
    flex: 1,
    gap: 2,
  },
});
