import * as ImagePicker from 'expo-image-picker';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import { useMutation } from 'convex/react';
import { useCallback, useState } from 'react';
import { Alert } from 'react-native';

import { api } from '@/convex/_generated/api';
import { Id } from '@/convex/_generated/dataModel';

// Max dimension for the longest side — keeps photos sharp but not wasteful
const MAX_DIMENSION = 1600;
// JPEG quality 0.8 is a good sweet spot for photos from a phone camera
const JPEG_QUALITY = 0.8;

interface UseImageUploadResult {
    // The URI of the image the user selected (for showing a preview before upload)
    previewUri: string | null;
    // Whether an upload is in progress
    uploading: boolean;
    // Opens the picker, processes the image, uploads to Convex, returns the storageId
    pickAndUpload: () => Promise<Id<"_storage"> | null>;
    // Clear the preview (e.g. after submission or cancellation)
    reset: () => void;
}

export function useImageUpload(): UseImageUploadResult {
    const [previewUri, setPreviewUri] = useState<string | null>(null);
    const [uploading, setUploading] = useState(false);
    const generateUploadUrl = useMutation(api.memories.generateUploadUrl);

    const pickAndUpload = useCallback(async (): Promise<Id<"_storage"> | null> => {
        // Step 1: Request permission to access the photo library
        // On iOS this shows a system prompt the first time. On Android, permission is
        // usually granted automatically for READ_EXTERNAL_STORAGE on older versions,
        // but Android 13+ uses granular media permissions.
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
            Alert.alert('Permission needed', 'Please grant photo library access to upload images.');
            return null;
        }

        // Step 2: Launch the picker
        // We use launchImageLibraryAsync (camera roll) rather than launchCameraAsync.
        // `allowsEditing: true` lets the user crop the image before we process it.
        const pickerResult = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'],
            allowsEditing: true,
            quality: 1, // We'll compress ourselves for more control
        });

        if (pickerResult.canceled || !pickerResult.assets?.[0]) {
            return null;
        }

        const pickedAsset = pickerResult.assets[0];

        // Step 3: Resize and compress
        // The new SDK 55 API uses a chainable context pattern:
        //   ImageManipulator.manipulate(uri) → creates a manipulation context
        //   .resize({ width }) → schedules a resize (one dimension preserves aspect ratio)
        //   .renderAsync() → executes all scheduled operations, returns an ImageRef
        //   .saveAsync({ compress, format }) → saves to disk, returns { uri, width, height }
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

            // Show preview immediately (uses the processed image URI)
            setPreviewUri(manipulated.uri);

            // Step 4: Get a short-lived upload URL from Convex
            // Convex storage generates a pre-signed URL that we POST the file to.
            const uploadUrl = await generateUploadUrl();

            // Step 5: POST the image file to the upload URL
            // `manipulated.uri` is a local file URI (e.g. file:///data/...).
            // We read it as a Blob and send it via fetch — Convex expects the
            // request body to be the raw file bytes.
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

            // Convex returns { storageId: "..." } as JSON
            const { storageId } = await uploadResponse.json();
            return storageId as Id<"_storage">;
        } catch (error) {
            console.error('[useImageUpload] Upload error:', error);
            const message = error instanceof Error ? error.message : 'Could not upload the image. Please try again.';
            Alert.alert('Upload failed', message);
            setPreviewUri(null);
            return null;
        } finally {
            setUploading(false);
        }
    }, [generateUploadUrl]);

    const reset = useCallback(() => {
        setPreviewUri(null);
    }, []);

    return { previewUri, uploading, pickAndUpload, reset };
}
