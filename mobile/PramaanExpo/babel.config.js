// mobile/PramaanExpo/babel.config.js
module.exports = function(api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      // Add any required plugins here
      // 'react-native-reanimated/plugin' // Uncomment if using reanimated
    ],
  };
};