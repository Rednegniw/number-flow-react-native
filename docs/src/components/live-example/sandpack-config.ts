export const SANDPACK_DEPENDENCIES: Record<string, string> = {
  "react-native-web": "~0.19.13",
  "react-native-reanimated": "~4.1.0",
  "react-native-worklets": "~0.7.0",
  "number-flow-react-native": "^0.2.2",
};

export const VITE_CONFIG_CODE = `import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const extensions = [
  ".web.tsx", ".tsx", ".web.ts", ".ts",
  ".web.jsx", ".jsx", ".web.js", ".js",
  ".css", ".json", ".mjs",
];

export default defineConfig({
  clearScreen: false,
  logLevel: "silent",
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

export const EXAMPLE_UI_CODE = `import { useCallback, useRef, useState } from "react";
import { Animated, Pressable, Text, View } from "react-native";

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
  const scale = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const [ripple, setRipple] = useState({ x: 0, y: 0, size: 0 });
  const layout = useRef({ width: 0, height: 0 });

  const handlePressIn = useCallback((e) => {
    const { locationX, locationY } = e.nativeEvent;
    const { width, height } = layout.current;
    const radius = Math.sqrt(
      Math.max(locationX, width - locationX) ** 2 +
      Math.max(locationY, height - locationY) ** 2
    );

    setRipple({ x: locationX, y: locationY, size: radius * 2 });
    scale.setValue(0);
    opacity.setValue(1);
    Animated.timing(scale, { toValue: 1, duration: 250, useNativeDriver: false }).start();
  }, []);

  const handlePressOut = useCallback(() => {
    Animated.timing(opacity, { toValue: 0, duration: 350, useNativeDriver: false }).start();
  }, []);

  return (
    <Pressable
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      onPress={onPress}
      onLayout={(e) => {
        layout.current = { width: e.nativeEvent.layout.width, height: e.nativeEvent.layout.height };
      }}
      style={{
        overflow: "hidden",
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: "rgba(255,255,255,0.2)",
      }}
    >
      <Animated.View
        pointerEvents="none"
        style={{
          position: "absolute",
          left: ripple.x - ripple.size / 2,
          top: ripple.y - ripple.size / 2,
          width: ripple.size,
          height: ripple.size,
          borderRadius: ripple.size / 2,
          backgroundColor: "rgba(255,255,255,0.15)",
          transform: [{ scale }],
          opacity,
        }}
      />
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
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link href="https://fonts.googleapis.com/css2?family=Google+Sans:wght@400;500;700&family=JetBrains+Mono:wght@400;500;600;700&family=Orbitron:wght@400;500;700;900&display=swap" rel="stylesheet" />
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/index.jsx"></script>
  </body>
</html>
`;
