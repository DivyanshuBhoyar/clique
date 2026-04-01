import { useMutation } from 'convex/react';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/button';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { api } from '../../../convex/_generated/api';

export default function CreateSquadScreen() {
    const router = useRouter();
    const [name, setName] = useState('');
    const [password, setPassword] = useState('');
    const [nickname, setNickname] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const createSquad = useMutation(api.squad.createSquad);

    const handleCreate = async () => {
        if (!name || !password || !nickname) {
            alert("Please fill all fields");
            return;
        }

        setIsSubmitting(true);
        try {
            const squadId = await createSquad({
                name,
                password,
                nickname
            });
            router.replace(`/squad/${squadId}/chat` as any);
        } catch (err: any) {
            console.error(err);
            alert("Failed to create squad: " + err.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <ThemedView style={styles.container}>
            <SafeAreaView style={styles.safeArea}>
                <ThemedText type="title" style={styles.title}>
                    Create a Squad
                </ThemedText>

                <ThemedView style={styles.form}>
                    <ThemedText>Squad Name</ThemedText>
                    <TextInput
                        style={styles.input}
                        value={name}
                        onChangeText={setName}
                        placeholder="e.g. Weekend Warriors"
                        placeholderTextColor="#888"
                    />

                    <ThemedText>Squad Password</ThemedText>
                    <TextInput
                        style={styles.input}
                        value={password}
                        onChangeText={setPassword}
                        placeholder="Secret password"
                        placeholderTextColor="#888"
                        secureTextEntry
                    />

                    <ThemedText>Your Nickname</ThemedText>
                    <TextInput
                        style={styles.input}
                        value={nickname}
                        onChangeText={setNickname}
                        placeholder="What should we call you?"
                        placeholderTextColor="#888"
                    />
                </ThemedView>

                <Button
                    title={isSubmitting ? "Creating..." : "Create Squad"}
                    onPress={handleCreate}
                />

                <Button
                    title="Cancel"
                    color="#888"
                    onPress={() => router.back()}
                    style={{ marginTop: 10 }}
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
        paddingTop: Spacing.six,
    },
    title: {
        fontSize: 32,
        fontWeight: 'bold',
        marginBottom: Spacing.six,
    },
    form: {
        gap: Spacing.three,
        marginBottom: Spacing.six,
    },
    input: {
        backgroundColor: '#f5f5f5',
        borderWidth: 1,
        borderColor: '#eee',
        borderRadius: 8,
        padding: Spacing.three,
        fontSize: 16,
    }
});
