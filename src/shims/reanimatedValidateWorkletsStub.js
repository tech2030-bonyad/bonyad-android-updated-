'use strict';

/**
 * Metro cannot bundle Reanimated's scripts/validate-worklets-version.js (Node semver + fs reads).
 * This stub replaces it at bundle time; native worklets still load from react-native-worklets.
 */
function validateWorkletsVersion() {
  return { ok: true };
}

module.exports = validateWorkletsVersion;
module.exports.default = validateWorkletsVersion;
