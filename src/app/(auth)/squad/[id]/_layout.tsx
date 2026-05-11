import AsyncStorage from '@react-native-async-storage/async-storage';
import { useQuery } from 'convex/react';
import { Tabs, useLocalSearchParams } from 'expo-router';
import { useEffect } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MessageCircle, Zap, Heart, BookOpen, Sparkles } from 'lucide-react-native';
import { api } from '../../../../../convex/_generated/api';
import { Id } from '../../../../../convex/_generated/dataModel';
import { Colors, Typography, Weight } from '@/constants/theme';

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
        </Tabs>
    );
}
