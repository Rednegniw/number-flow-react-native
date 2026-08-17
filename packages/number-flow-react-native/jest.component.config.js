/** @type {import('jest').Config} */
module.exports = {
  preset: "react-native",
  roots: ["<rootDir>/src/__tests__/perf"],
  testMatch: ["**/*.test.tsx"],
  setupFilesAfterEnv: ["./jest.component.setup.js"],
  transform: {
    "^.+\\.(js|jsx|ts|tsx)$": ["babel-jest", { configFile: "./babel.jest.config.js" }],
  },
  transformIgnorePatterns: [
    "node_modules/(?!(react-native|@react-native|react-native-reanimated|react-native-worklets|@rednegniw)/)",
  ],
};
