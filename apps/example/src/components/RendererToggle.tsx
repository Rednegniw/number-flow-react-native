import { Pressable, Text, View } from "react-native";
import { colors } from "../theme/colors";
import { FONT_SEMIBOLD } from "../theme/fonts";

export type Renderer = "native" | "skia";

interface RendererToggleProps {
  value: Renderer;
  onToggle: () => void;
}

export const RendererToggle = ({ value, onToggle }: RendererToggleProps) => (
  <Pressable onPress={onToggle}>
    <View
      style={{
        flexDirection: "row",
        backgroundColor: colors.buttonBackground,
        borderRadius: 8,
        padding: 2,
      }}
    >
      {/* Native option */}
      <View
        style={{
          paddingHorizontal: 10,
          paddingVertical: 5,
          borderRadius: 6,
          backgroundColor: value === "native" ? colors.card : "transparent",
        }}
      >
        <Text
          style={{
            fontSize: 13,
            fontFamily: FONT_SEMIBOLD,
            color: value === "native" ? colors.text : colors.textSecondary,
          }}
        >
          Native
        </Text>
      </View>

      {/* Skia option */}
      <View
        style={{
          paddingHorizontal: 10,
          paddingVertical: 5,
          borderRadius: 6,
          backgroundColor: value === "skia" ? colors.card : "transparent",
        }}
      >
        <Text
          style={{
            fontSize: 13,
            fontFamily: FONT_SEMIBOLD,
            color: value === "skia" ? colors.text : colors.textSecondary,
          }}
        >
          Skia
        </Text>
      </View>
    </View>
  </Pressable>
);
