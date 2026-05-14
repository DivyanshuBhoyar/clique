import { ThemedText } from "@/components/themed-text";
import { EmojiPickerModal } from "@/components/ui/emoji-picker-modal";
import { UserAvatar } from "@/components/user-avatar";
import { Radius, Spacing, Typography, Weight } from "@/constants/theme";
import { VIBE_PRESETS } from "@/constants/vibes";
import { api } from "@/convex/_generated/api";
import { useImageUpload } from "@/hooks/use-image-upload";
import { useTheme } from "@/hooks/use-theme";
import { useMutation } from "convex/react";
import { useState } from "react";
import {
    Alert,
    Modal,
    Pressable,
    StyleSheet,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";

interface VibePickerProps {
    visible: boolean;
    onClose: () => void;
    onSelect: (emoji: string, label?: string) => void;
    onClear: () => void;
    currentAvatarUrl?: string | null;
}

export function VibePicker({ visible, onClose, onSelect, onClear, currentAvatarUrl }: VibePickerProps) {
    const theme = useTheme();
    const [selectedEmoji, setSelectedEmoji] = useState<string | null>(null);
    const [customLabel, setCustomLabel] = useState("");
    const [customEmojiPickerVisible, setCustomEmojiPickerVisible] = useState(false);

    const updateAvatar = useMutation(api.users.updateAvatar);
    const { previewUri, uploading: uploadingAvatar, pickAndUpload, reset: resetAvatar } = useImageUpload();

    function handleSelect(emoji: string, presetLabel: string) {
        setSelectedEmoji(emoji);
        setCustomLabel(presetLabel);
    }

    function handleCustomEmojiSelect(emoji: string) {
        setSelectedEmoji(emoji);
        setCustomLabel("");
        setCustomEmojiPickerVisible(false);
    }

    async function handlePickAvatar() {
        const storageId = await pickAndUpload();
        if (storageId) {
            try {
                await updateAvatar({ storageId });
            } catch (error) {
                console.error('[VibePicker] updateAvatar error:', error);
                Alert.alert('Error', 'Could not save profile image. Please try again.');
            }
        }
    }

    function handleSubmit() {
        if (!selectedEmoji) return;
        onSelect(selectedEmoji, customLabel || undefined);
        resetAndClose();
    }

    function handleClear() {
        onClear();
        resetAndClose();
    }

    function resetAndClose() {
        setSelectedEmoji(null);
        setCustomLabel("");
        setCustomEmojiPickerVisible(false);
        resetAvatar();
        onClose();
    }

    const displayAvatar = previewUri ?? currentAvatarUrl;
    const selectedPreset = VIBE_PRESETS.find((preset) => preset.emoji === selectedEmoji);
    const selectedCustomEmoji = selectedEmoji && !selectedPreset ? selectedEmoji : null;

    return (
        <>
            <Modal visible={visible} transparent animationType="slide" onRequestClose={resetAndClose}>
                <Pressable style={styles.backdrop} onPress={resetAndClose} />
                <View style={[styles.sheet, { backgroundColor: theme.surface, borderColor: theme.outline, borderTopWidth: 2 }]}>
                    <ThemedText type="bodyBold" style={styles.title}>
                        Set your vibe
                    </ThemedText>

                    <TouchableOpacity style={styles.avatarRow} onPress={handlePickAvatar} disabled={uploadingAvatar}>
                        <View style={styles.avatarWrap}>
                            <UserAvatar uri={displayAvatar} size={56} fallbackText="You" />
                            <View style={[styles.avatarBadge, { backgroundColor: theme.accent, borderColor: theme.surface }]}>
                                <ThemedText style={styles.avatarBadgeText}>
                                    {uploadingAvatar ? '...' : '+'}
                                </ThemedText>
                            </View>
                        </View>
                        <View style={styles.avatarLabel}>
                            <ThemedText type="smallBold">
                                {uploadingAvatar ? 'Uploading...' : 'Change photo'}
                            </ThemedText>
                            <ThemedText type="small" themeColor="textSecondary">
                                Tap to update profile picture
                            </ThemedText>
                        </View>
                    </TouchableOpacity>

                    <View style={[styles.divider, { backgroundColor: theme.outlineLight }]} />

                    <View style={styles.emojiGrid}>
                        {VIBE_PRESETS.map((preset) => (
                            <TouchableOpacity
                                key={preset.emoji}
                                style={[
                                    styles.emojiOption,
                                    {
                                        borderColor: selectedEmoji === preset.emoji ? theme.accent : 'transparent',
                                        backgroundColor: selectedEmoji === preset.emoji ? theme.accentSoft : 'transparent',
                                    },
                                ]}
                                onPress={() => handleSelect(preset.emoji, preset.label)}
                            >
                                <ThemedText style={styles.emojiChar}>{preset.emoji}</ThemedText>
                                <ThemedText type="caption">{preset.label}</ThemedText>
                            </TouchableOpacity>
                        ))}
                        <TouchableOpacity
                            style={[
                                styles.emojiOption,
                                styles.customEmojiOption,
                                {
                                    borderColor: selectedCustomEmoji ? theme.accent : theme.dashedBorder,
                                    backgroundColor: selectedCustomEmoji ? theme.accentSoft : 'transparent',
                                },
                            ]}
                            onPress={() => setCustomEmojiPickerVisible(true)}
                            accessibilityRole="button"
                            accessibilityLabel="Pick a custom vibe emoji"
                        >
                            <ThemedText style={styles.emojiChar}>{selectedCustomEmoji ?? '+'}</ThemedText>
                            <ThemedText type="caption">Custom</ThemedText>
                        </TouchableOpacity>
                    </View>

                    {selectedEmoji && (
                        <View style={styles.labelSection}>
                            <ThemedText type="small" themeColor="textSecondary">
                                Label (optional)
                            </ThemedText>
                            <TextInput
                                style={[styles.labelInput, { color: theme.text, borderColor: theme.outline, backgroundColor: theme.inputBackground }]}
                                value={customLabel}
                                onChangeText={setCustomLabel}
                                placeholder="e.g. feeling the weekend"
                                placeholderTextColor={theme.textTertiary}
                                maxLength={30}
                            />
                        </View>
                    )}

                    <View style={styles.actions}>
                        <TouchableOpacity style={styles.clearButton} onPress={handleClear}>
                            <ThemedText type="small" themeColor="textSecondary">
                                Clear vibe
                            </ThemedText>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[styles.submitButton, { backgroundColor: theme.accent, opacity: selectedEmoji ? 1 : 0.4 }]}
                            onPress={handleSubmit}
                            disabled={!selectedEmoji}
                        >
                            <ThemedText type="smallBold" style={{ color: "#fff" }}>
                                Set vibe
                            </ThemedText>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>

            <EmojiPickerModal
                visible={customEmojiPickerVisible}
                title="Pick your vibe"
                onClose={() => setCustomEmojiPickerVisible(false)}
                onSelect={handleCustomEmojiSelect}
            />
        </>
    );
}

