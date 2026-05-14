import { Image } from 'expo-image';
import { Modal, Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { Typography, Weight } from '@/constants/theme';

interface ImageViewerProps {
    visible: boolean;
    uri: string | null;
    title?: string;
    onClose: () => void;
    onPrevious?: () => void;
    onNext?: () => void;
}

export function ImageViewer({ visible, uri, title, onClose, onPrevious, onNext }: ImageViewerProps) {
    const { width: screenWidth, height: screenHeight } = useWindowDimensions();

    return (
        <Modal visible={visible} animationType="fade" presentationStyle="overFullScreen" onRequestClose={onClose}>
            <View style={styles.overlay}>
                <SafeAreaView style={styles.safeArea}>
                    <View style={styles.topBar}>
                        <ThemedText style={styles.title} numberOfLines={1}>{title ?? ''}</ThemedText>
                        <Pressable onPress={onClose} style={styles.closeBtn}>
                            <ThemedText style={styles.closeText}>Done</ThemedText>
                        </Pressable>
                    </View>

                    {uri && (
                        <Pressable style={styles.imageArea} onPress={onClose}>
                            <Image
                                source={{ uri }}
                                style={{ width: screenWidth, height: screenHeight - 60 }}
                                contentFit="contain"
                            />
                        </Pressable>
                    )}

                    {(onPrevious || onNext) && (
                        <View style={styles.controls}>
                            <Pressable onPress={onPrevious} disabled={!onPrevious} style={[styles.navBtn, !onPrevious && styles.navBtnDisabled]}>
                                <ThemedText style={styles.navText}>← Previous</ThemedText>
                            </Pressable>
                            <Pressable onPress={onNext} disabled={!onNext} style={[styles.navBtn, !onNext && styles.navBtnDisabled]}>
                                <ThemedText style={styles.navText}>Next →</ThemedText>
                            </Pressable>
                        </View>
                    )}
                </SafeAreaView>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: '#000',
    },
    safeArea: {
        flex: 1,
    },
    topBar: {
        minHeight: 44,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingLeft: 16,
    },
    title: {
        flex: 1,
        color: '#fff',
        fontSize: Typography.small,
        fontWeight: Weight.semibold,
    },
    closeBtn: {
        alignSelf: 'flex-end',
        paddingHorizontal: 16,
        paddingVertical: 8,
    },
    closeText: {
        color: '#fff',
        fontSize: Typography.body,
        fontWeight: Weight.semibold,
    },
    imageArea: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    controls: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingBottom: 12,
        gap: 12,
    },
    navBtn: {
        flex: 1,
        minHeight: 44,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 999,
        backgroundColor: 'rgba(255,255,255,0.16)',
    },
    navBtnDisabled: {
        opacity: 0.35,
    },
    navText: {
        color: '#fff',
        fontSize: Typography.small,
        fontWeight: Weight.bold,
    },
});
