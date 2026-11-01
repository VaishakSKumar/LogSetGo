const { withAppBuildGradle } = require('expo/config-plugins');

const BLOCK = `android {
    lint {
        abortOnError false
        checkReleaseBuilds false
    }
`;

/** Lint warnings must not stop a release build. Prebuild regenerates android/, so this is applied there. */
module.exports = function withAndroidLint(config) {
  return withAppBuildGradle(config, (mod) => {
    if (!mod.modResults.contents.includes('checkReleaseBuilds false')) {
      mod.modResults.contents = mod.modResults.contents.replace(/^android\s*\{\s*$/m, BLOCK.trimEnd());
    }
    return mod;
  });
};
