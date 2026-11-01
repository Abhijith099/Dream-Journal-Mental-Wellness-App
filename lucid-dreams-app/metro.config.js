const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

const defaultResolveRequest = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (platform === 'web') {
    if (moduleName === 'react-native-vision-camera') {
      return {
        filePath: path.resolve(__dirname, 'mocks/react-native-vision-camera.js'),
        type: 'sourceFile',
      };
    }
    if (moduleName === 'react-native-worklets-core') {
      return {
        filePath: path.resolve(__dirname, 'mocks/react-native-worklets-core.js'),
        type: 'sourceFile',
      };
    }
  }
  if (defaultResolveRequest) {
    return defaultResolveRequest(context, moduleName, platform);
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;

