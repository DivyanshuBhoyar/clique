import AsyncStorage from '@react-native-async-storage/async-storage';
import { useQuery } from 'convex/react';
import { Tabs, useLocalSearchParams } from 'expo-router';
import { useEffect } from 'react';
import { api } from '../../../../../convex/_generated/api';
import { Id } from '../../../../../convex/_generated/dataModel';

export default function SquadTabsLayout() {
    const { id } = useLocalSearchParams();
    const squadId = typeof id === 'string' ? id as Id<"squads"> : undefined;

    // Persist last visited squad for auto-redirect on next app open
    useEffect(() => {
        if (squadId) {
            AsyncStorage.setItem('lastSquadId', squadId);
        }
    }, [squadId]);

    // Fetch squad details to show the name in the header
    const squad = useQuery(api.squad.getSquad, squadId ? { id: squadId } : "skip");

    return (
        <Tabs
            screenOptions={{
                headerShown: true,
                headerTitle: squad?.name || "Loading...",
                tabBarActiveTintColor: '#000',
                tabBarInactiveTintColor: '#888',
                tabBarStyle: {
                    borderTopWidth: 1,
                    borderColor: '#eee',
                }
            }}
        >
            <Tabs.Screen
                name="chat"
                options={{
                    title: "Chat",
                    tabBarLabel: "Chat",
                }}
            />
            <Tabs.Screen
                name="memories"
                options={{
                    title: "Memories",
                    tabBarLabel: "Memories",
                }}
            />
            <Tabs.Screen
                name="notes"
                options={{
                    title: "Notes",
                    tabBarLabel: "Notes",
                }}
            />
            <Tabs.Screen
                name="vibes"
                options={{
                    title: "Vibes",
                    tabBarLabel: "Vibes",
                }}
            />
            <Tabs.Screen
                name="drops"
                options={{
                    title: "Drops",
                    tabBarLabel: "Drops",
                }}
            />
        </Tabs>
    );
}
