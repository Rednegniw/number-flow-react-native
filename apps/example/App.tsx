import { useFonts } from "expo-font";
import { StatusBar } from "expo-status-bar";
import { type ComponentType, useCallback } from "react";
import { ActivityIndicator, FlatList, Text, View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaView } from "react-native-safe-area-context";
import { Clock12hDemo } from "./src/demos/Clock12hDemo";
import { Clock24hDemo } from "./src/demos/Clock24hDemo";
import { ComparisonDemo } from "./src/demos/ComparisonDemo";
import { ContinuousDemo } from "./src/demos/ContinuousDemo";
import { ContinuousTimeDemo } from "./src/demos/ContinuousTimeDemo";
import { CountdownDemo } from "./src/demos/CountdownDemo";
import { DecimalDemo } from "./src/demos/DecimalDemo";
import { EdgeCaseDemo } from "./src/demos/EdgeCaseDemo";
import { FullClockDemo } from "./src/demos/FullClockDemo";
import { IntegerDemo } from "./src/demos/IntegerDemo";
import { ScientificDemo } from "./src/demos/ScientificDemo";
import { ScrubbingDemo } from "./src/demos/ScrubbingDemo";
import { SmallDecimalDemo } from "./src/demos/SmallDecimalDemo";

interface DemoItem {
  key: string;
  Component: ComponentType;
}

const DEMOS: DemoItem[] = [
  { key: "scrubbing", Component: ScrubbingDemo },
  { key: "scientific", Component: ScientificDemo },
  { key: "comparison", Component: ComparisonDemo },
  { key: "continuous", Component: ContinuousDemo },
  { key: "continuous-time", Component: ContinuousTimeDemo },
  { key: "decimal", Component: DecimalDemo },
  { key: "integer", Component: IntegerDemo },
  { key: "small-decimal", Component: SmallDecimalDemo },
  { key: "clock-24h", Component: Clock24hDemo },
  { key: "clock-12h", Component: Clock12hDemo },
  { key: "countdown", Component: CountdownDemo },
  { key: "full-clock", Component: FullClockDemo },
  { key: "edge-case", Component: EdgeCaseDemo },
];

const renderItem = ({ item }: { item: DemoItem }) => (
  <View style={{ paddingHorizontal: 20 }}>
    <item.Component />
  </View>
);

const ListHeader = () => (
  <Text
    style={{
      fontSize: 24,
      fontWeight: "700",
      color: "#000",
      textAlign: "center",
      paddingHorizontal: 20,
    }}
  >
    number-flow-react-native
  </Text>
);

export default function App() {
  const [fontsLoaded] = useFonts({
    "SpaceMono-Regular": require("./assets/fonts/SpaceMono-Regular.ttf"),
  });

  const keyExtractor = useCallback((item: DemoItem) => item.key, []);

  if (!fontsLoaded) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#fff" }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
    <SafeAreaView style={{ flex: 1, backgroundColor: "#fff" }}>
      <FlatList
        contentContainerStyle={{
          paddingTop: 20,
          paddingBottom: 40,
          gap: 24,
        }}
        data={DEMOS}
        keyExtractor={keyExtractor}
        ListHeaderComponent={ListHeader}
        renderItem={renderItem}
        showsVerticalScrollIndicator={false}
      />
      <StatusBar style="auto" />
    </SafeAreaView>
    </GestureHandlerRootView>
  );
}
