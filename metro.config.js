const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// expo-sqlite web loads wa-sqlite through a bundled WASM asset.
config.resolver.assetExts.push('wasm');

// Fix: @100mslive/react-native-hms has a broken relative require('../../package.json')
// in lib/commonjs/classes/HMSSDK.js that resolves to lib/package.json (doesn't exist).
// Redirect it to the actual package.json at the package root.
const originalResolveRequest = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (
    moduleName === '../../package.json' &&
    context.originModulePath.includes('@100mslive/react-native-hms')
  ) {
    const hmsRoot = path.resolve(__dirname, 'node_modules/@100mslive/react-native-hms');
    return {
      filePath: path.join(hmsRoot, 'package.json'),
      type: 'sourceFile',
    };
  }
  // Fix: @100mslive/hms-video-store bundles its own uuid with a broken wrapper.mjs.
  // Force all uuid imports to resolve from the project root's uuid package.
  if (
    moduleName === 'uuid' &&
    context.originModulePath.includes('@100mslive')
  ) {
    return {
      filePath: path.resolve(__dirname, 'node_modules/uuid/dist/index.js'),
      type: 'sourceFile',
    };
  }
  if (originalResolveRequest) {
    return originalResolveRequest(context, moduleName, platform);
  }
  return context.resolveRequest(context, moduleName, platform);
};

// Required by expo-sqlite web because it uses SharedArrayBuffer.
config.server.enhanceMiddleware = (middleware) => {
  return (req, res, next) => {
    res.setHeader('Cross-Origin-Embedder-Policy', 'credentialless');
    res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
    middleware(req, res, next);
  };
};

module.exports = config;
