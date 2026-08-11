/**
 * Babel config used ONLY by jest.component.config.js (named so builder-bob
 * and the ts-jest logic config cannot pick it up).
 */
module.exports = {
  presets: ["module:@react-native/babel-preset"],
  plugins: ["react-native-worklets/plugin"],
};
