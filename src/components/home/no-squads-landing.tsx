import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';

import { AuthHeroCard } from '@/components/auth/auth-hero-card';
import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing, Typography } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

interface SquadJoinFormProps {
    squadName: string;
    password: string;
    nickname: string;
    isJoining: boolean;
    onCancel: () => void;
    onChangeSquadName: (value: string) => void;
    onChangePassword: (value: string) => void;
    onChangeNickname: (value: string) => void;
    onSubmit: () => void;
}

export function SquadJoinForm({
    squadName,
    password,
    nickname,
    isJoining,
    onCancel,
    onChangeSquadName,
    onChangePassword,
    onChangeNickname,
    onSubmit,
}: SquadJoinFormProps) {
    const theme = useTheme();
    const fields = [
        { label: 'Space name', value: squadName, setter: onChangeSquadName, placeholder: 'e.g. Weekend Warriors', secure: false },
        { label: 'Password', value: password, setter: onChangePassword, placeholder: 'Secret password', secure: true },
        { label: 'Your Nickname', value: nickname, setter: onChangeNickname, placeholder: 'What should we call you?', secure: false },
    ];
    return (
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
            <View style={[styles.joinCard, { backgroundColor: theme.surface, borderColor: theme.outline }]}>
                <ThemedText type="bodyBold" style={styles.joinCardTitle}>Join a Squad 🔑</ThemedText>
                {fields.map(({ label, value, setter, placeholder, secure }) => (
                    <View key={label} style={styles.fieldGroup}>
                        <ThemedText type="smallBold">{label}</ThemedText>
                        <TextInput
                            style={[styles.joinInput, { color: theme.text, borderColor: theme.outline, backgroundColor: theme.background }]}
                            value={value}
                            onChangeText={setter}
                            placeholder={placeholder}
                            placeholderTextColor={theme.placeholder}
                            secureTextEntry={secure}
                        />
                    </View>
                ))}
                <View style={styles.joinActions}>
                    <Pressable onPress={onCancel} hitSlop={8}>
                        <ThemedText type="small" themeColor="textSecondary">Cancel</ThemedText>
                    </Pressable>
                    <Pressable
                        style={[styles.joinBtn, { backgroundColor: theme.accent, borderColor: theme.outline }]}
                        onPress={onSubmit}
                        disabled={isJoining}
                    >
                        <ThemedText type="bodyBold" style={{ color: theme.text }}>
                            {isJoining ? 'Joining…' : 'Join!'}
                        </ThemedText>
                    </Pressable>
                </View>
            </View>
        </KeyboardAvoidingView>
    );
}

interface NoSquadsLandingProps {
    showJoinForm: boolean;
    squadName: string;
    password: string;
    nickname: string;
    isJoining: boolean;
    onCreateSquad: () => void;
    onShowJoinForm: () => void;
    onHideJoinForm: () => void;
    onChangeSquadName: (value: string) => void;
    onChangePassword: (value: string) => void;
    onChangeNickname: (value: string) => void;
    onSubmitJoin: () => void;
    onSignOut: () => void;
}

export function NoSquadsLanding({
    showJoinForm,
    squadName,
    password,
    nickname,
    isJoining,
    onCreateSquad,
    onShowJoinForm,
    onHideJoinForm,
    onChangeSquadName,
    onChangePassword,
    onChangeNickname,
    onSubmitJoin,
    onSignOut,
}: NoSquadsLandingProps) {
    const theme = useTheme();

    return (
        <ScrollView
            contentContainerStyle={[styles.scrollContent, styles.centered]}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
        >
            <AuthHeroCard emoji="🏠" title="Clique" subtitle="your cozy little corner ✨" />

            <Pressable
                style={[styles.bigBtn, { backgroundColor: theme.accent, borderColor: theme.outline }]}
                onPress={onCreateSquad}
            >
                <ThemedText style={styles.bigBtnEmoji}>🏠</ThemedText>
                <ThemedText type="bodyBold">Create a New Space</ThemedText>
            </Pressable>

            {!showJoinForm ? (
                <Pressable
                    style={[styles.bigBtn, { backgroundColor: theme.surface, borderColor: theme.outline }]}
                    onPress={onShowJoinForm}
                >
                    <ThemedText style={styles.bigBtnEmoji}>🔑</ThemedText>
                    <ThemedText type="bodyBold">Join Space by Name</ThemedText>
                </Pressable>
            ) : (
                <SquadJoinForm
                    squadName={squadName}
                    password={password}
                    nickname={nickname}
                    isJoining={isJoining}
                    onCancel={onHideJoinForm}
                    onChangeSquadName={onChangeSquadName}
                    onChangePassword={onChangePassword}
                    onChangeNickname={onChangeNickname}
                    onSubmit={onSubmitJoin}
                />
            )}

            <Pressable onPress={onSignOut} hitSlop={8} style={styles.signOutBtn}>
                <ThemedText type="small" themeColor="textSecondary">Sign out</ThemedText>
            </Pressable>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    scrollContent: {
        paddingBottom: 100,
        gap: Spacing.xl,
    },
    centered: {
        paddingHorizontal: Spacing.xl,
        justifyContent: 'center',
        flexGrow: 1,
        gap: Spacing.md,
    },
    bigBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: Spacing.sm,
        borderWidth: 2,
        borderRadius: Radius.lg,
        paddingVertical: Spacing.lg,
    },
    bigBtnEmoji: {
        fontSize: Typography.subtitle,
        lineHeight: Typography.subtitle * 1.25,
    },
    signOutBtn: { alignSelf: 'center', paddingVertical: Spacing.sm },
    joinCard: {
        borderWidth: 2,
        borderRadius: Radius.lg,
        padding: Spacing.xl,
        gap: Spacing.md,
    },
    joinCardTitle: {
        marginBottom: Spacing.sm,
    },
    fieldGroup: {
        gap: 4,
    },
    joinInput: {
        borderWidth: 2,
        borderRadius: Radius.lg,
        paddingHorizontal: Spacing.lg,
        paddingVertical: Spacing.sm,
        fontSize: Typography.body,
    },
    joinActions: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: Spacing.xs,
    },
    joinBtn: {
        borderWidth: 2,
        borderRadius: Radius.full,
        paddingHorizontal: Spacing.xl,
        paddingVertical: Spacing.sm,
    },
});
