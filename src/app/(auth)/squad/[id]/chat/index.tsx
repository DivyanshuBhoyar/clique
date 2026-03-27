import { useRouter } from 'expo-router';
import { StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/button';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';

export default function ChatScreen() {
    const router = useRouter();

    const handleLeaveSquad = () => {
        router.replace('/');
    };

    return (
        <ThemedView style={styles.container}>
            <SafeAreaView style={styles.safeArea}>
                <ThemedView style={styles.content}>
                    <ThemedText type="title" style={styles.title}>
                        Chat Room
                    </ThemedText>
                    <ThemedText style={styles.subtitle}>
                        This is where your squad chats!
                    </ThemedText>
                </ThemedView>

                <Button
                    title="Leave Squad"
                    color="#FF3B30"
                    onPress={handleLeaveSquad}
                    style={styles.leaveButton}
                />
            </SafeAreaView>
        </ThemedView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
    },
    safeArea: {
        flex: 1,
        paddingHorizontal: Spacing.four,
        justifyContent: 'space-between',
    },
    content: {
        alignItems: 'center',
        marginTop: 60,
        backgroundColor: 'transparent',
    },
    title: {
        textAlign: 'center',
        fontSize: 32,
        fontWeight: 'bold',
        color: '#000',
    },
    subtitle: {
        fontSize: 16,
        color: '#666',
        marginTop: 10,
    },
    leaveButton: {
        marginBottom: 40,
    }
});