const styles = StyleSheet.create({
    backdrop: {
        flex: 1,
        backgroundColor: "rgba(0,0,0,0.4)",
    },
    sheet: {
        borderTopLeftRadius: Radius.xl,
        borderTopRightRadius: Radius.xl,
        padding: Spacing.lg,
        paddingBottom: Spacing.xxl,
    },
    title: {
        marginBottom: Spacing.lg,
        textAlign: "center",
    },
    avatarRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: Spacing.lg,
        paddingVertical: Spacing.sm,
    },
    avatarWrap: {
        position: "relative",
    },
    avatarBadge: {
        position: "absolute",
        bottom: -2,
        right: -2,
        width: 20,
        height: 20,
        borderRadius: 10,
        alignItems: "center",
        justifyContent: "center",
        borderWidth: 2,
    },
    avatarBadgeText: {
        color: "#fff",
        fontSize: Typography.caption,
        fontWeight: Weight.bold,
    },
    avatarLabel: {
        gap: 2,
    },
    divider: {
        height: 1,
        marginVertical: Spacing.lg,
    },
    emojiGrid: {
        flexDirection: "row",
        flexWrap: "wrap",
        gap: Spacing.sm,
        justifyContent: "center",
    },
    emojiOption: {
        alignItems: "center",
        width: 64,
        paddingVertical: Spacing.sm,
        borderRadius: Radius.lg,
        borderWidth: 2,
    },
    customEmojiOption: {
        borderStyle: "dashed",
    },
    emojiChar: {
        fontSize: Typography.heading,
        marginBottom: 2,
    },
    labelSection: {
        marginTop: Spacing.lg,
        gap: Spacing.xs,
    },
    labelInput: {
        borderWidth: 2,
        borderRadius: Radius.md,
        padding: Spacing.sm,
        fontSize: Typography.small,
    },
    actions: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginTop: Spacing.lg,
    },
    clearButton: {
        padding: Spacing.sm,
    },
    submitButton: {
        paddingHorizontal: Spacing.lg,
        paddingVertical: Spacing.sm,
        borderRadius: Radius.md,
    },
});
