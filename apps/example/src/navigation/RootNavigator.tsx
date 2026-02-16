import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { DemoScreen } from "../screens/DemoScreen";
import { HomeScreen } from "../screens/HomeScreen";
import { colors } from "../theme/colors";
import { FONT_SEMIBOLD } from "../theme/fonts";
import type { RootStackParamList } from "./types";

const Stack = createNativeStackNavigator<RootStackParamList>();

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
    <Stack.Screen
      component={HomeScreen}
      name="Home"
      options={{ headerShown: false }}
    />
    <Stack.Screen
      component={DemoScreen}
      name="Demo"
    />
  </Stack.Navigator>
);
