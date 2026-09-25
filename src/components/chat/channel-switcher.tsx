import { useQuery } from 'convex/react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing, Weight } from '@/constants/theme';
import { api } from '@/convex/_generated/api';
import { Id } from '@/convex/_generated/dataModel';
import { useTheme } from '@/hooks/use-theme';

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
                <View style={[styles.sheet, { backgroundColor: theme.chatSurface, borderColor: theme.chatBorder, borderTopWidth: 1 }]}>
                    <ThemedText type="bodyBold" style={[styles.title, { color: theme.chatBubbleInText }]}>Switch Channel</ThemedText>

                    {channels === undefined ? (
                        <ThemedText type="small" style={{ color: theme.chatTextMuted }}>Loading...</ThemedText>
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
                                            borderColor: theme.chatBorder,
                                            backgroundColor: isActive ? theme.chatAccentTint : 'transparent',
                                        },
                                    ]}
                                    accessibilityRole="button"
                                    accessibilityLabel={`Switch to ${channel.name}`}
                                >
                                    <View style={styles.itemContent}>
                                        <View style={styles.channelLabel}>
                                            {channel.emoji ? (
                                                <ThemedText style={styles.channelEmoji}>{channel.emoji}</ThemedText>
                                            ) : null}
                                            <ThemedText style={[isActive && styles.activeChannelName, { color: theme.chatBubbleInText }]}>
                                                {channel.name}
                                            </ThemedText>
                                        </View>
                                        {channel.unreadCount > 0 && !isActive && (
                                            <View style={[styles.badge, { backgroundColor: theme.chatAccent }]}>
                                                <ThemedText type="caption" style={[styles.badgeText, { color: theme.chatOnAccent }]}>
                                                    {channel.unreadCount}
                                                </ThemedText>
                                            </View>
                                        )}
                                    </View>
                                    {channel.recentMessages.length > 0 && (
                                        <ThemedText type="small" style={{ color: theme.chatTextMuted }} numberOfLines={1}>
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
    channelLabel: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.xs,
        flex: 1,
    },
    channelEmoji: {
        fontSize: 18,
    },
    activeChannelName: {
        fontWeight: Weight.bold,
    },
    badge: {
        paddingHorizontal: Spacing.sm,
        paddingVertical: 2,
        borderRadius: 10,
        overflow: 'hidden',
    },
    badgeText: {
        fontWeight: Weight.bold,
    },
});
