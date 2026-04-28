import { useQuery } from 'convex/react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { api } from '@/convex/_generated/api';
import { Id } from '@/convex/_generated/dataModel';

interface ChannelSwitcherProps {
    visible: boolean;
    squadId: Id<"squads">;
    currentChannelId: string;
    onClose: () => void;
    onSwitch: (channelId: string) => void;
}

export function ChannelSwitcher({ visible, squadId, currentChannelId, onClose, onSwitch }: ChannelSwitcherProps) {
    const channels = useQuery(api.channel.getChannelsWithUnread, { squadId });
    const theme = useTheme();

    if (!visible) return null;

    return (
        <Modal transparent animationType="slide" onRequestClose={onClose}>
            <Pressable style={styles.overlay} onPress={onClose}>
                <View style={[styles.sheet, { backgroundColor: theme.surface, borderColor: theme.outline, borderTopWidth: 2 }]}>
                    <ThemedText type="bodyBold" style={styles.title}>Switch Channel</ThemedText>

                    {channels === undefined ? (
                        <ThemedText type="small" themeColor="textSecondary">Loading...</ThemedText>
                    ) : (
                        channels.map(channel => {
                            const isActive = channel._id === currentChannelId;
                            return (
                                <Pressable
                                    key={channel._id}
                                    onPress={() => { onSwitch(channel._id); onClose(); }}
                                    style={[
                                        styles.item,
                                        {
                                            borderColor: theme.outlineLight,
                                            backgroundColor: isActive ? theme.backgroundSelected : 'transparent',
                                        },
                                    ]}
                                    accessibilityRole="button"
                                    accessibilityLabel={`Switch to ${channel.name}`}
                                >
                                    <View style={styles.itemContent}>
                                        <ThemedText style={isActive && { fontWeight: '700' }}>
                                            {channel.name}
                                        </ThemedText>
                                        {channel.unreadCount > 0 && !isActive && (
                                            <View style={[styles.badge, { backgroundColor: theme.accent }]}>
                                                <ThemedText type="caption" style={{ color: '#fff', fontWeight: '700' }}>
                                                    {channel.unreadCount}
                                                </ThemedText>
                                            </View>
                                        )}
                                    </View>
                                    {channel.recentMessages.length > 0 && (
                                        <ThemedText type="small" themeColor="textSecondary" numberOfLines={1}>
                                            {channel.recentMessages[channel.recentMessages.length - 1].content}
                                        </ThemedText>
                                    )}
                                </Pressable>
                            );
                        })
                    )}
                </View>
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
        maxHeight: '60%',
    },
    title: {
        marginBottom: Spacing.sm,
    },
    item: {
        paddingVertical: Spacing.sm,
        paddingHorizontal: Spacing.lg,
        borderBottomWidth: 1.5,
        minHeight: 56,
        justifyContent: 'center',
    },
    itemContent: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    badge: {
        paddingHorizontal: Spacing.sm,
        paddingVertical: 2,
        borderRadius: 10,
        overflow: 'hidden',
    },
});
