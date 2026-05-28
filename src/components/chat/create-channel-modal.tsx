import { useQuery } from 'convex/react';
import { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { EmojiPickerModal } from '@/components/ui/emoji-picker-modal';
import { Radius, Spacing, Typography, Weight } from '@/constants/theme';
import { api } from '@/convex/_generated/api';
import { Id } from '@/convex/_generated/dataModel';
import { useTheme } from '@/hooks/use-theme';

type ChannelType = 'topic' | 'mood' | 'ephemeral' | 'private';

const DURATIONS = [
    { label: '10 min', ms: 10 * 60 * 1000 },
    { label: '30 min', ms: 30 * 60 * 1000 },
    { label: '1 hour', ms: 60 * 60 * 1000 },
    { label: '2 hours', ms: 2 * 60 * 60 * 1000 },
    { label: '24 hours', ms: 24 * 60 * 60 * 1000 },
    { label: '3 days', ms: 3 * 24 * 60 * 60 * 1000 },
    { label: '1 week', ms: 7 * 24 * 60 * 60 * 1000 },
];

function formatGracePeriod(durationMs: number): string {
    const graceMs = Math.max(Math.floor(durationMs * 0.1), 5 * 60 * 1000);
    const minutes = Math.round(graceMs / 60000);
    if (minutes < 60) return `${minutes} min`;
    const hours = Math.floor(minutes / 60);
    const remainMin = minutes % 60;
    return remainMin > 0 ? `${hours}h ${remainMin}m` : `${hours}h`;
}

interface CreateChannelModalProps {
    visible: boolean;
    defaultType: ChannelType;
    squadId: Id<"squads">;
    onClose: () => void;
    onCreate: (args: { name: string; type: ChannelType; emoji?: string; expiresAt?: number; memberIds?: Id<"users">[] }) => Promise<void>;
}

export function CreateChannelModal({ visible, defaultType, squadId, onClose, onCreate }: CreateChannelModalProps) {
    const [name, setName] = useState('');
    const [type, setType] = useState<ChannelType>(defaultType);
    const [duration, setDuration] = useState(DURATIONS[0].ms);
    const [selectedMembers, setSelectedMembers] = useState<Set<string>>(new Set());
    const [selectedEmoji, setSelectedEmoji] = useState<string | undefined>(undefined);
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);
    const [creating, setCreating] = useState(false);
    const theme = useTheme();

    const members = useQuery(api.squad.getSquadMembers, visible && type === 'private' ? { squadId } : "skip");

    const toggleMember = (userId: string) => {
        setSelectedMembers(prev => {
            const next = new Set(prev);
            if (next.has(userId)) next.delete(userId);
            else next.add(userId);
            return next;
        });
    };

    const handleCreate = async () => {
        if (!name.trim() || creating) return;
        if (type === 'private' && selectedMembers.size === 0) return;
        setCreating(true);
        try {
            await onCreate({
                name: name.trim(),
                type,
                emoji: selectedEmoji,
                expiresAt: type === 'ephemeral' ? Date.now() + duration : undefined,
                memberIds: type === 'private' ? [...selectedMembers] as Id<"users">[] : undefined,
            });
            setName('');
            setDuration(DURATIONS[0].ms);
            setSelectedMembers(new Set());
            setSelectedEmoji(undefined);
            onClose();
        } finally {
            setCreating(false);
        }
    };

    const canCreate = name.trim().length > 0
        && (type !== 'ephemeral' || duration > 0)
        && (type !== 'private' || selectedMembers.size > 0);

    return (
        <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
            <Pressable style={styles.overlay} onPress={onClose}>
                <Pressable style={[styles.sheet, { backgroundColor: theme.surface, borderColor: theme.outline, borderTopWidth: 2 }]} onPress={(e) => e.stopPropagation()}>
                    <ThemedText type="heading" style={styles.title}>Create Channel</ThemedText>

                    <View style={styles.typeRow}>
                        {(['topic', 'mood', 'ephemeral', 'private'] as const).map((t) => (
                            <Pressable
                                key={t}
                                onPress={() => setType(t)}
                                style={[
                                    styles.typeButton,
                                    {
                                        borderColor: type === t ? theme.text : theme.outlineLight,
                                        backgroundColor: type === t ? theme.accent : theme.backgroundElement,
                                    },
                                ]}
                                accessibilityRole="button"
                                accessibilityLabel={`${t} channel type`}
                            >
                                <ThemedText type="small" style={{ color: type === t ? theme.text : theme.textSecondary, fontWeight: Weight.semibold }}>
                                    {t === 'private' ? '🔒 Private' : t.charAt(0).toUpperCase() + t.slice(1)}
                                </ThemedText>
                            </Pressable>
                        ))}
                    </View>

                    {type === 'ephemeral' && (
                        <View style={styles.durationSection}>
                            <ThemedText type="small" themeColor="textSecondary">Duration</ThemedText>
                            <View style={styles.durationRow}>
                                {DURATIONS.map(d => (
                                    <Pressable
                                        key={d.ms}
                                        onPress={() => setDuration(d.ms)}
                                        style={[
                                            styles.durationButton,
                                            {
                                                borderColor: duration === d.ms ? theme.accent : theme.outlineLight,
                                                backgroundColor: duration === d.ms ? theme.accentSoft : 'transparent',
                                            },
                                        ]}
                                    >
                                        <ThemedText type="small" style={{ color: duration === d.ms ? theme.accent : theme.textSecondary }}>
                                            {d.label}
                                        </ThemedText>
                                    </Pressable>
                                ))}
                            </View>
                            <ThemedText type="caption" themeColor="textTertiary">
                                Grace period: {formatGracePeriod(duration)}
                            </ThemedText>
                        </View>
                    )}

                    {type === 'private' && (
                        <View style={styles.membersSection}>
                            <ThemedText type="small" themeColor="textSecondary">
                                Select members ({selectedMembers.size} selected)
                            </ThemedText>
                            <ScrollView style={styles.membersList} nestedScrollEnabled>
                                {members?.map(m => (
                                    <Pressable
                                        key={m.userId}
                                        onPress={() => toggleMember(m.userId)}
                                        style={[
                                            styles.memberRow,
                                            {
                                                borderColor: selectedMembers.has(m.userId) ? theme.accent : theme.outlineLight,
                                                backgroundColor: selectedMembers.has(m.userId) ? theme.accentSoft : 'transparent',
                                            },
                                        ]}
                                    >
                                        <ThemedText type="small" style={{ flex: 1 }}>{m.nickname}</ThemedText>
                                        {selectedMembers.has(m.userId) && (
                                            <ThemedText type="small">✓</ThemedText>
                                        )}
                                    </Pressable>
                                ))}
                                {!members && (
                                    <ThemedText type="caption" themeColor="textTertiary">Loading members…</ThemedText>
                                )}
                            </ScrollView>
                        </View>
                    )}

                    <View style={styles.nameRow}>
                        <Pressable
                            onPress={() => setShowEmojiPicker(true)}
                            style={[
                                styles.iconButton,
                                { borderColor: theme.outline, backgroundColor: theme.inputBackground },
                            ]}
                            accessibilityLabel="Pick group icon"
                        >
                            <ThemedText style={styles.iconButtonText}>
                                {selectedEmoji ?? '+'}
                            </ThemedText>
                        </Pressable>
                        <TextInput
                            value={name}
                            onChangeText={setName}
                            placeholder="Channel name"
                            placeholderTextColor={theme.textTertiary}
                            style={[styles.input, { color: theme.text, borderColor: theme.outline, backgroundColor: theme.inputBackground }]}
                            autoFocus
                            returnKeyType="done"
                            onSubmitEditing={handleCreate}
                        />
                    </View>

                    <View style={styles.actions}>
                        <Pressable onPress={onClose} style={styles.actionBtn}>
                            <ThemedText themeColor="textSecondary">Cancel</ThemedText>
                        </Pressable>
                        <Pressable
                            onPress={handleCreate}
                            disabled={!canCreate || creating}
                            style={[
                                styles.actionBtn,
                                styles.createBtn,
                                {
                                    backgroundColor: canCreate && !creating ? theme.accent : theme.backgroundElement,
                                    borderColor: theme.outline,
                                    opacity: canCreate && !creating ? 1 : 0.5,
                                },
                            ]}
                        >
                            <ThemedText style={{ fontWeight: Weight.bold, color: theme.text }}>
                                {creating ? 'Creating…' : 'Create'}
                            </ThemedText>
                        </Pressable>
                    </View>
                </Pressable>
            </Pressable>

            <EmojiPickerModal
                visible={showEmojiPicker}
                title="Group icon"
                onClose={() => setShowEmojiPicker(false)}
                onSelect={(emoji) => setSelectedEmoji(emoji)}
            />
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
        maxHeight: '80%',
    },
    title: {
        marginBottom: Spacing.lg,
    },
    typeRow: {
        flexDirection: 'row',
        gap: Spacing.sm,
        marginBottom: Spacing.lg,
        flexWrap: 'wrap',
    },
    typeButton: {
        paddingHorizontal: Spacing.lg,
        paddingVertical: Spacing.sm,
        borderWidth: 2,
        borderRadius: Radius.md,
        minHeight: 44,
        alignItems: 'center',
        justifyContent: 'center',
    },
    durationSection: {
        marginBottom: Spacing.lg,
    },
    durationRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: Spacing.sm,
        marginVertical: Spacing.xs,
    },
    durationButton: {
        paddingHorizontal: Spacing.sm,
        paddingVertical: Spacing.xs,
        borderWidth: 1.5,
        borderRadius: Radius.sm,
        minHeight: 36,
        alignItems: 'center',
        justifyContent: 'center',
    },
    membersSection: {
        marginBottom: Spacing.lg,
    },
    membersList: {
        maxHeight: 180,
        marginTop: Spacing.xs,
    },
    memberRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: Spacing.md,
        paddingVertical: Spacing.sm,
        borderWidth: 1.5,
        borderRadius: Radius.sm,
        marginBottom: Spacing.xs,
        minHeight: 44,
    },
    input: {
        flex: 1,
        borderWidth: 2,
        borderRadius: Radius.md,
        paddingHorizontal: Spacing.lg,
        paddingVertical: Spacing.sm,
        fontSize: Typography.body,
        minHeight: 52,
    },
    nameRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.sm,
        marginBottom: Spacing.lg,
    },
    iconButton: {
        width: 52,
        height: 52,
        borderRadius: Radius.md,
        borderWidth: 2,
        alignItems: 'center',
        justifyContent: 'center',
    },
    iconButtonText: {
        fontSize: 24,
    },
    actions: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        gap: Spacing.lg,
        alignItems: 'center',
    },
    actionBtn: {
        paddingHorizontal: Spacing.lg,
        paddingVertical: Spacing.sm,
        minHeight: 44,
        justifyContent: 'center',
    },
    createBtn: {
        borderRadius: Radius.md,
        borderWidth: 2,
    },
});
