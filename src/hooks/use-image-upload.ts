import { useMutation } from 'convex/react';
import { File as ExpoFile } from 'expo-file-system';
import * as ImagePicker from 'expo-image-picker';
import { useCallback, useState } from 'react';
import { Alert, Platform } from 'react-native';

import { api } from '@/convex/_generated/api';
import { Id } from '@/convex/_generated/dataModel';
import {
    getImageUploadPickerAspect,
    IMAGE_UPLOAD_PRESETS,
    preprocessImageUpload,
    type ImageUploadResolution,
    type ImageUploadTarget,
} from '@/lib/image-upload';

interface UseImageUploadOptions {
    target?: ImageUploadTarget;
    promptForResolution?: boolean;
}

interface UseImageUploadResult {
    previewUri: string | null;
    storageId: Id<"_storage"> | null;
    uploading: boolean;
    pickAndUpload: () => Promise<Id<"_storage"> | null>;
    reset: () => void;
}

export function useImageUpload({ target = 'chatImage', promptForResolution = true }: UseImageUploadOptions = {}): UseImageUploadResult {
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

        const resolution = await chooseUploadResolution(target, promptForResolution);
        if (!resolution) {
            return null;
        }

        const pickerResult = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'],
            allowsEditing: true,
            aspect: getImageUploadPickerAspect(target),
            quality: 1,
        });

        if (pickerResult.canceled || !pickerResult.assets?.[0]) {
            return null;
        }

        const pickedAsset = pickerResult.assets[0];

        try {
            setUploading(true);

            const image = await preprocessImageUpload({
                asset: pickedAsset,
                target,
                resolution,
            });

            setPreviewUri(image.uri);

            const uploadUrl = await generateUploadUrl();

            let body: ArrayBuffer | Blob;

            if (Platform.OS === 'web') {
                // Web: fetch the data URL and convert to blob
                const resp = await fetch(image.uri);
                body = await resp.blob();
            } else {
                // Native: use expo-file-system's File class which implements Blob
                const file = new ExpoFile(image.uri);
                body = await file.arrayBuffer();
            }

            const uploadResponse = await fetch(uploadUrl, {
                method: 'POST',
                headers: { 'Content-Type': image.contentType },
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
    }, [generateUploadUrl, promptForResolution, target]);

    const reset = useCallback(() => {
        setPreviewUri(null);
        setStorageId(null);
    }, []);

    return { previewUri, storageId, uploading, pickAndUpload, reset };
}

function chooseUploadResolution(target: ImageUploadTarget, promptForResolution: boolean): Promise<ImageUploadResolution | null> {
    const preset = IMAGE_UPLOAD_PRESETS[target];

    if (!promptForResolution || Platform.OS === 'web') {
        return Promise.resolve(preset.defaultResolution);
    }

    return new Promise((resolve) => {
        let settled = false;
        const settle = (resolution: ImageUploadResolution | null) => {
            if (settled) return;
            settled = true;
            resolve(resolution);
        };

        Alert.alert(
            `${preset.label} size`,
            'Choose upload resolution, then crop your image.',
            [
                { text: 'Cancel', style: 'cancel', onPress: () => settle(null) },
                { text: preset.resolutions.standard.label, onPress: () => settle('standard') },
                { text: preset.resolutions.high.label, onPress: () => settle('high') },
            ],
            { cancelable: true, onDismiss: () => settle(null) }
        );
    });
}
