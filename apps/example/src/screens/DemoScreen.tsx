import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useLayoutEffect, useState } from "react";
import { Platform, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { type Renderer, RendererToggle } from "../components/RendererToggle";
import { findDemoEntry } from "../config/demoRegistry";
import type { RootStackParamList } from "../navigation/types";
import { colors } from "../theme/colors";
import { FONT_REGULAR } from "../theme/fonts";

const isWeb = Platform.OS === "web";

type Props = NativeStackScreenProps<RootStackParamList, "Demo">;

export const DemoScreen = ({ route, navigation }: Props) => {
  const { demoKey } = route.params;
  const entry = findDemoEntry(demoKey);
  const insets = useSafeAreaInsets();
  const [renderer, setRenderer] = useState<Renderer>("native");

  useLayoutEffect(() => {
    navigation.setOptions({
      title: entry?.title ?? "Demo",
      headerRight: isWeb
        ? undefined
        : () => (
            <RendererToggle
              onToggle={() => setRenderer((r) => (r === "native" ? "skia" : "native"))}
              value={renderer}
            />
          ),
    });
  }, [navigation, entry, renderer]);

  if (!entry) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <Text>Demo not found</Text>
      </View>
    );
  }

  const effectiveRenderer = isWeb ? "native" : renderer;
  const DemoComponent = effectiveRenderer === "skia" ? entry.SkiaComponent : entry.NativeComponent;

  return (
    <ScrollView
      contentContainerStyle={{
        paddingHorizontal: 20,
        paddingTop: 16,
        paddingBottom: insets.bottom + 20,
      }}
      showsVerticalScrollIndicator={false}
      style={{ backgroundColor: colors.background }}
    >
      {/* Description */}
      <Text
        style={{
          fontSize: 13,
          fontFamily: FONT_REGULAR,
          color: colors.textSecondary,
          lineHeight: 18,
          marginBottom: 16,
        }}
      >
        {entry.description}
      </Text>

      {/* Demo content */}
      <DemoComponent />
    </ScrollView>
  );
};
