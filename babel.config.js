module.exports = function(api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    // Reanimated 4 moved the worklet Babel transform into react-native-worklets.
    // This replaces the old 'react-native-reanimated/plugin' and must stay last.
    plugins: ['react-native-worklets/plugin']
  };
};
