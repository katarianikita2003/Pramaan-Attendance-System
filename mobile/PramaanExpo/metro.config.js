// mobile/PramaanExpo/metro.config.js
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Add support for various file extensions
config.resolver.sourceExts = [...config.resolver.sourceExts, 'js', 'jsx', 'ts', 'tsx', 'json'];

// Ensure proper module resolution
config.resolver.resolverMainFields = ['react-native', 'browser', 'main'];

// Add any problematic node modules that need special handling
config.resolver.extraNodeModules = {
  ...config.resolver.extraNodeModules,
};

module.exports = config;