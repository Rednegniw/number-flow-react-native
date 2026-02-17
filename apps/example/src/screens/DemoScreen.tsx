import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useLayoutEffect, useState } from "react";
import { ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { type Renderer, RendererToggle } from "../components/RendererToggle";
import { DEMO_REGISTRY } from "../config/demoRegistry";
import type { RootStackParamList } from "../navigation/types";
import { colors } from "../theme/colors";
import { FONT_REGULAR } from "../theme/fonts";

type Props = NativeStackScreenProps<RootStackParamList, "Demo">;

export const DemoScreen = ({ route, navigation }: Props) => {
  const { demoKey } = route.params;
  const entry = DEMO_REGISTRY.find((d) => d.key === demoKey);
  const insets = useSafeAreaInsets();
  const [renderer, setRenderer] = useState<Renderer>("native");

  // Configure header title and toggle
  useLayoutEffect(() => {
    navigation.setOptions({
      title: entry?.title ?? "Demo",
      headerRight: entry?.supportsSkia
        ? () => (
            <RendererToggle
              onToggle={() => setRenderer((r) => (r === "native" ? "skia" : "native"))}
              value={renderer}
            />
          )
        : undefined,
    });
  }, [navigation, entry, renderer]);

  if (!entry) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <Text>Demo not found</Text>
      </View>
    );
  }

  const isSkia = renderer === "skia" && entry.supportsSkia;
  const DemoComponent = isSkia ? entry.SkiaComponent! : entry.NativeComponent;

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
