import { Colors, Typography, Weight } from '@/constants/theme';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useQuery } from 'convex/react';
import { Tabs, useLocalSearchParams } from 'expo-router';
import { BookOpen, Heart, MessageCircle, Sparkles, Zap, type LucideIcon } from 'lucide-react-native';
import { useEffect } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { api } from '../../../../../convex/_generated/api';
import { Id } from '../../../../../convex/_generated/dataModel';

const SQUAD_TABS: Record<string, { label: string; Icon: LucideIcon }> = {
    chat: { label: 'Chat', Icon: MessageCircle },
    drops: { label: 'Drops', Icon: Zap },
    memories: { label: 'Memories', Icon: Heart },
    notes: { label: 'Notes', Icon: BookOpen },
    vibes: { label: 'Vibes', Icon: Sparkles },
};

const SQUAD_TAB_ORDER = ['chat', 'drops', 'memories', 'notes', 'vibes'];

/**
 * Squad tab bar layout.
 *
 * Tab order (matches designs): Chat → Drops → Memories → Notes → Vibes
 * Icons: Lucide outline icons, coloured by active/inactive tint.
 *
 * Why Lucide? No PNG assets needed — icons are vector, scale perfectly,
 * and the `color` prop lets React Navigation control active/inactive states
 * automatically.
 */
export default function SquadTabsLayout() {
    const { id } = useLocalSearchParams();
    const insets = useSafeAreaInsets();
    const squadId = typeof id === 'string' ? id as Id<"squads"> : undefined;

    // Persist last visited squad for auto-redirect on next app open
    useEffect(() => {
        if (squadId) {
            AsyncStorage.setItem('lastSquadId', squadId);
        }
    }, [squadId]);

    // Preload squad data (used by child screens via their own useQuery)
    useQuery(api.squad.getSquad, squadId ? { id: squadId } : "skip");

    return (
        <Tabs
            screenOptions={{
                headerShown: false,
                tabBarHideOnKeyboard: true,
                tabBarActiveTintColor: Colors.light.tabBarActive,     // black
                tabBarInactiveTintColor: Colors.light.tabBarInactive,  // warm grey
                tabBarLabelStyle: {
                    fontSize: Typography.caption,
                    fontWeight: Weight.semibold,
                    marginTop: 2,
                    marginBottom: 0,
                },
                tabBarStyle: {
                    borderTopWidth: 1.5,
                    borderTopColor: Colors.light.tabBarBorder,
                    backgroundColor: Colors.light.tabBarBackground,   // cream
                    height: 60 + insets.bottom,
                    paddingTop: 6,
                    paddingBottom: Math.max(insets.bottom, 6),
                },
            }}
            tabBar={(props) => <SquadTabBar {...props} bottomInset={insets.bottom} />}
        >
            {/* 1. Chat — MessageCircle icon */}
            <Tabs.Screen
                name="chat"
                options={{
                    title: 'Chat',
                    tabBarLabel: 'Chat',
                    tabBarIcon: ({ color, focused }) => (
                        <MessageCircle
                            size={22}
                            color={color}
                            strokeWidth={focused ? 2.5 : 1.75}
                            fill={focused ? color : 'transparent'}
                        />
                    ),
                }}
            />

            {/* 2. Drops — Zap icon */}
            <Tabs.Screen
                name="drops"
                options={{
                    title: 'Drops',
                    tabBarLabel: 'Drops',
                    tabBarIcon: ({ color, focused }) => (
                        <Zap
                            size={22}
                            color={color}
                            strokeWidth={focused ? 2.5 : 1.75}
                            fill={focused ? color : 'transparent'}
                        />
                    ),
                }}
            />

            {/* 3. Memories — Heart icon */}
            <Tabs.Screen
                name="memories"
                options={{
                    title: 'Memories',
                    tabBarLabel: 'Memories',
                    tabBarIcon: ({ color, focused }) => (
                        <Heart
                            size={22}
                            color={color}
                            strokeWidth={focused ? 2.5 : 1.75}
                            fill={focused ? color : 'transparent'}
                        />
                    ),
                }}
            />

            {/* 4. Notes — BookOpen icon */}
            <Tabs.Screen
                name="notes"
                options={{
                    title: 'Notes',
                    tabBarLabel: 'Notes',
                    tabBarIcon: ({ color, focused }) => (
                        <BookOpen
                            size={22}
                            color={color}
                            strokeWidth={focused ? 2.5 : 1.75}
                            fill={focused ? color : 'transparent'}
                        />
                    ),
                }}
            />

            {/* 5. Vibes — Sparkles icon */}
            <Tabs.Screen
                name="vibes"
                options={{
                    title: 'Vibes',
                    tabBarLabel: 'Vibes',
                    tabBarIcon: ({ color, focused }) => (
                        <Sparkles
                            size={22}
                            color={color}
                            strokeWidth={focused ? 2.5 : 1.75}
                            fill={focused ? color : 'transparent'}
                        />
                    ),
                }}
            />

            {/* Bookmarks — stack screen, hidden from tab bar */}
            <Tabs.Screen
                name="bookmarks"
                options={{
                    href: null,
                    tabBarStyle: { display: 'none' },
                }}
            />

            {/* Utility screens — reachable from in-flow buttons, never shown as bottom tabs */}
            <Tabs.Screen
                name="members"
                options={{
                    href: null,
                    tabBarStyle: { display: 'none' },
                }}
            />
            <Tabs.Screen
                name="members/[memberId]"
                options={{
                    href: null,
                    tabBarStyle: { display: 'none' },
                }}
            />
            <Tabs.Screen
                name="settings"
                options={{
                    href: null,
                    tabBarStyle: { display: 'none' },
                }}
            />
        </Tabs>
    );
}

