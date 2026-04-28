import { useState } from 'react';
import { Modal, Pressable, StyleSheet, TextInput, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type ChannelType = 'topic' | 'mood' | 'ephemeral';

const DURATIONS = [
    { label: '30 min', ms: 30 * 60 * 1000 },
    { label: '1 hour', ms: 60 * 60 * 1000 },
    { label: '2 hours', ms: 2 * 60 * 60 * 1000 },
    { label: '6 hours', ms: 6 * 60 * 60 * 1000 },
    { label: '24 hours', ms: 24 * 60 * 60 * 1000 },
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
    onClose: () => void;
    onCreate: (args: { name: string; type: ChannelType; expiresAt?: number }) => Promise<void>;
}

export function CreateChannelModal({ visible, defaultType, onClose, onCreate }: CreateChannelModalProps) {
    const [name, setName] = useState('');
    const [type, setType] = useState<ChannelType>(defaultType);
    const [duration, setDuration] = useState(DURATIONS[0].ms);
    const [creating, setCreating] = useState(false);
    const theme = useTheme();

    const handleCreate = async () => {
        if (!name.trim() || creating) return;
        setCreating(true);
        try {
            await onCreate({
                name: name.trim(),
                type,
                expiresAt: type === 'ephemeral' ? Date.now() + duration : undefined,
            });
            setName('');
            setDuration(DURATIONS[0].ms);
            onClose();
        } finally {
            setCreating(false);
        }
    };

    const canCreate = name.trim().length > 0 && (type !== 'ephemeral' || duration > 0);

    return (
        <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
            <Pressable style={styles.overlay} onPress={onClose}>
                <Pressable style={[styles.sheet, { backgroundColor: theme.surface, borderColor: theme.outline, borderTopWidth: 2 }]} onPress={(e) => e.stopPropagation()}>
                    <ThemedText type="heading" style={styles.title}>Create Channel</ThemedText>

                    <View style={styles.typeRow}>
                        {(['topic', 'mood', 'ephemeral'] as const).map((t) => (
                            <Pressable
                                key={t}
                                onPress={() => setType(t)}
                                style={[
                                    styles.typeButton,
                                    {
                                        borderColor: type === t ? theme.accent : theme.outlineLight,
                                        backgroundColor: type === t ? theme.accentSoft : theme.backgroundElement,
                                    },
                                ]}
                                accessibilityRole="button"
                                accessibilityLabel={`${t} channel type`}
                            >
                                <ThemedText type="small" style={{ color: type === t ? theme.accent : theme.textSecondary, fontWeight: '600' }}>
                                    {t.charAt(0).toUpperCase() + t.slice(1)}
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

                    <View style={styles.actions}>
                        <Pressable onPress={onClose} style={styles.actionBtn}>
                            <ThemedText themeColor="textSecondary">Cancel</ThemedText>
                        </Pressable>
                        <Pressable
                            onPress={handleCreate}
                            disabled={!canCreate || creating}
                            style={[styles.actionBtn, { opacity: canCreate && !creating ? 1 : 0.4 }]}
                        >
                            <ThemedText style={{ fontWeight: '600', color: theme.accent }}>Create</ThemedText>
                        </Pressable>
                    </View>
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
    },
    title: {
        marginBottom: Spacing.lg,
    },
    typeRow: {
        flexDirection: 'row',
        gap: Spacing.sm,
        marginBottom: Spacing.lg,
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
    input: {
        borderWidth: 2,
        borderRadius: Radius.md,
        paddingHorizontal: Spacing.lg,
        paddingVertical: Spacing.sm,
        fontSize: 16,
        marginBottom: Spacing.lg,
        minHeight: 48,
    },
    actions: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        gap: Spacing.lg,
    },
    actionBtn: {
        paddingHorizontal: Spacing.lg,
        paddingVertical: Spacing.sm,
        minHeight: 44,
        justifyContent: 'center',
    },
});
