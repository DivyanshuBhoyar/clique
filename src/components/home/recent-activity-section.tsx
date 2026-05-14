import { BookOpen, Camera, ChevronRight, Link2, MessageCircle, Music, Zap } from 'lucide-react-native';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Radius, Shadows, Spacing, Weight } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

const ACTIVITY_COLORS: Record<string, string> = {
    drop: '#FAD4A0',
    memory: '#F5C4C0',
    note: '#C8D8F0',
    chat: '#F5E6C8',
    link: '#DDD0F0',
};

function activityIcon(type: string, color: string) {
    const props = { size: 16, color, strokeWidth: 2 };
    switch (type) {
        case 'drop': return <Music {...props} />;
        case 'memory': return <Camera {...props} />;
        case 'note': return <BookOpen {...props} />;
        case 'chat': return <MessageCircle {...props} />;
        case 'link': return <Link2 {...props} />;
        default: return <Zap {...props} />;
    }
}

export interface RecentActivityItem {
    id: string;
    type: 'drop' | 'memory' | 'chat' | 'note' | 'link';
    label: string;
    sub: string;
    createdAt: number;
    route: 'drops' | 'memories' | 'chat' | 'notes';
    routeId?: string;
}

interface RecentActivitySectionProps {
    items: RecentActivityItem[];
    onOpenActivity: (item: RecentActivityItem) => void;
}

export function RecentActivitySection({ items, onOpenActivity }: RecentActivitySectionProps) {
    const theme = useTheme();

    return (
        <View style={styles.section}>
            <View style={styles.sectionHeader}>
                <ThemedText type="bodyBold">Recent Activity</ThemedText>
                <Pressable hitSlop={8} accessibilityRole="button" accessibilityLabel="See all recent activity">
                    <ThemedText type="small" style={{ color: theme.accent, fontWeight: Weight.semibold }}>
                        See all →
                    </ThemedText>
                </Pressable>
            </View>

            {items.length === 0 ? (
                <View style={[styles.emptyRow, { backgroundColor: theme.surface, borderColor: theme.outlineLight }]}> 
                    <ThemedText type="small" themeColor="textSecondary">
                        No activity yet. Start with a message, drop, note, or memory.
                    </ThemedText>
                </View>
            ) : null}

            {items.map((item) => (
                <Pressable
                    key={item.id}
                    style={[
                        styles.activityRow,
                        {
                            backgroundColor: theme.surface,
                            borderColor: theme.outline,
                            shadowColor: theme.shadow,
                            shadowOffset: Shadows.sm.offset,
                            shadowOpacity: Shadows.sm.opacity,
                            shadowRadius: Shadows.sm.radius,
                            elevation: 2,
                        },
                    ]}
                    onPress={() => onOpenActivity(item)}
                    accessibilityRole="button"
                    accessibilityLabel={item.label}
                >
                    <View style={[styles.activityIcon, { backgroundColor: ACTIVITY_COLORS[item.type] ?? theme.backgroundElement }]}>
                        {activityIcon(item.type, theme.text)}
                    </View>
                    <View style={styles.activityText}>
                        <ThemedText type="small" style={{ fontWeight: Weight.semibold }} numberOfLines={1}>
                            {item.label}
                        </ThemedText>
                        <ThemedText type="caption" themeColor="textSecondary" numberOfLines={1}>
                            {item.sub}
                        </ThemedText>
                    </View>
                    <ChevronRight size={14} color={theme.textTertiary} strokeWidth={2} />
                </Pressable>
            ))}
        </View>
    );
}

const styles = StyleSheet.create({
    section: {
        gap: Spacing.md,
        paddingHorizontal: Spacing.lg,
    },
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    activityRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.md,
        borderWidth: 2,
        borderRadius: Radius.lg,
        paddingHorizontal: Spacing.lg,
        paddingVertical: Spacing.md,
    },
    activityIcon: {
        width: 36,
        height: 36,
        borderRadius: Radius.md,
        alignItems: 'center',
        justifyContent: 'center',
    },
    activityText: { flex: 1 },
    emptyRow: {
        borderWidth: 1.5,
        borderRadius: Radius.lg,
        padding: Spacing.lg,
    },
});
