export const SANDPACK_DEPENDENCIES: Record<string, string> = {
  "react-native-web": "~0.19.13",
  "react-native-reanimated": "~4.1.0",
  "react-native-worklets": "~0.7.0",
  "number-flow-react-native": "0.1.10",
};

export const VITE_CONFIG_CODE = `import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const extensions = [
  ".web.tsx", ".tsx", ".web.ts", ".ts",
  ".web.jsx", ".jsx", ".web.js", ".js",
  ".css", ".json", ".mjs",
];

export default defineConfig({
  plugins: [react()],
  define: {
    global: "window",
    __DEV__: JSON.stringify(true),
    "process.env.NODE_ENV": JSON.stringify("development"),
    "process.env": JSON.stringify({ NODE_ENV: "development" }),
  },
  resolve: {
    extensions,
    alias: { "react-native": "react-native-web" },
  },
  optimizeDeps: {
    esbuildOptions: {
      resolveExtensions: extensions,
      jsx: "automatic",
      loader: { ".js": "jsx" },
      define: {
        global: "window",
        __DEV__: "true",
        "process.env.NODE_ENV": '"development"',
        "process.env": '{"NODE_ENV":"development"}',
      },
    },
  },
});
`;

export const ENTRY_CODE = `import { AppRegistry } from "react-native";
import App from "./App.tsx";

AppRegistry.registerComponent("App", () => App);
AppRegistry.runApplication("App", {
  rootTag: document.getElementById("root"),
});
`;

export const EXAMPLE_UI_CODE = `import { Pressable, Text, View } from "react-native";

export function ExampleLayout({ children }) {
  return (
    <View style={{
      minHeight: "100vh",
      backgroundColor: "#0a0a0a",
      alignItems: "center",
      justifyContent: "center",
      gap: 24,
      padding: 32,
    }}>
      {children}
    </View>
  );
}

export function Button({ title, onPress }) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: "rgba(255,255,255,0.25)",
        backgroundColor: pressed ? "rgba(255,255,255,0.1)" : "transparent",
      })}
    >
      <Text style={{ color: "#fff", fontSize: 15, fontWeight: "500" }}>
        {title}
      </Text>
    </Pressable>
  );
}
`;

export const INDEX_HTML_CODE = `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/index.jsx"></script>
  </body>
</html>
`;
