import AsyncStorage from '@react-native-async-storage/async-storage';
import { useQuery } from 'convex/react';
import { Image } from 'expo-image';
import { Tabs, useLocalSearchParams } from 'expo-router';
import { useEffect } from 'react';
import { api } from '../../../../../convex/_generated/api';
import { Id } from '../../../../../convex/_generated/dataModel';
import { Colors } from '@/constants/theme';

const icons = {
    chat: require('../../../../../assets/images/tabIcons/chat.png'),
    memories: require('../../../../../assets/images/tabIcons/memories.png'),
    notes: require('../../../../../assets/images/tabIcons/notes.png'),
    vibes: require('../../../../../assets/images/tabIcons/vibes.png'),
    drops: require('../../../../../assets/images/tabIcons/drops.png'),
};

function TabIcon({ source, color }: { source: any; color: string }) {
    return (
        <Image
            source={source}
            style={{ width: 22, height: 22, tintColor: color }}
            contentFit="contain"
        />
    );
}

export default function SquadTabsLayout() {
    const { id } = useLocalSearchParams();
    const squadId = typeof id === 'string' ? id as Id<"squads"> : undefined;

    useEffect(() => {
        if (squadId) {
            AsyncStorage.setItem('lastSquadId', squadId);
        }
    }, [squadId]);

    const squad = useQuery(api.squad.getSquad, squadId ? { id: squadId } : "skip");

    return (
        <Tabs
            screenOptions={{
                headerShown: false,
                tabBarHideOnKeyboard: true,
                tabBarActiveTintColor: Colors.light.tabBarActive,
                tabBarInactiveTintColor: Colors.light.tabBarInactive,
                tabBarLabelStyle: { fontSize: 11, fontWeight: '500', marginBottom: 2 },
                tabBarStyle: {
                    borderTopWidth: 1.5,
                    borderColor: Colors.light.tabBarBorder,
                    backgroundColor: Colors.light.tabBarBackground,
                    height: 52,
                    paddingTop: 4,
                    paddingBottom: 4,
                },
            }}
        >
            <Tabs.Screen
                name="chat"
                options={{
                    title: "Chat",
                    tabBarLabel: "Chat",
                    tabBarIcon: ({ color }) => <TabIcon source={icons.chat} color={color} />,
                }}
            />
            <Tabs.Screen
                name="memories"
                options={{
                    title: "Memories",
                    tabBarLabel: "Memories",
                    tabBarIcon: ({ color }) => <TabIcon source={icons.memories} color={color} />,
                }}
            />
            <Tabs.Screen
                name="notes"
                options={{
                    title: "Notes",
                    tabBarLabel: "Notes",
                    tabBarIcon: ({ color }) => <TabIcon source={icons.notes} color={color} />,
                }}
            />
            <Tabs.Screen
                name="vibes"
                options={{
                    title: "Vibes",
                    tabBarLabel: "Vibes",
                    tabBarIcon: ({ color }) => <TabIcon source={icons.vibes} color={color} />,
                }}
            />
            <Tabs.Screen
                name="drops"
                options={{
                    title: "Drops",
                    tabBarLabel: "Drops",
                    tabBarIcon: ({ color }) => <TabIcon source={icons.drops} color={color} />,
                }}
            />
        </Tabs>
    );
}
