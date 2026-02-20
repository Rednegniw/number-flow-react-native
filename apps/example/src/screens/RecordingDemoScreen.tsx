import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useLayoutEffect } from "react";
import { StatusBar, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { findRecordingEntry } from "../config/recordingRegistry";
import type { RootStackParamList } from "../navigation/types";

const BACKGROUND = "#0A0A0A";

type Props = NativeStackScreenProps<RootStackParamList, "RecordingDemo">;

export const RecordingDemoScreen = ({ route, navigation }: Props) => {
  const { recordingKey } = route.params;
  const entry = findRecordingEntry(recordingKey);
  const insets = useSafeAreaInsets();

  useLayoutEffect(() => {
    navigation.setOptions({ headerShown: false });
  }, [navigation]);

  if (!entry) return null;

  const Component = entry.SkiaComponent;

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: BACKGROUND,
        justifyContent: "center",
        paddingBottom: insets.bottom,
      }}
    >
      <StatusBar hidden />
      <Component />
    </View>
  );
};
