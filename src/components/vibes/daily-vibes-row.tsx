import { ThemedText } from "@/components/themed-text";
import { UserAvatar } from "@/components/user-avatar";
import { Radius, Spacing } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";
import { StyleSheet, Text, TouchableOpacity, View, ScrollView } from "react-native";

interface VibeMember {
    userId: string;
    nickname: string;
    avatarUrl?: string | null;
    vibe: string;
    vibeLabel: string | null;
    vibeUpdatedAt: number;
    isCurrentUser: boolean;
}

interface DailyVibesRowProps {
    vibes: VibeMember[];
    currentUserId?: string;
    onCurrentUserPress: () => void;
}

const VIBE_COLORS: Record<string, string> = {
    "😎": "#E0F7FA",
    "🔥": "#FBE9E7",
    "😴": "#E8EAF6",
    "😊": "#FFF9C4",
    "😔": "#ECEFF1",
    "🤔": "#F3E5F5",
    "💪": "#E8F5E9",
    "🎉": "#FCE4EC",
    "🧘": "#E0F2F1",
    "🤪": "#FFF3E0",
};

function timeAgo(timestamp: number): string {
    const diff = Date.now() - timestamp;
    const hours = Math.floor(diff / (1000 * 60 * 60));
    if (hours < 1) return "just now";
    if (hours < 24) return `${hours}h ago`;
    return "1d ago";
}

export function DailyVibesRow({ vibes, currentUserId, onCurrentUserPress }: DailyVibesRowProps) {
    const theme = useTheme();

    const currentUserVibe = vibes.find((v) => v.isCurrentUser);
    const otherVibes = vibes.filter((v) => !v.isCurrentUser);

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.headerEmoji}>⚡</Text>
                <ThemedText type="caption" style={{ letterSpacing: 1.5, color: theme.textSecondary }}>
                    DAILY VIBES
                </ThemedText>
                <Text style={styles.headerEmoji}>⚡</Text>
            </View>

            <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.scrollContent}
            >
                <TouchableOpacity
                    style={[
                        styles.tile,
                        { backgroundColor: currentUserVibe ? VIBE_COLORS[currentUserVibe.vibe] ?? theme.backgroundElement : theme.backgroundElement, borderColor: theme.outline },
                    ]}
                    onPress={onCurrentUserPress}
                    activeOpacity={0.7}
                >
                    <View style={[styles.emojiContainer, { backgroundColor: theme.surface }]}>
                        {currentUserVibe?.avatarUrl ? (
                            <UserAvatar uri={currentUserVibe.avatarUrl} size={44} fallbackText="You" vibeEmoji={currentUserVibe.vibe} />
                        ) : (
                            <Text style={styles.emojiText}>
                                {currentUserVibe?.vibe ?? "✨"}
                            </Text>
                        )}
                    </View>
                    <Text style={[styles.nickname, { color: theme.text }]}>You</Text>
                    {currentUserVibe ? (
                        currentUserVibe.vibeLabel ? (
                            <Text style={[styles.vibeLabel, { color: theme.textSecondary }]} numberOfLines={1}>
                                {currentUserVibe.vibeLabel}
                            </Text>
                        ) : (
                            <Text style={[styles.vibeLabel, { color: theme.textTertiary }]}>
                                {timeAgo(currentUserVibe.vibeUpdatedAt)}
                            </Text>
                        )
                    ) : (
                        <Text style={[styles.setTimeLabel, { color: theme.accent }]}>
                            tap to set
                        </Text>
                    )}
                </TouchableOpacity>

                {otherVibes.map((vibe) => (
                    <View
                        key={vibe.userId}
                        style={[
                            styles.tile,
                            { backgroundColor: VIBE_COLORS[vibe.vibe] ?? theme.backgroundElement, borderColor: theme.outline },
                        ]}
                    >
                        <View style={[styles.emojiContainer, { backgroundColor: theme.surface }]}>
                            {vibe.avatarUrl ? (
                                <UserAvatar uri={vibe.avatarUrl} size={44} fallbackText={vibe.nickname} vibeEmoji={vibe.vibe} />
                            ) : (
                                <Text style={styles.emojiText}>{vibe.vibe}</Text>
                            )}
                        </View>
                        <Text style={[styles.nickname, { color: theme.text }]}>{vibe.nickname}</Text>
                        <Text style={[styles.vibeLabel, { color: theme.textSecondary }]} numberOfLines={1}>
                            {vibe.vibeLabel ?? timeAgo(vibe.vibeUpdatedAt)}
                        </Text>
                    </View>
                ))}
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        gap: Spacing.sm,
    },
    header: {
        flexDirection: "row",
        alignItems: "center",
        gap: Spacing.sm,
    },
    headerEmoji: {
        fontSize: 14,
    },
    scrollContent: {
        gap: Spacing.lg,
        paddingVertical: Spacing.sm,
    },
    tile: {
        alignItems: "center",
        width: 88,
        borderRadius: Radius.lg,
        paddingVertical: Spacing.lg,
        paddingHorizontal: Spacing.sm,
        borderWidth: 2,
    },
    emojiContainer: {
        width: 56,
        height: 56,
        borderRadius: 28,
        alignItems: "center",
        justifyContent: "center",
        marginBottom: Spacing.sm,
    },
    emojiText: {
        fontSize: 30,
    },
    nickname: {
        fontSize: 12,
        fontWeight: "600",
        textAlign: "center",
    },
    vibeLabel: {
        fontSize: 10,
        textAlign: "center",
        marginTop: 2,
    },
    setTimeLabel: {
        fontSize: 10,
        fontWeight: "600",
        textAlign: "center",
        marginTop: 2,
    },
});
