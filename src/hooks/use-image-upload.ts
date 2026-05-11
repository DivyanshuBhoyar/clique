import * as ImagePicker from 'expo-image-picker';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import { useMutation } from 'convex/react';
import { useCallback, useState } from 'react';
import { Alert } from 'react-native';

import { api } from '@/convex/_generated/api';
import { Id } from '@/convex/_generated/dataModel';

const MAX_DIMENSION = 1600;
const JPEG_QUALITY = 0.8;

interface UseImageUploadResult {
    previewUri: string | null;
    storageId: Id<"_storage"> | null;
    uploading: boolean;
    pickAndUpload: () => Promise<Id<"_storage"> | null>;
    reset: () => void;
}

export function useImageUpload(): UseImageUploadResult {
    const [previewUri, setPreviewUri] = useState<string | null>(null);
    const [storageId, setStorageId] = useState<Id<"_storage"> | null>(null);
    const [uploading, setUploading] = useState(false);
    const generateUploadUrl = useMutation(api.memories.generateUploadUrl);

    const pickAndUpload = useCallback(async (): Promise<Id<"_storage"> | null> => {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
            Alert.alert('Permission needed', 'Please grant photo library access to upload images.');
            return null;
        }

        const pickerResult = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'],
            allowsEditing: true,
            quality: 1,
        });

        if (pickerResult.canceled || !pickerResult.assets?.[0]) {
            return null;
        }

        const pickedAsset = pickerResult.assets[0];

        try {
            setUploading(true);

            const context = ImageManipulator.manipulate(pickedAsset.uri);

            if (pickedAsset.width > MAX_DIMENSION || pickedAsset.height > MAX_DIMENSION) {
                context.resize({ width: MAX_DIMENSION });
            }

            const imageRef = await context.renderAsync();
            const manipulated = await imageRef.saveAsync({
                compress: JPEG_QUALITY,
                format: SaveFormat.JPEG,
            });

            setPreviewUri(manipulated.uri);

            const uploadUrl = await generateUploadUrl();

            const fileResponse = await fetch(manipulated.uri);
            const blob = await fileResponse.blob();

            const uploadResponse = await fetch(uploadUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'image/jpeg' },
                body: blob,
            });

            if (!uploadResponse.ok) {
                throw new Error(`Upload failed: ${uploadResponse.status}`);
            }

            const { storageId: uploadedId } = await uploadResponse.json();
            const id = uploadedId as Id<"_storage">;
            setStorageId(id);
            return id;
        } catch (error) {
            console.error('[useImageUpload] Upload error:', error);
            const message = error instanceof Error ? error.message : 'Could not upload the image. Please try again.';
            Alert.alert('Upload failed', message);
            setPreviewUri(null);
            setStorageId(null);
            return null;
        } finally {
            setUploading(false);
        }
    }, [generateUploadUrl]);

    const reset = useCallback(() => {
        setPreviewUri(null);
        setStorageId(null);
    }, []);

    return { previewUri, storageId, uploading, pickAndUpload, reset };
}
