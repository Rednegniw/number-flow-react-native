import type { ViewStyle } from "react-native";
import { Text } from "react-native";
import { RipplePressable } from "../../components/RipplePressable";

interface RecordingButtonProps {
  label: string;
  onPress: () => void;
  style?: ViewStyle;
}

export const RecordingButton = ({ label, onPress, style }: RecordingButtonProps) => (
  <RipplePressable
    onPress={onPress}
    rippleColor="rgba(255,255,255,0.15)"
    style={{
      borderRadius: 28,
      paddingHorizontal: 28,
      paddingVertical: 14,
      borderWidth: 1,
      borderColor: "rgba(255,255,255,0.2)",
      alignItems: "center",
      ...style,
    }}
  >
    <Text style={{ color: "#fff", fontSize: 22, fontWeight: "500" }}>{label}</Text>
  </RipplePressable>
);
