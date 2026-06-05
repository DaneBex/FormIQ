// Learn more https://docs.expo.io/guides/customizing-metro
const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// @tensorflow-models/pose-detection eagerly imports all detector backends including
// web/WASM-only packages. Stub them out since we only use MoveNet on React Native.
const WEB_ONLY_STUBS = new Set([
  '@mediapipe/pose',
  '@tensorflow/tfjs-backend-webgpu',
]);

config.resolver = config.resolver || {};
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (WEB_ONLY_STUBS.has(moduleName)) {
    return { type: 'sourceFile', filePath: path.resolve(__dirname, 'src/stubs/web-only.js') };
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
