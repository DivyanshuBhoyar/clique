import { useAuthActions } from '@convex-dev/auth/react';
import { useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Platform,
    StyleSheet,
    TextInput,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/button';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';

type Step = 'email' | 'otp';

export default function SignInScreen() {
    const { signIn } = useAuthActions();

    const [step, setStep] = useState<Step>('email');
    const [email, setEmail] = useState('');
    const [code, setCode] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleGoogleSignIn = async () => {
        const isMobile = Platform.OS === 'ios' || Platform.OS === 'android';
        if (!isMobile) {
            // Web: triggers a full-page redirect to Google, fire-and-forget
            void signIn('google');
            return;
        }
        // Mobile: open browser with deep-link redirect back to app
        setIsLoading(true);
        try {
            await signIn('google', { redirectTo: 'clique://' });
        } catch (err: any) {
            console.error(err);
            Alert.alert('Error', 'Google sign-in failed. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleSendOTP = async () => {
        if (!email.trim()) {
            Alert.alert('Error', 'Please enter your email address.');
            return;
        }
        setIsLoading(true);
        try {
            await signIn('resend-otp', { email: email.trim() });
            setStep('otp');
        } catch (err: any) {
            console.error(err);
            Alert.alert('Error', 'Failed to send code. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleVerifyOTP = async () => {
        if (!code.trim()) {
            Alert.alert('Error', 'Please enter the verification code.');
            return;
        }
        setIsLoading(true);
        try {
            await signIn('resend-otp', { email: email.trim(), code: code.trim() });
            // On success, ConvexAuthProvider updates isAuthenticated automatically.
            // The (public)/_layout.tsx will redirect to (auth).
        } catch (err: any) {
            console.error(err);
            Alert.alert('Error', 'Invalid code. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <ThemedView style={styles.container}>
            <SafeAreaView style={styles.safeArea}>
                <View style={styles.heroSection}>
                    <ThemedText type="title" style={styles.title}>
                        Homie Squad
                    </ThemedText>
                    <ThemedText style={styles.subtitle}>
                        Are you ready to vibe?
                    </ThemedText>
                </View>

                <View style={styles.authSection}>
                    {step === 'email' ? (
                        <>
                            <ThemedText style={styles.label}>
                                Enter your email to sign in
                            </ThemedText>
                            <TextInput
                                style={styles.input}
                                value={email}
                                onChangeText={setEmail}
                                placeholder="you@example.com"
                                placeholderTextColor="#888"
                                keyboardType="email-address"
                                autoCapitalize="none"
                                autoCorrect={false}
                                editable={!isLoading}
                            />
                            {isLoading ? (
                                <ActivityIndicator size="small" color="#007AFF" />
                            ) : (
                                <Button
                                    title="Send Code"
                                    color="#007AFF"
                                    onPress={handleSendOTP}
                                />
                            )}
                        </>
                    ) : (
                        <>
                            <ThemedText style={styles.label}>
                                Enter the code sent to {email}
                            </ThemedText>
                            <TextInput
                                style={styles.input}
                                value={code}
                                onChangeText={setCode}
                                placeholder="12345678"
                                placeholderTextColor="#888"
                                keyboardType="number-pad"
                                autoCapitalize="none"
                                editable={!isLoading}
                            />
                            {isLoading ? (
                                <ActivityIndicator size="small" color="#007AFF" />
                            ) : (
                                <>
                                    <Button
                                        title="Verify Code"
                                        color="#007AFF"
                                        onPress={handleVerifyOTP}
                                    />
                                    <Button
                                        title="Back"
                                        color="#888"
                                        onPress={() => {
                                            setStep('email');
                                            setCode('');
                                        }}
                                    />
                                </>
                            )}
                        </>
                    )}
                </View>

                <View style={styles.divider}>
                    <View style={styles.dividerLine} />
                    <ThemedText style={styles.dividerText}>or</ThemedText>
                    <View style={styles.dividerLine} />
                </View>

                <View style={styles.authSection}>
                    {isLoading ? (
                        <ActivityIndicator size="small" color="#007AFF" />
                    ) : (
                        <Button
                            title="Sign in with Google"
                            color="#DB4437"
                            onPress={handleGoogleSignIn}
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
        fontSize: 40,
        fontWeight: 'bold',
    },
    subtitle: {
        fontSize: 18,
        color: '#666',
        marginTop: 10,
    },
    authSection: {
        paddingHorizontal: 20,
        gap: Spacing.three,
    },
    label: {
        fontSize: 16,
        textAlign: 'center',
        marginBottom: Spacing.two,
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
    divider: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 20,
        gap: Spacing.two,
    },
    dividerLine: {
        flex: 1,
        height: 1,
        backgroundColor: '#ddd',
    },
    dividerText: {
        fontSize: 14,
        color: '#888',
    },
});
