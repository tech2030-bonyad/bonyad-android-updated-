const path = require('path');
const { getDefaultConfig } = require('expo/metro-config');
const { withNativeWind } = require('nativewind/metro');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

const reanimatedValidateShim = path.resolve(__dirname, 'src/shims/reanimatedValidateWorkletsStub.js');

const prevResolveRequest = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (
    moduleName === 'react-native-reanimated/scripts/validate-worklets-version' ||
    moduleName.endsWith('/react-native-reanimated/scripts/validate-worklets-version')
  ) {
    return { filePath: reanimatedValidateShim, type: 'sourceFile' };
  }
  if (typeof prevResolveRequest === 'function') {
    return prevResolveRequest(context, moduleName, platform);
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = withNativeWind(config, { input: './global.css' });
