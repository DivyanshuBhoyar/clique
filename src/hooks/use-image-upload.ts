import { useMutation } from 'convex/react';
import { File as ExpoFile } from 'expo-file-system';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';
import { useCallback, useState } from 'react';
import { Alert, Platform } from 'react-native';

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

            let body: ArrayBuffer | Blob;

            if (Platform.OS === 'web') {
                // Web: fetch the data URL and convert to blob
                const resp = await fetch(manipulated.uri);
                body = await resp.blob();
            } else {
                // Native: use expo-file-system's File class which implements Blob
                const file = new ExpoFile(manipulated.uri);
                body = await file.arrayBuffer();
            }

            const uploadResponse = await fetch(uploadUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'image/jpeg' },
                body,
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
