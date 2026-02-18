import { Text, type ViewStyle } from "react-native";
import { colors } from "../theme/colors";
import { RipplePressable } from "./RipplePressable";

interface DemoButtonProps {
  onPress: () => void;
  label: string;
  style?: ViewStyle;
  active?: boolean;
  activeColor?: string;
  variant?: "default" | "primary";
}

export const DemoButton = ({
  onPress,
  label,
  style,
  active,
  activeColor = colors.accentLight,
  variant = "default",
}: DemoButtonProps) => {
  const isPrimary = variant === "primary";

  const backgroundColor = isPrimary
    ? colors.accent
    : active
      ? activeColor
      : colors.buttonBackground;

  const textColor = isPrimary ? "#FFFFFF" : colors.buttonText;
  const rippleColor = isPrimary ? "rgba(255, 255, 255, 0.2)" : "rgba(0, 0, 0, 0.08)";

  return (
    <RipplePressable
      onPress={onPress}
      rippleColor={rippleColor}
      style={{
        backgroundColor,
        borderRadius: 8,
        padding: 12,
        alignItems: "center",
        ...style,
      }}
    >
      <Text style={{ fontSize: 14, fontWeight: "500", color: textColor }}>{label}</Text>
    </RipplePressable>
  );
};
