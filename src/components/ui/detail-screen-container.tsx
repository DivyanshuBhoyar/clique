import { type ReactNode } from 'react';
import { KeyboardAvoidingView, Platform, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { type LucideIcon } from 'lucide-react-native';

import { ThemedView } from '@/components/themed-view';
import { ScreenHeader } from '@/components/ui/screen-header';

interface DetailScreenContainerProps {
    title: string;
    children: ReactNode;
    onBack: () => void;
    rightIcon?: LucideIcon;
    onRightPress?: () => void;
}

export function DetailScreenContainer({
    title,
    children,
    onBack,
    rightIcon,
    onRightPress,
}: DetailScreenContainerProps) {
    return (
        <ThemedView style={styles.container}>
            <SafeAreaView style={styles.safeArea} edges={[]}>
                <ScreenHeader
                    title={title}
                    onBack={onBack}
                    rightIcon={rightIcon}
                    onRightPress={onRightPress}
                />
                <KeyboardAvoidingView
                    behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                    style={styles.flex}
                >
                    {children}
                </KeyboardAvoidingView>
            </SafeAreaView>
        </ThemedView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    safeArea: { flex: 1 },
    flex: { flex: 1 },
});
