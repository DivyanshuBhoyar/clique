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
import { Radius, Shadows, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type Step = 'email' | 'otp';

export default function SignInScreen() {
    const { signIn } = useAuthActions();
    const theme = useTheme();

    const [step, setStep] = useState<Step>('email');
    const [email, setEmail] = useState('');
    const [code, setCode] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleGoogleSignIn = async () => {
        const isMobile = Platform.OS === 'ios' || Platform.OS === 'android';
        if (!isMobile) {
            void signIn('google');
            return;
        }
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
                <View style={[styles.heroSection, {
                    backgroundColor: theme.accentSoft,
                    borderColor: theme.outline,
                    shadowColor: theme.shadow,
                    shadowOffset: Shadows.sm.offset,
                    shadowOpacity: Shadows.sm.opacity,
                    shadowRadius: Shadows.sm.radius,
                }]}>
                    <ThemedText type="title" style={{ textAlign: 'center' }}>
                        Homie Squad
                    </ThemedText>
                    <ThemedText type="small" themeColor="textSecondary" style={{ marginTop: Spacing.sm }}>
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
                                style={[styles.input, { color: theme.text, borderColor: theme.outline, backgroundColor: theme.inputBackground }]}
                                value={email}
                                onChangeText={setEmail}
                                placeholder="you@example.com"
                                placeholderTextColor={theme.textTertiary}
                                keyboardType="email-address"
                                autoCapitalize="none"
                                autoCorrect={false}
                                editable={!isLoading}
                            />
                            {isLoading ? (
                                <ActivityIndicator size="small" color={theme.accent} />
                            ) : (
                                <Button title="Send Code" color={theme.accent} onPress={handleSendOTP} />
                            )}
                        </>
                    ) : (
                        <>
                            <ThemedText style={styles.label}>
                                Enter the code sent to {email}
                            </ThemedText>
                            <TextInput
                                style={[styles.input, { color: theme.text, borderColor: theme.outline, backgroundColor: theme.inputBackground }]}
                                value={code}
                                onChangeText={setCode}
                                placeholder="12345678"
                                placeholderTextColor={theme.textTertiary}
                                keyboardType="number-pad"
                                autoCapitalize="none"
                                editable={!isLoading}
                            />
                            {isLoading ? (
                                <ActivityIndicator size="small" color={theme.accent} />
                            ) : (
                                <>
                                    <Button title="Verify Code" color={theme.accent} onPress={handleVerifyOTP} />
                                    <Button title="Back" color={theme.textTertiary} onPress={() => { setStep('email'); setCode(''); }} />
                                </>
                            )}
                        </>
                    )}
                </View>

                <View style={styles.divider}>
                    <View style={[styles.dividerLine, { backgroundColor: theme.outlineLight }]} />
                    <ThemedText type="small" themeColor="textTertiary">or</ThemedText>
                    <View style={[styles.dividerLine, { backgroundColor: theme.outlineLight }]} />
                </View>

                <View style={styles.authSection}>
                    {isLoading ? (
                        <ActivityIndicator size="small" color={theme.accent} />
                    ) : (
                        <Button title="Sign in with Google" color="#DB4437" onPress={handleGoogleSignIn} />
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
        paddingHorizontal: Spacing.xxl,
        justifyContent: 'center',
        gap: Spacing.lg,
    },
    heroSection: {
        alignItems: 'center',
        marginBottom: Spacing.huge,
        paddingVertical: Spacing.xxl,
        borderRadius: Radius.lg,
        borderWidth: 2,
    },
    authSection: {
        paddingHorizontal: Spacing.xl,
        gap: Spacing.lg,
    },
    label: {
        fontSize: 16,
        textAlign: 'center',
        marginBottom: Spacing.sm,
    },
    input: {
        borderWidth: 2,
        borderRadius: Radius.md,
        padding: Spacing.lg,
        fontSize: 18,
        textAlign: 'center',
    },
    divider: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: Spacing.xl,
        gap: Spacing.sm,
    },
    dividerLine: {
        flex: 1,
        height: 1,
    },
});
