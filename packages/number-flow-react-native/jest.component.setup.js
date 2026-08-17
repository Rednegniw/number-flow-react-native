/**
 * Per the official Reanimated 4 / worklets testing guides:
 * https://docs.swmansion.com/react-native-reanimated/docs/guides/testing/
 * https://docs.swmansion.com/react-native-worklets/docs/guides/testing
 */
jest.mock("react-native-worklets", () => require("react-native-worklets/src/mock"));

require("react-native-reanimated").setUpTests();