function SquadTabBar({ state, descriptors, navigation, bottomInset }: any & { bottomInset: number }) {
    const focusedRoute = state.routes[state.index];
    const focusedOptions = descriptors[focusedRoute.key]?.options;

    if (focusedOptions?.tabBarStyle?.display === 'none') {
        return null;
    }

    const routesByName = new Map(state.routes.map((route: any) => [route.name, route]));

    return (
        <View style={[styles.tabBar, { paddingBottom: Math.max(bottomInset, 6), height: 60 + bottomInset }]}>
            {SQUAD_TAB_ORDER.map((routeName) => {
                const route = routesByName.get(routeName);
                if (!route) return null;

                const { label, Icon } = SQUAD_TABS[routeName];
                const focused = focusedRoute.name === routeName;
                const color = focused ? Colors.light.tabBarActive : Colors.light.tabBarInactive;

                const onPress = () => {
                    const event = navigation.emit({
                        type: 'tabPress',
                        target: route.key,
                        canPreventDefault: true,
                    });

                    if (!focused && !event.defaultPrevented) {
                        navigation.navigate(route.name, route.params);
                    }
                };

                return (
                    <Pressable
                        key={route.key}
                        onPress={onPress}
                        style={({ pressed }) => [styles.tabItem, pressed && styles.tabPressed]}
                        accessibilityRole="button"
                        accessibilityState={focused ? { selected: true } : {}}
                        accessibilityLabel={label}
                    >
                        <Icon
                            size={22}
                            color={color}
                            strokeWidth={focused ? 2.5 : 1.75}
                            fill={focused ? color : 'transparent'}
                        />
                        <Text style={[styles.tabLabel, { color }]}>{label}</Text>
                    </Pressable>
                );
            })}
        </View>
    );
}

const styles = StyleSheet.create({
    tabBar: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-around',
        paddingTop: 6,
        borderTopWidth: 1.5,
        borderTopColor: Colors.light.tabBarBorder,
        backgroundColor: Colors.light.tabBarBackground,
    },
    tabItem: {
        flex: 1,
        minHeight: 48,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 2,
    },
    tabLabel: {
        fontSize: Typography.caption,
        fontWeight: Weight.semibold,
    },
    tabPressed: {
        opacity: 0.7,
    },
});
