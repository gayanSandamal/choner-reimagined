// Reanimated 4 ships its own jest resolver, and without it the render suites
// fail to load: requiring react-native-reanimated/mock pulls in the native
// `initializers`, runs initializeReanimatedModule() and throws
// "`setCSSEventHandler` is not available in JSReanimated". The resolver's job
// is to hand jest the web builds of those few modules instead.
//
// jest-expo already sets @react-native/jest-preset's resolver and a project
// may only have one, so this picks between them per request rather than
// stacking them. Stacking was the first attempt and it broke image requires
// ("Module \"1\" is missing from the asset registry"), because every asset
// then resolved through a defaultResolver that was no longer jest's own.
//
// Both branches get the original options, so each resolver sees the
// defaultResolver it expects.
const reanimatedResolver = require('react-native-reanimated/jest/resolver');
const reactNativeResolver = require('@react-native/jest-preset/jest/resolver');

module.exports = (request, options) => {
  const isAnimationInternals =
    options.basedir.includes('react-native-reanimated') ||
    options.basedir.includes('react-native-worklets') ||
    request.includes('react-native-worklets');

  return isAnimationInternals
    ? reanimatedResolver(request, options)
    : reactNativeResolver(request, options);
};
