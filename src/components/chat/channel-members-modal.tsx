import { useMutation, useQuery } from 'convex/react';
import { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing, Typography, Weight } from '@/constants/theme';
import { api } from '@/convex/_generated/api';
import { Id } from '@/convex/_generated/dataModel';
import { useTheme } from '@/hooks/use-theme';
import { useToast } from '@/hooks/use-toast';

interface ChannelMembersModalProps {
    visible: boolean;
    channelId: Id<"channels">;
    squadId: Id<"squads">;
    channelName: string;
    isCreator: boolean;
    onClose: () => void;
}

export function ChannelMembersModal({ visible, channelId, squadId, channelName, isCreator, onClose }: ChannelMembersModalProps) {
    const theme = useTheme();
    const toast = useToast();
    const [newName, setNewName] = useState(channelName);
    const [renaming, setRenaming] = useState(false);

    const channelMembers = useQuery(api.channel.getChannelMembers, visible ? { channelId } : "skip");
    const squadMembers = useQuery(api.squad.getSquadMembers, visible && isCreator ? { squadId } : "skip");
    const updateMembers = useMutation(api.channel.updateChannelMembers);
    const renameChannel = useMutation(api.channel.renameChannel);

    const channelMemberIds = new Set(channelMembers?.map(m => m.userId) ?? []);

    const handleAdd = async (userId: Id<"users">) => {
        try {
            await updateMembers({ channelId, addIds: [userId], removeIds: [] });
        } catch (err: any) {
            toast.error(err.message ?? 'Failed to add member');
        }
    };

    const handleRemove = async (userId: Id<"users">) => {
        try {
            await updateMembers({ channelId, addIds: [], removeIds: [userId] });
        } catch (err: any) {
            toast.error(err.message ?? 'Failed to remove member');
        }
    };

    const handleRename = async () => {
        const trimmed = newName.trim();
        if (!trimmed || trimmed === channelName) return;
        setRenaming(true);
        try {
            await renameChannel({ channelId, name: trimmed });
            toast.success('Channel renamed');
        } catch (err: any) {
            toast.error(err.message ?? 'Failed to rename');
        } finally {
            setRenaming(false);
        }
    };

    const nonMembers = squadMembers?.filter(m => !channelMemberIds.has(m.userId)) ?? [];

    return (
        <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
            <Pressable style={styles.overlay} onPress={onClose}>
                <Pressable style={[styles.sheet, { backgroundColor: theme.chatSurface, borderColor: theme.chatBorder, borderTopWidth: 2 }]} onPress={(e) => e.stopPropagation()}>
                    <ThemedText type="heading" style={[styles.title, { color: theme.chatBubbleInText }]}>Channel Settings</ThemedText>

                    {isCreator && (
                        <View style={styles.renameSection}>
                            <ThemedText type="small" style={[styles.sectionLabel, { color: theme.chatTextMuted }]}>
                                Channel name
                            </ThemedText>
                            <View style={styles.renameRow}>
                                <TextInput
                                    value={newName}
                                    onChangeText={setNewName}
                                    style={[styles.renameInput, { color: theme.chatBubbleInText, borderColor: theme.chatBorder, backgroundColor: theme.chatSurface }]}
                                    placeholder="Channel name"
                                    placeholderTextColor={theme.chatTextMuted}
                                />
                                {newName.trim() !== channelName && newName.trim().length > 0 && (
                                    <Pressable
                                        onPress={handleRename}
                                        disabled={renaming}
                                        style={[styles.renameBtn, { backgroundColor: theme.chatAccent, borderColor: theme.chatAccent }]}
                                    >
                                        <ThemedText type="small" style={[styles.renameBtnText, { color: theme.chatOnAccent }]}>
                                            {renaming ? '…' : 'Save'}
                                        </ThemedText>
                                    </Pressable>
                                )}
                            </View>
                        </View>
                    )}

                    <ThemedText type="small" style={[styles.sectionLabel, { color: theme.chatTextMuted }]}>
                        Members
                    </ThemedText>
                    <ScrollView style={styles.list} nestedScrollEnabled>
                        {channelMembers?.map(m => (
                            <View key={m.userId} style={[styles.row, { borderColor: theme.chatBorder }]}>
                                <View style={styles.rowText}>
                                    <ThemedText type="small" style={{ color: theme.chatBubbleInText }}>
                                        {m.nickname}{m.isCreator ? ' (creator)' : ''}
                                    </ThemedText>
                                </View>
                                {isCreator && !m.isCreator && (
                                    <Pressable onPress={() => handleRemove(m.userId as Id<"users">)} hitSlop={8}>
                                        <ThemedText type="small" style={{ color: theme.error }}>Remove</ThemedText>
                                    </Pressable>
                                )}
                            </View>
                        ))}
                    </ScrollView>

                    {isCreator && nonMembers.length > 0 && (
                        <View style={styles.addSection}>
                            <ThemedText type="small" style={[styles.sectionLabel, { color: theme.chatTextMuted }]}>
                                Add members
                            </ThemedText>
                            <ScrollView style={styles.list} nestedScrollEnabled>
                                {nonMembers.map(m => (
                                    <View key={m.userId} style={[styles.row, { borderColor: theme.chatBorder }]}>
                                        <ThemedText type="small" style={[styles.rowText, { color: theme.chatBubbleInText }]}>{m.nickname}</ThemedText>
                                        <Pressable onPress={() => handleAdd(m.userId as Id<"users">)} hitSlop={8}>
                                            <ThemedText type="small" style={styles.addText}>+ Add</ThemedText>
                                        </Pressable>
                                    </View>
                                ))}
                            </ScrollView>
                        </View>
                    )}

                    <Pressable onPress={onClose} style={[styles.closeBtn, { borderColor: theme.chatBorder }]}>
                        <ThemedText style={[styles.closeBtnText, { color: theme.chatBubbleInText }]}>Done</ThemedText>
                    </Pressable>
                </Pressable>
            </Pressable>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        justifyContent: 'flex-end',
        backgroundColor: 'rgba(0,0,0,0.4)',
    },
    sheet: {
        borderTopLeftRadius: Radius.xl,
        borderTopRightRadius: Radius.xl,
        padding: Spacing.lg,
        paddingBottom: Spacing.xxxl,
        maxHeight: '75%',
    },
    title: {
        marginBottom: Spacing.lg,
    },
    renameSection: {
        marginBottom: Spacing.lg,
    },
    renameRow: {
        flexDirection: 'row',
        gap: Spacing.sm,
        alignItems: 'center',
    },
    renameInput: {
        flex: 1,
        borderWidth: 2,
        borderRadius: Radius.sm,
        paddingHorizontal: Spacing.md,
        paddingVertical: Spacing.xs,
        fontSize: Typography.body,
        minHeight: 40,
    },
    renameBtn: {
        paddingHorizontal: Spacing.md,
        paddingVertical: Spacing.xs,
        borderWidth: 2,
        borderRadius: Radius.sm,
        minHeight: 40,
        justifyContent: 'center',
    },
    renameBtnText: {
        fontWeight: Weight.bold,
    },
    list: {
        maxHeight: 200,
    },
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: Spacing.sm,
        paddingHorizontal: Spacing.sm,
        borderBottomWidth: 1,
        minHeight: 44,
    },
    rowText: {
        flex: 1,
    },
    sectionLabel: {
        marginBottom: Spacing.xs,
    },
    addText: {
        fontWeight: Weight.semibold,
    },
    addSection: {
        marginTop: Spacing.lg,
    },
    closeBtn: {
        marginTop: Spacing.lg,
        alignItems: 'center',
        paddingVertical: Spacing.sm,
        borderWidth: 2,
        borderRadius: Radius.md,
        minHeight: 44,
        justifyContent: 'center',
    },
    closeBtnText: {
        fontWeight: Weight.semibold,
    },
});
