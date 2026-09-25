import { MessageCircleMore } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { AccessibilityInfo, Pressable, StyleSheet, View } from 'react-native';
import Animated, { interpolate, useAnimatedStyle, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { UserAvatar } from '@/components/user-avatar';
import { Radius, Spacing, Typography, Weight } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export interface NewMessageBubbleChannel {
    channelId: string;
    channelName: string;
    unreadCount: number;
    lastMessagePreview: string;
    lastMessageNickname: string;
    lastMessageAvatarUrl: string | null;
}

interface NewMessageBubbleProps {
    channel: NewMessageBubbleChannel | null;
    extraChannelCount?: number;
    onPress: (channelId: string) => void;
    onDismiss: () => void;
}

export function NewMessageBubble({ channel, extraChannelCount = 0, onPress, onDismiss }: NewMessageBubbleProps) {
    const theme = useTheme();
    const insets = useSafeAreaInsets();
    const progress = useSharedValue(0);
    const [reduceMotion, setReduceMotion] = useState(false);

    useEffect(() => {
        AccessibilityInfo.isReduceMotionEnabled().then(setReduceMotion);
        const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduceMotion);
        return () => subscription.remove();
    }, []);

    useEffect(() => {
        if (!channel) return;
        progress.value = 0;
        progress.value = reduceMotion
            ? withTiming(1, { duration: 120 })
            : withSpring(1, { damping: 10, stiffness: 170, mass: 0.8 });
    }, [channel, progress, reduceMotion]);

    const animatedStyle = useAnimatedStyle(() => ({
        opacity: progress.value,
        transform: [
            { translateY: interpolate(progress.value, [0, 1], [-28, 0]) },
            { rotate: `${interpolate(progress.value, [0, 1], [-5, 0])}deg` },
            { scale: interpolate(progress.value, [0, 1], [0.96, 1]) },
        ],
    }));

    if (!channel) return null;

    const unreadLabel = channel.unreadCount > 99 ? '99+' : String(channel.unreadCount);
    const accessibilityLabel = `New message in ${channel.channelName} from ${channel.lastMessageNickname}. Tap to open channel.`;

    return (
        <Animated.View
            pointerEvents="box-none"
            style={[
                styles.layer,
                { top: insets.top + 64 },
                animatedStyle,
            ]}
        >
            <Pressable
                onPress={() => onPress(channel.channelId)}
                onLongPress={onDismiss}
                delayLongPress={250}
                accessibilityRole="button"
                accessibilityLabel={accessibilityLabel}
                style={[
                    styles.bubble,
                    {
                        backgroundColor: theme.chatSurface,
                        borderColor: theme.chatBorder,
                        shadowColor: theme.shadow,
                    },
                ]}
            >
                <View style={[styles.tail, { backgroundColor: theme.chatSurface, borderColor: theme.chatBorder }]} />

                <View style={[styles.iconBubble, { backgroundColor: theme.chatWarmTint, borderColor: theme.chatBorder }]}>
                    <MessageCircleMore size={17} color={theme.chatAccent} strokeWidth={2.6} />
                </View>

                <UserAvatar
                    uri={channel.lastMessageAvatarUrl}
                    size={34}
                    fallbackText={channel.lastMessageNickname}
                />

                <View style={styles.copy}>
                    <View style={styles.channelRow}>
                        <ThemedText style={[styles.channelName, { color: theme.chatBubbleInText }]} numberOfLines={1}>
                            #{channel.channelName}
                        </ThemedText>
                        <View style={[styles.experimentalChip, { backgroundColor: theme.chatAccentTint, borderColor: theme.chatBorder }]}>
                            <ThemedText type="caption" style={[styles.experimentalText, { color: theme.chatTextMuted }]}>exp</ThemedText>
                        </View>
                        <View style={[styles.unreadChip, { backgroundColor: theme.chatAccent, borderColor: theme.chatAccent }]}>
                            <ThemedText type="caption" style={[styles.unreadText, { color: theme.chatOnAccent }]}>
                                {unreadLabel}
                            </ThemedText>
                        </View>
                        {extraChannelCount > 0 ? (
                            <View style={[styles.moreChip, { backgroundColor: theme.chatSurface, borderColor: theme.chatBorder }]}>
                                <ThemedText type="caption" style={[styles.moreText, { color: theme.chatTextMuted }]}>
                                    +{extraChannelCount}
                                </ThemedText>
                            </View>
                        ) : null}
                    </View>
                    <ThemedText type="small" style={[styles.preview, { color: theme.chatTextMuted }]} numberOfLines={1}>
                        {channel.lastMessageNickname}: {channel.lastMessagePreview}
                    </ThemedText>
                </View>

                <View style={[styles.jumpChip, { backgroundColor: theme.chatSurface, borderColor: theme.chatBorder }]}>
                    <ThemedText type="caption" style={[styles.jumpText, { color: theme.chatAccent }]}>go →</ThemedText>
                </View>
            </Pressable>
        </Animated.View>
    );
}

const styles = StyleSheet.create({
    layer: {
        position: 'absolute',
        left: Spacing.md,
        right: Spacing.md,
        zIndex: 20,
    },
    bubble: {
        minHeight: 72,
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.sm,
        paddingVertical: Spacing.sm,
        paddingHorizontal: Spacing.md,
        borderWidth: 2,
        borderRadius: Radius.xl,
        shadowOffset: { width: 4, height: 4 },
        shadowOpacity: 1,
        shadowRadius: 0,
        elevation: 5,
    },
    tail: {
        position: 'absolute',
        top: -7,
        left: 56,
        width: 14,
        height: 14,
        borderTopWidth: 2,
        borderLeftWidth: 2,
        transform: [{ rotate: '45deg' }],
    },
    iconBubble: {
        position: 'absolute',
        top: -11,
        left: 22,
        width: 28,
        height: 28,
        borderRadius: 14,
        borderWidth: 1.5,
        alignItems: 'center',
        justifyContent: 'center',
    },
    copy: {
        flex: 1,
        minWidth: 0,
        gap: 2,
    },
    channelRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.xs,
    },
    channelName: {
        flexShrink: 1,
        fontSize: Typography.body,
        fontWeight: Weight.black,
    },
    preview: {
        lineHeight: 18,
    },
    unreadChip: {
        minWidth: 22,
        height: 20,
        paddingHorizontal: Spacing.xs,
        borderRadius: Radius.full,
        borderWidth: 1.5,
        alignItems: 'center',
        justifyContent: 'center',
    },
    unreadText: {
        fontWeight: Weight.black,
        lineHeight: 14,
    },
    experimentalChip: {
        height: 20,
        paddingHorizontal: Spacing.xs,
        borderRadius: Radius.full,
        borderWidth: 1.5,
        alignItems: 'center',
        justifyContent: 'center',
    },
    experimentalText: {
        fontWeight: Weight.black,
        lineHeight: 14,
        textTransform: 'uppercase',
    },
    moreChip: {
        height: 20,
        paddingHorizontal: Spacing.xs,
        borderRadius: Radius.full,
        borderWidth: 1.5,
        alignItems: 'center',
        justifyContent: 'center',
    },
    moreText: {
        fontWeight: Weight.black,
        lineHeight: 14,
    },
    jumpChip: {
        paddingHorizontal: Spacing.sm,
        paddingVertical: Spacing.xs,
        borderRadius: Radius.full,
        borderWidth: 1.5,
    },
    jumpText: {
        fontWeight: Weight.black,
    },
});
