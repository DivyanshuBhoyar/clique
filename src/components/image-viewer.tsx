import { Image } from 'expo-image';
import { Modal, Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { Weight, Typography } from '@/constants/theme';

interface ImageViewerProps {
    visible: boolean;
    uri: string | null;
    onClose: () => void;
}

export function ImageViewer({ visible, uri, onClose }: ImageViewerProps) {
    const { width: screenWidth, height: screenHeight } = useWindowDimensions();

    return (
        <Modal visible={visible} animationType="fade" presentationStyle="overFullScreen" onRequestClose={onClose}>
            <View style={styles.overlay}>
                <SafeAreaView style={styles.safeArea}>
                    <Pressable onPress={onClose} style={styles.closeBtn}>
                        <ThemedText style={styles.closeText}>Done</ThemedText>
                    </Pressable>

                    {uri && (
                        <Pressable style={styles.imageArea} onPress={onClose}>
                            <Image
                                source={{ uri }}
                                style={{ width: screenWidth, height: screenHeight - 60 }}
                                contentFit="contain"
                            />
                        </Pressable>
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
});
