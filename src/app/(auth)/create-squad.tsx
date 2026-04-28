import { useMutation } from 'convex/react';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/button';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { api } from '../../../convex/_generated/api';

export default function CreateSquadScreen() {
    const router = useRouter();
    const theme = useTheme();
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
                        style={[styles.input, { color: theme.text, backgroundColor: theme.inputBackground, borderColor: theme.inputBorder }]}
                        value={name}
                        onChangeText={setName}
                        placeholder="e.g. Weekend Warriors"
                        placeholderTextColor={theme.placeholder}
                    />

                    <ThemedText>Squad Password</ThemedText>
                    <TextInput
                        style={[styles.input, { color: theme.text, backgroundColor: theme.inputBackground, borderColor: theme.inputBorder }]}
                        value={password}
                        onChangeText={setPassword}
                        placeholder="Secret password"
                        placeholderTextColor={theme.placeholder}
                        secureTextEntry
                    />

                    <ThemedText>Your Nickname</ThemedText>
                    <TextInput
                        style={[styles.input, { color: theme.text, backgroundColor: theme.inputBackground, borderColor: theme.inputBorder }]}
                        value={nickname}
                        onChangeText={setNickname}
                        placeholder="What should we call you?"
                        placeholderTextColor={theme.placeholder}
                    />
                </ThemedView>

                <Button
                    title={isSubmitting ? "Creating..." : "Create Squad"}
                    color={theme.accent}
                    onPress={handleCreate}
                />

                <Button
                    title="Cancel"
                    color={theme.textTertiary}
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
        borderWidth: 2,
        borderRadius: Radius.md,
        padding: Spacing.three,
        fontSize: 16,
    }
});
