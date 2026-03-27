import { useMutation } from 'convex/react';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    StyleSheet,
    TextInput,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/button';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { api } from '../../../convex/_generated/api';

export default function SetUsernameScreen() {
    const router = useRouter();
    const ensureUser = useMutation(api.auth.users.ensureUser);
    const saveUsername = useMutation(api.auth.users.saveUsername);

    const [username, setUsername] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleSave = async () => {
        const trimmed = username.trim();
        if (!trimmed) {
            Alert.alert('Error', 'Please enter a username.');
            return;
        }
        if (trimmed.length < 3) {
            Alert.alert('Error', 'Username must be at least 3 characters.');
            return;
        }

        setIsLoading(true);
        try {
            // Make sure the user record exists first
            await ensureUser();
            await saveUsername({ username: trimmed });
            router.replace('/(auth)' as any);
        } catch (err: any) {
            console.error(err);
            Alert.alert('Error', 'Failed to save username. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <ThemedView style={styles.container}>
            <SafeAreaView style={styles.safeArea}>
                <View style={styles.heroSection}>
                    <ThemedText type="title" style={styles.title}>
                        Welcome! 👋
                    </ThemedText>
                    <ThemedText style={styles.subtitle}>
                        What should we call you?
                    </ThemedText>
                </View>

                <View style={styles.formSection}>
                    <TextInput
                        style={styles.input}
                        value={username}
                        onChangeText={setUsername}
                        placeholder="Pick a username"
                        placeholderTextColor="#888"
                        autoCapitalize="none"
                        autoCorrect={false}
                        editable={!isLoading}
                    />

                    {isLoading ? (
                        <ActivityIndicator size="small" color="#007AFF" />
                    ) : (
                        <Button
                            title="Let's Go!"
                            color="#007AFF"
                            onPress={handleSave}
                        />
                    )}
                </View>
            </SafeAreaView>
        </ThemedView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    safeArea: {
        flex: 1,
        paddingHorizontal: Spacing.four,
        justifyContent: 'center',
        gap: Spacing.three,
    },
    heroSection: {
        alignItems: 'center',
        marginBottom: 40,
    },
    title: {
        textAlign: 'center',
        fontSize: 32,
        fontWeight: 'bold',
    },
    subtitle: {
        fontSize: 18,
        color: '#666',
        marginTop: 10,
    },
    formSection: {
        paddingHorizontal: 20,
        gap: Spacing.three,
    },
    input: {
        backgroundColor: '#f5f5f5',
        borderWidth: 1,
        borderColor: '#eee',
        borderRadius: 8,
        padding: Spacing.three,
        fontSize: 18,
        textAlign: 'center',
    },
});
