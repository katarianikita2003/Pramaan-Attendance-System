const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Add resolver fallback for missing modules
config.resolver.alias = {
  ...config.resolver.alias,
  'react-native-platform-constants': require.resolve('expo-constants'),
};

// Ensure proper asset extensions
config.resolver.assetExts.push('png', 'jpg', 'jpeg', 'svg');

module.exports = config;