import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import type { ImagePickerAsset } from 'expo-image-picker';

export type ImageUploadTarget = 'chatImage' | 'memoryCover' | 'memoryPhoto' | 'avatar';
export type ImageUploadResolution = 'standard' | 'high';

interface ImageUploadResolutionOption {
  label: string;
  shortLabel: string;
  maxWidth: number;
}

interface ImageUploadPreset {
  label: string;
  cropLabel: string;
  aspect: readonly [number, number];
  defaultResolution: ImageUploadResolution;
  quality: number;
  resolutions: Record<ImageUploadResolution, ImageUploadResolutionOption>;
}

export const IMAGE_UPLOAD_PRESETS = {
  chatImage: {
    label: 'Chat photo',
    cropLabel: 'Photo',
    aspect: [4, 3],
    defaultResolution: 'standard',
    quality: 0.8,
    resolutions: {
      standard: { label: 'Standard · 1280px', shortLabel: '1280px', maxWidth: 1280 },
      high: { label: 'High · 1600px', shortLabel: '1600px', maxWidth: 1600 },
    },
  },
  memoryCover: {
    label: 'Memory cover',
    cropLabel: 'Wide',
    aspect: [16, 9],
    defaultResolution: 'standard',
    quality: 0.82,
    resolutions: {
      standard: { label: 'Standard · 1440px', shortLabel: '1440px', maxWidth: 1440 },
      high: { label: 'High · 1920px', shortLabel: '1920px', maxWidth: 1920 },
    },
  },
  memoryPhoto: {
    label: 'Memory photo',
    cropLabel: 'Scrapbook',
    aspect: [4, 3],
    defaultResolution: 'standard',
    quality: 0.8,
    resolutions: {
      standard: { label: 'Standard · 1280px', shortLabel: '1280px', maxWidth: 1280 },
      high: { label: 'High · 1600px', shortLabel: '1600px', maxWidth: 1600 },
    },
  },
  avatar: {
    label: 'Profile photo',
    cropLabel: 'Square',
    aspect: [1, 1],
    defaultResolution: 'standard',
    quality: 0.82,
    resolutions: {
      standard: { label: 'Standard · 512px', shortLabel: '512px', maxWidth: 512 },
      high: { label: 'High · 768px', shortLabel: '768px', maxWidth: 768 },
    },
  },
} satisfies Record<ImageUploadTarget, ImageUploadPreset>;

interface PreprocessImageUploadArgs {
  asset: ImagePickerAsset;
  target: ImageUploadTarget;
  resolution: ImageUploadResolution;
}

interface PreprocessedImageUpload {
  uri: string;
  width: number;
  height: number;
  contentType: 'image/jpeg';
}

export function getImageUploadPresetSummary(target: ImageUploadTarget): string {
  const preset = IMAGE_UPLOAD_PRESETS[target];
  const [aspectWidth, aspectHeight] = preset.aspect;
  const resolution = preset.resolutions[preset.defaultResolution];

  return `${preset.cropLabel} crop · ${aspectWidth}:${aspectHeight} · ${resolution.shortLabel}`;
}

export function getImageUploadPickerAspect(target: ImageUploadTarget): [number, number] {
  const [width, height] = IMAGE_UPLOAD_PRESETS[target].aspect;
  return [width, height];
}

export async function preprocessImageUpload({
  asset,
  target,
  resolution,
}: PreprocessImageUploadArgs): Promise<PreprocessedImageUpload> {
  const preset = IMAGE_UPLOAD_PRESETS[target];
  const resolutionOption = preset.resolutions[resolution];
  const context = ImageManipulator.manipulate(asset.uri);
  const sourceWidth = Math.max(0, asset.width);
  const sourceHeight = Math.max(0, asset.height);

  if (sourceWidth > 0 && sourceHeight > 0) {
    const crop = getCenteredAspectCrop(sourceWidth, sourceHeight, preset.aspect);
    context.crop(crop);

    if (crop.width > resolutionOption.maxWidth) {
      context.resize({ width: resolutionOption.maxWidth });
    }
  }

  const imageRef = await context.renderAsync();
  const image = await imageRef.saveAsync({
    compress: preset.quality,
    format: SaveFormat.JPEG,
  });

  return {
    uri: image.uri,
    width: image.width,
    height: image.height,
    contentType: 'image/jpeg',
  };
}

function getCenteredAspectCrop(
  sourceWidth: number,
  sourceHeight: number,
  [targetWidth, targetHeight]: readonly [number, number]
) {
  const sourceRatio = sourceWidth / sourceHeight;
  const targetRatio = targetWidth / targetHeight;

  if (sourceRatio > targetRatio) {
    const width = sourceHeight * targetRatio;
    return toSafeCropRect(
      {
        originX: (sourceWidth - width) / 2,
        originY: 0,
        width,
        height: sourceHeight,
      },
      sourceWidth,
      sourceHeight
    );
  }

  const height = sourceWidth / targetRatio;
  return toSafeCropRect(
    {
      originX: 0,
      originY: (sourceHeight - height) / 2,
      width: sourceWidth,
      height,
    },
    sourceWidth,
    sourceHeight
  );
}

function toSafeCropRect(
  rect: { originX: number; originY: number; width: number; height: number },
  sourceWidth: number,
  sourceHeight: number
) {
  const originX = Math.max(0, Math.floor(rect.originX));
  const originY = Math.max(0, Math.floor(rect.originY));
  const width = Math.max(1, Math.min(Math.round(rect.width), sourceWidth - originX));
  const height = Math.max(1, Math.min(Math.round(rect.height), sourceHeight - originY));

  return { originX, originY, width, height };
}