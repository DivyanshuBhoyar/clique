import { ThemedText } from "@/components/themed-text";
import { Radius, Spacing } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";
import { ChevronDown } from "lucide-react-native";
import { Pressable, StyleSheet } from "react-native";

interface DmScrollPillProps {
    visible: boolean;
    onPress: () => void;
}

export function DmScrollPill({ visible, onPress }: DmScrollPillProps) {
    const theme = useTheme();

    if (!visible) return null;

    return (
        <Pressable
            onPress={onPress}
            style={[styles.pill, { backgroundColor: theme.accent, borderColor: theme.outline }]}
        >
            <ChevronDown size={14} color={theme.text} strokeWidth={2.5} />
            <ThemedText type="caption" style={{ color: theme.text }}>
                New messages
            </ThemedText>
        </Pressable>
    );
}

const styles = StyleSheet.create({
    pill: {
        position: "absolute",
        bottom: 80,
        alignSelf: "center",
        flexDirection: "row",
        alignItems: "center",
        gap: 4,
        paddingHorizontal: Spacing.md,
        paddingVertical: Spacing.xs,
        borderRadius: Radius.full,
        borderWidth: 2,
        elevation: 4,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15,
        shadowRadius: 4,
    },
});
