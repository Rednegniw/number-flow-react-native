import { useFonts } from "expo-font";
import { StatusBar } from "expo-status-bar";
import { ActivityIndicator, ScrollView, Text, View } from "react-native";
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
import { SmallDecimalDemo } from "./src/demos/SmallDecimalDemo";

export default function App() {
  const [fontsLoaded] = useFonts({
    "SpaceMono-Regular": require("./assets/fonts/SpaceMono-Regular.ttf"),
  });

  if (!fontsLoaded) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#fff" }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#fff" }}>
      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: 20,
          paddingTop: 20,
          paddingBottom: 40,
          gap: 24,
        }}
        showsVerticalScrollIndicator={false}
      >
        {/* Title */}
        <Text
          style={{
            fontSize: 24,
            fontWeight: "700",
            color: "#000",
            textAlign: "center",
          }}
        >
          number-flow-react-native
        </Text>

        {/* Demos */}
        <ComparisonDemo />
        <ContinuousDemo />
        <ContinuousTimeDemo />
        <DecimalDemo />
        <IntegerDemo />
        <SmallDecimalDemo />
        <Clock24hDemo />
        <Clock12hDemo />
        <CountdownDemo />
        <FullClockDemo />
        <EdgeCaseDemo />
      </ScrollView>
      <StatusBar style="auto" />
    </SafeAreaView>
  );
}
