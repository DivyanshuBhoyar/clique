/**
 * SignInScreen — authentication entry point.
 *
 * Design: large hero card (warm accent soft bg), email-OTP two-step
 * flow, divider, Google sign-in button.
 *
 * Visual approach:
 *  ┌────────────────────────────────────────┐
 *  │  🏠                                    │  ← large emoji
 *  │  Clique Cove                          │  ← title
 *  │  your cozy corner ✨                  │  ← subtitle
 *  └────────────────────────────────────────┘  ← Radius.xl yellow card
 *
 *  [ email input (Radius.lg, 2px border) ]
 *  [ Send Code ← yellow full-width CTA   ]
 *    ──── or ────
 *  [ G  Continue with Google             ]
 */
import { useAuthActions } from '@convex-dev/auth/react';
import Constants from 'expo-constants';
import * as WebBrowser from 'expo-web-browser';
import { ArrowLeft, Mail, ShieldCheck } from 'lucide-react-native';
import { useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    KeyboardAvoidingView,
    Platform,
    Pressable,
    StyleSheet,
    TextInput,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AuthHeroCard } from '@/components/auth/auth-hero-card';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Radius, Shadows, Spacing, Typography, Weight } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useToast } from '@/hooks/use-toast';

type Step = 'email' | 'otp';

