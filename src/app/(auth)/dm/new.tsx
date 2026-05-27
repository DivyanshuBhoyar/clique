import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { LoadingState } from "@/components/ui/loading-state";
import { ScreenHeader } from "@/components/ui/screen-header";
import { UserAvatar } from "@/components/user-avatar";
import { Radius, Shadows, Spacing } from "@/constants/theme";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { useTheme } from "@/hooks/use-theme";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQuery } from "convex/react";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Search } from "lucide-react-native";
import { useEffect, useMemo, useState } from "react";
import {
    FlatList,
    Pressable,
    StyleSheet,
    TextInput,
    View,
} from "react-native";

export default function NewDmScreen() {
    const router = useRouter();
    const theme = useTheme();
    const toast = useToast();
    const { userId: preselectedUserId } = useLocalSearchParams<{ userId?: string }>();

    const users = useQuery(api.dm.getDmableUsers);
    const getOrCreate = useMutation(api.dm.getOrCreateConversation);
    const [search, setSearch] = useState("");
    const [creating, setCreating] = useState(false);

    // If navigated with a pre-selected user (e.g. from member profile), auto-start
    useEffect(() => {
        if (preselectedUserId && users && !creating) {
            const target = users.find((u) => u.userId === preselectedUserId);
            if (target) {
                handleSelect(preselectedUserId as Id<"users">);
            }
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [preselectedUserId, users]);

    const filtered = useMemo(() => {
        if (!users) return [];
        if (!search.trim()) return users;
        const q = search.toLowerCase();
        return users.filter(
            (u) =>
                u.name.toLowerCase().includes(q) ||
                u.squadNames.some((s) => s.toLowerCase().includes(q)),
        );
    }, [users, search]);

    async function handleSelect(otherUserId: Id<"users">) {
        if (creating) return;
        setCreating(true);
        try {
            const convId = await getOrCreate({ otherUserId });
            router.replace(`/(auth)/dm/${convId}`);
        } catch (e: any) {
            toast.show(e.message ?? "Failed to start conversation", "error");
            setCreating(false);
        }
    }

    if (users === undefined) {
        return <LoadingState message="Finding your friends…" />;
    }

    return (
        <ThemedView style={styles.container}>
            <ScreenHeader title="New Message 🔒" onBack={() => router.back()} />

            {/* Search bar */}
            <View
                style={[
                    styles.searchContainer,
                    { backgroundColor: theme.surface, borderColor: theme.outline },
                ]}
            >
                <Search size={16} color={theme.textTertiary} />
                <TextInput
                    value={search}
                    onChangeText={setSearch}
                    placeholder="Search by name or squad…"
                    placeholderTextColor={theme.placeholder}
                    style={[styles.searchInput, { color: theme.text }]}
                    autoCapitalize="none"
                    autoCorrect={false}
                    accessibilityLabel="Search users"
                />
            </View>

            <FlatList
                data={filtered}
                keyExtractor={(item) => item.userId}
                contentContainerStyle={styles.listContent}
                contentInsetAdjustmentBehavior="automatic"
                ListHeaderComponent={
                    <View style={[styles.helperCard, { backgroundColor: theme.surfaceWarm, borderColor: theme.outlineLight }]}>
                        <ThemedText type="captionBold">Choose a friend</ThemedText>
                        <ThemedText type="caption" themeColor="textSecondary">
                            You can start a DM with squad mates you already share a space with.
                        </ThemedText>
                    </View>
                }
                ListEmptyComponent={
                    <View style={styles.emptyWrap}>
                        <ThemedText type="default" themeColor="textSecondary" style={styles.emptyText}>
                            {search ? "No matching users" : "No squad mates found"}
                        </ThemedText>
                    </View>
                }
                renderItem={({ item }) => (
                    <Pressable
                        onPress={() => handleSelect(item.userId)}
                        disabled={creating}
                        accessibilityRole="button"
                        accessibilityLabel={`Start conversation with ${item.name}`}
                        style={({ pressed }) => [
                            styles.row,
                            {
                                backgroundColor: theme.surface,
                                borderColor: theme.outline,
                                opacity: creating ? 0.5 : 1,
                            },
                            pressed && styles.rowPressed,
                        ]}
                    >
                        <UserAvatar uri={item.avatarUrl} fallbackText={item.name} size={44} />
                        <View style={styles.rowText}>
                            <ThemedText type="bodyBold" numberOfLines={1}>
                                {item.name}
                            </ThemedText>
                            <ThemedText type="caption" themeColor="textTertiary" numberOfLines={1}>
                                {item.squadNames.join(", ")}
                            </ThemedText>
                        </View>
                    </Pressable>
                )}
            />
        </ThemedView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    searchContainer: {
        flexDirection: "row",
        alignItems: "center",
        marginHorizontal: Spacing.lg,
        marginVertical: Spacing.sm,
        paddingHorizontal: Spacing.md,
        paddingVertical: Spacing.sm,
        borderWidth: 2,
        borderRadius: Radius.md,
        gap: Spacing.sm,
    },
    searchInput: { flex: 1, fontSize: 14, paddingVertical: 4 },
    listContent: { padding: Spacing.lg, gap: Spacing.sm },
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
    rowPressed: {
        transform: [{ translateX: 1 }, { translateY: 1 }],
        shadowOffset: { width: 1, height: 1 },
    },
    rowText: { flex: 1, gap: 2 },
    emptyWrap: { padding: Spacing.xl, alignItems: "center" },
    emptyText: { textAlign: "center" },
});
