const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Enable package.json "exports" field resolution. Required by newer packages
// like @posthog/core that ship subpath exports (e.g. `@posthog/core/surveys`).
config.resolver.unstable_enablePackageExports = true;

module.exports = config;