export default function SignInScreen() {
    const { signIn } = useAuthActions();
    const theme = useTheme();
    const toast = useToast();

    const [step, setStep] = useState<Step>('email');
    const [email, setEmail] = useState('');
    const [code, setCode] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [resendCooldown, setResendCooldown] = useState(0);
    const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

    useEffect(() => {
        if (resendCooldown <= 0) {
            if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
            return;
        }
        if (!timerRef.current) {
            timerRef.current = setInterval(() => {
                setResendCooldown((s) => s - 1);
            }, 1000);
        }
        return () => { if (timerRef.current) clearInterval(timerRef.current); };
    }, [resendCooldown]);

    const handleGoogleSignIn = async () => {
        const isMobile = Platform.OS === 'ios' || Platform.OS === 'android';
        if (!isMobile) {
            void signIn('google');
            return;
        }
        setIsLoading(true);
        try {
            const scheme = Constants.expoConfig?.scheme as string;
            const redirectTo = `${scheme}://`;
            // On React Native, @convex-dev/auth does NOT open the browser itself —
            // it returns the OAuth URL and expects the caller to handle it.
            const result = await signIn('google', { redirectTo });
            if (result?.redirect) {
                const returnUrl = await WebBrowser.openAuthSessionAsync(
                    result.redirect.toString(),
                    redirectTo,
                );
                if (returnUrl.type === 'success') {
                    // Convex redirects back as clique://?code=XXX — exchange the code
                    const code = new URL(returnUrl.url).searchParams.get('code');
                    if (code) {
                        await signIn('google', { code });
                    }
                }
            }
        } catch (err: any) {
            console.error(err);
            toast.error('Google sign-in failed. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleSendOTP = async () => {
        if (!email.trim()) {
            toast.error('Please enter your email address.');
            return;
        }
        setIsLoading(true);
        try {
            await signIn('resend-otp', { email: email.trim() });
            setStep('otp');
            setResendCooldown(30);
        } catch (err: any) {
            console.error(err);
            toast.error('Failed to send code. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleVerifyOTP = async () => {
        if (!code.trim()) {
            toast.error('Please enter the verification code.');
            return;
        }
        setIsLoading(true);
        try {
            await signIn('resend-otp', { email: email.trim(), code: code.trim() });
        } catch (err: any) {
            console.error(err);
            toast.error('Invalid code. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <ThemedView style={styles.container}>
            <SafeAreaView style={styles.safeArea}>
                <KeyboardAvoidingView
                    behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                    style={styles.inner}
                >
                    {/* Hero Card */}
                    <AuthHeroCard emoji="🏠" title="Clique" subtitle="your cozy little corner ✨" />

                    {/* Auth Card */}
                    <View style={[styles.authCard, {
                        backgroundColor: theme.surface,
                        borderColor: theme.outline,
                        shadowColor: theme.shadow,
                        shadowOffset: Shadows.sm.shadowOffset,
                        shadowOpacity: Shadows.sm.shadowOpacity,
                        shadowRadius: Shadows.sm.shadowRadius,
                        elevation: 3,
                    }]}>
                        {step === 'email' ? (
                            <>
                                <View style={styles.authHeader}>
                                    <Mail size={18} color={theme.text} strokeWidth={2} />
                                    <ThemedText type="bodyBold">Sign in with Email</ThemedText>
                                </View>

                                <ThemedText type="small" themeColor="textSecondary" style={styles.authHint}>
                                    We&apos;ll send a one-time code to your inbox
                                </ThemedText>

                                <TextInput
                                    style={[styles.input, {
                                        color: theme.text,
                                        borderColor: theme.outline,
                                        backgroundColor: theme.background,
                                    }]}
                                    value={email}
                                    onChangeText={setEmail}
                                    placeholder="you@example.com"
                                    placeholderTextColor={theme.placeholder}
                                    keyboardType="email-address"
                                    autoCapitalize="none"
                                    autoCorrect={false}
                                    editable={!isLoading}
                                    autoFocus
                                />

                                {isLoading ? (
                                    <ActivityIndicator size="small" color={theme.accent} />
                                ) : (
                                    <Pressable
                                        style={[styles.primaryBtn, { backgroundColor: theme.accent, borderColor: theme.outline }]}
                                        onPress={handleSendOTP}
                                    >
                                        <ThemedText type="bodyBold" style={{ color: theme.text }}>
                                            Send Code →
                                        </ThemedText>
                                    </Pressable>
                                )}
                            </>
                        ) : (
                            <>
                                <View style={styles.authHeader}>
                                    <ShieldCheck size={18} color={theme.text} strokeWidth={2} />
                                    <ThemedText type="bodyBold">Enter your code</ThemedText>
                                </View>

                                <ThemedText type="small" themeColor="textSecondary" style={styles.authHint}>
                                    Sent to {email}
                                </ThemedText>

                                <TextInput
                                    style={[styles.input, styles.otpInput, {
                                        color: theme.text,
                                        borderColor: theme.outline,
                                        backgroundColor: theme.background,
                                        letterSpacing: 8,
                                    }]}
                                    value={code}
                                    onChangeText={setCode}
                                    placeholder="••••••••"
                                    placeholderTextColor={theme.placeholder}
                                    keyboardType="number-pad"
                                    autoCapitalize="none"
                                    editable={!isLoading}
                                    autoFocus
                                />

                                {isLoading ? (
                                    <ActivityIndicator size="small" color={theme.accent} />
                                ) : (
                                    <>
                                        <Pressable
                                            style={[styles.primaryBtn, { backgroundColor: theme.accent, borderColor: theme.outline }]}
                                            onPress={handleVerifyOTP}
                                        >
                                            <ThemedText type="bodyBold" style={{ color: theme.text }}>
                                                Verify Code ✓
                                            </ThemedText>
                                        </Pressable>
                                        <Pressable
                                            style={styles.backBtn}
                                            onPress={() => { setStep('email'); setCode(''); }}
                                            hitSlop={8}
                                        >
                                            <ArrowLeft size={14} color={theme.textSecondary} strokeWidth={2} />
                                            <ThemedText type="small" themeColor="textSecondary">
                                                Change email
                                            </ThemedText>
                                        </Pressable>
                                        <Pressable
                                            style={styles.backBtn}
                                            onPress={async () => {
                                                if (resendCooldown > 0) return;
                                                try {
                                                    await signIn('resend-otp', { email: email.trim() });
                                                    setResendCooldown(30);
                                                } catch { /* Alert already handles errors above */ }
                                            }}
                                            disabled={resendCooldown > 0}
                                            hitSlop={8}
                                        >
                                            <ThemedText
                                                type="small"
                                                themeColor={resendCooldown > 0 ? 'textTertiary' : 'textSecondary'}
                                            >
                                                {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : 'Resend code'}
                                            </ThemedText>
                                        </Pressable>
                                    </>
                                )}
                            </>
                        )}
                    </View>

                    {/* Divider */}
                    <View style={styles.divider}>
                        <View style={[styles.dividerLine, { backgroundColor: theme.outlineLight }]} />
                        <ThemedText type="small" themeColor="textTertiary">or</ThemedText>
                        <View style={[styles.dividerLine, { backgroundColor: theme.outlineLight }]} />
                    </View>

                    {/* Google */}
                    {isLoading ? (
                        <ActivityIndicator size="small" color={theme.accent} />
                    ) : (
                        <Pressable
                            style={[styles.googleBtn, {
                                backgroundColor: theme.surface,
                                borderColor: theme.outline,
                                shadowColor: theme.shadow,
                                shadowOffset: Shadows.sm.shadowOffset,
                                shadowOpacity: Shadows.sm.shadowOpacity,
                                shadowRadius: Shadows.sm.shadowRadius,
                                elevation: 2,
                            }]}
                            onPress={handleGoogleSignIn}
                        >
                            <ThemedText style={styles.googleG}>G</ThemedText>
                            <ThemedText type="bodyBold">Continue with Google</ThemedText>
                        </Pressable>
                    )}
                </KeyboardAvoidingView>
            </SafeAreaView>
        </ThemedView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    safeArea: { flex: 1 },
    inner: {
        flex: 1,
        paddingHorizontal: Spacing.xl,
        justifyContent: 'center',
        gap: Spacing.lg,
    },
    authCard: {
        padding: Spacing.xl,
        borderRadius: Radius.xl,
        borderWidth: 2,
        gap: Spacing.md,
    },
    authHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.sm,
    },
    authHint: {
        marginTop: -Spacing.xs,
    },
    input: {
        borderWidth: 2,
        borderRadius: Radius.lg,
        paddingHorizontal: Spacing.lg,
        paddingVertical: Spacing.md,
        fontSize: Typography.body,
    },
    otpInput: {
        textAlign: 'center',
        fontSize: Typography.subtitle,
        fontWeight: Weight.bold,
        paddingVertical: Spacing.lg,
    },
    primaryBtn: {
        borderWidth: 2,
        borderRadius: Radius.full,
        paddingVertical: Spacing.md,
        alignItems: 'center',
    },
    backBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        alignSelf: 'center',
    },
    divider: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.sm,
    },
    dividerLine: { flex: 1, height: 1.5 },
    googleBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: Spacing.sm,
        borderWidth: 2,
        borderRadius: Radius.full,
        paddingVertical: Spacing.md,
    },
    googleG: {
        fontSize: Typography.body,
        fontWeight: Weight.black,
        color: '#DB4437',
    },
});
