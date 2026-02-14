import { NumberFlow } from "number-flow-react-native/native";
import { useCallback, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { pickSuffix } from "./utils";

export const SmallDecimalDemo = () => {
  const [value, setValue] = useState(0.042);
  const [suffix, setSuffix] = useState(" BAC");

  const randomize = useCallback(() => {
    setValue(Math.round(Math.random() * 1000) / 10000);
    setSuffix(pickSuffix());
  }, []);

  return (
    <View style={{ gap: 8 }}>
      {/* Header */}
      <Text style={{ fontSize: 14, fontWeight: "600", color: "#333" }}>
        Small Decimal
      </Text>
      <Text style={{ fontSize: 11, color: "#999" }}>
        {`suffix="${suffix}"`}
      </Text>

      {/* Number display */}
      <View
        style={{
          backgroundColor: "#f5f5f5",
          borderRadius: 12,
          padding: 20,
          alignItems: "center",
          justifyContent: "center",
          minHeight: 60,
        }}
      >
        <NumberFlow
          containerStyle={{ width: 250 }}
          format={{ minimumFractionDigits: 4, maximumFractionDigits: 4 }}
          style={{ fontFamily: "System", fontSize: 28, color: "#333" }}
          suffix={suffix}
          textAlign="center"
          value={value}
        />
      </View>

      {/* Action button */}
      <Pressable
        onPress={randomize}
        style={{
          backgroundColor: "#e8e8e8",
          borderRadius: 8,
          padding: 12,
          alignItems: "center",
        }}
      >
        <Text style={{ fontSize: 14, fontWeight: "500", color: "#333" }}>
          Randomize
        </Text>
      </Pressable>
    </View>
  );
};
