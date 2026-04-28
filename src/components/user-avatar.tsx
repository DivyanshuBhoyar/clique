import { Image } from 'expo-image';
import { StyleSheet, Text, View } from 'react-native';
import { useTheme } from '@/hooks/use-theme';

const COLORS = ['#6366f1', '#ec4899', '#f59e0b', '#10b981', '#3b82f6', '#8b5cf6', '#ef4444', '#14b8a6'];

function getColor(text: string): string {
    let hash = 0;
    for (let i = 0; i < text.length; i++) {
        hash = text.charCodeAt(i) + ((hash << 5) - hash);
    }
    return COLORS[Math.abs(hash) % COLORS.length];
}

interface UserAvatarProps {
    uri: string | null | undefined;
    size?: number;
    fallbackText?: string;
    vibeEmoji?: string;
}

export function UserAvatar({ uri, size = 32, fallbackText, vibeEmoji }: UserAvatarProps) {
    const theme = useTheme();
    const fallback = fallbackText?.charAt(0)?.toUpperCase() ?? '?';
    const color = getColor(fallbackText ?? '?');
    const badgeSize = Math.max(size * 0.35, 14);

    return (
        <View style={{ width: size, height: size, position: 'relative' }}>
            {uri ? (
                <Image
                    source={{ uri }}
                    style={[styles.image, { width: size, height: size, borderRadius: size / 2, backgroundColor: theme.backgroundElement }]}
                    contentFit="cover"
                />
            ) : (
                <View style={[styles.fallback, { width: size, height: size, borderRadius: size / 2, backgroundColor: color }]}>
                    <Text style={[styles.fallbackText, { fontSize: size * 0.4 }]}>{fallback}</Text>
                </View>
            )}

            {vibeEmoji ? (
                <View style={[styles.badge, {
                    width: badgeSize,
                    height: badgeSize,
                    borderRadius: badgeSize / 2,
                    backgroundColor: theme.surface,
                    borderColor: theme.outline,
                    right: -2,
                    bottom: -2,
                }]}>
                    <Text style={{ fontSize: badgeSize * 0.65 }}>{vibeEmoji}</Text>
                </View>
            ) : null}
        </View>
    );
}

const styles = StyleSheet.create({
    image: {
        backgroundColor: '#e5e5e5',
    },
    fallback: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    fallbackText: {
        color: '#fff',
        fontWeight: '700',
    },
    badge: {
        position: 'absolute',
        borderWidth: 1.5,
        alignItems: 'center',
        justifyContent: 'center',
    },
});
