import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { Platform } from "react-native";
import { DemoScreen } from "../screens/DemoScreen";
import { HomeScreen } from "../screens/HomeScreen";
import { colors } from "../theme/colors";
import { FONT_SEMIBOLD } from "../theme/fonts";
import type { RootStackParamList } from "./types";

const Stack = createNativeStackNavigator<RootStackParamList>();

// Lazy-import Skia-dependent screens to avoid pulling in @shopify/react-native-skia on web
const LazyShowcase =
  Platform.OS === "web" ? undefined : require("../screens/ShowcaseScreen").ShowcaseScreen;
const LazyRecordingList =
  Platform.OS === "web" ? undefined : require("../screens/RecordingListScreen").RecordingListScreen;
const LazyRecordingDemo =
  Platform.OS === "web" ? undefined : require("../screens/RecordingDemoScreen").RecordingDemoScreen;

export const RootNavigator = () => (
  <Stack.Navigator
    screenOptions={{
      headerBackButtonDisplayMode: "minimal",
      headerTintColor: colors.accent,
      headerTitleStyle: { fontFamily: FONT_SEMIBOLD },
      headerStyle: { backgroundColor: colors.background },
      contentStyle: { backgroundColor: colors.background },
    }}
  >
    <Stack.Screen component={HomeScreen} name="Home" options={{ headerShown: false }} />
    <Stack.Screen component={DemoScreen} name="Demo" />
    {LazyShowcase && (
      <Stack.Screen component={LazyShowcase} name="Showcase" options={{ headerShown: false }} />
    )}
    {LazyRecordingList && (
      <Stack.Screen
        component={LazyRecordingList}
        name="RecordingList"
        options={{ headerShown: false }}
      />
    )}
    {LazyRecordingDemo && <Stack.Screen component={LazyRecordingDemo} name="RecordingDemo" />}
  </Stack.Navigator>
);
