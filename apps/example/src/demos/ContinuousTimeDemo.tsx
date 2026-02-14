import { Canvas, useFont } from "@shopify/react-native-skia";
import { TimeFlow } from "number-flow-react-native/native";
import { SkiaTimeFlow } from "number-flow-react-native/skia";
import { useCallback, useState } from "react";
import { Pressable, Text, View } from "react-native";

const SKIA_FONT_SIZE = 24;
const CANVAS_WIDTH = 140;
const CANVAS_HEIGHT = 34;

export const ContinuousTimeDemo = () => {
  const skiaFont = useFont(
    require("../../assets/fonts/SpaceMono-Regular.ttf"),
    SKIA_FONT_SIZE
  );

  const [hours, setHours] = useState(10);
  const [minutes, setMinutes] = useState(30);
  const [seconds, setSeconds] = useState(0);

  const incrementHour = useCallback(() => {
    setHours((h) => (h + 1) % 24);
  }, []);

  const incrementMinute = useCallback(() => {
    setMinutes((m) => {
      if (m === 59) {
        setHours((h) => (h + 1) % 24);
        return 0;
      }
      return m + 1;
    });
  }, []);

  const reset = useCallback(() => {
    setHours(10);
    setMinutes(30);
    setSeconds(0);
  }, []);

  return (
    <View style={{ gap: 8 }}>
      {/* Header */}
      <Text style={{ fontSize: 14, fontWeight: "600", color: "#333" }}>
        Continuous Time
      </Text>
      <Text style={{ fontSize: 11, color: "#999" }}>
        Left is default, right has continuous=true — try +1 Hour
      </Text>

      {/* Native: default vs continuous */}
      <Text style={{ fontSize: 11, fontWeight: "500", color: "#666" }}>
        Native
      </Text>
      <View style={{ flexDirection: "row", gap: 12 }}>
        {/* Default */}
        <View
          style={{
            flex: 1,
            backgroundColor: "#f5f5f5",
            borderRadius: 12,
            padding: 12,
            alignItems: "center",
            justifyContent: "center",
            minHeight: 70,
            gap: 4,
          }}
        >
          <Text style={{ fontSize: 11, fontWeight: "500", color: "#999" }}>
            Default
          </Text>
          <TimeFlow
            containerStyle={{ width: CANVAS_WIDTH }}
            hours={hours}
            minutes={minutes}
            seconds={seconds}
            style={{ fontFamily: "System", fontSize: SKIA_FONT_SIZE, color: "#000" }}
            textAlign="center"
            trend={1}
          />
        </View>

        {/* Continuous */}
        <View
          style={{
            flex: 1,
            backgroundColor: "#f5f5f5",
            borderRadius: 12,
            padding: 12,
            alignItems: "center",
            justifyContent: "center",
            minHeight: 70,
            gap: 4,
          }}
        >
          <Text style={{ fontSize: 11, fontWeight: "500", color: "#999" }}>
            Continuous
          </Text>
          <TimeFlow
            containerStyle={{ width: CANVAS_WIDTH }}
            continuous
            hours={hours}
            minutes={minutes}
            seconds={seconds}
            style={{ fontFamily: "System", fontSize: SKIA_FONT_SIZE, color: "#000" }}
            textAlign="center"
            trend={1}
          />
        </View>
      </View>

      {/* Skia: default vs continuous */}
      <Text style={{ fontSize: 11, fontWeight: "500", color: "#666" }}>
        Skia
      </Text>
      <View style={{ flexDirection: "row", gap: 12 }}>
        {/* Default */}
        <View
          style={{
            flex: 1,
            backgroundColor: "#f5f5f5",
            borderRadius: 12,
            padding: 12,
            alignItems: "center",
            justifyContent: "center",
            minHeight: 70,
            gap: 4,
          }}
        >
          <Text style={{ fontSize: 11, fontWeight: "500", color: "#999" }}>
            Default
          </Text>
          <Canvas style={{ width: CANVAS_WIDTH, height: CANVAS_HEIGHT }}>
            <SkiaTimeFlow
              color="#007AFF"
              font={skiaFont}
              hours={hours}
              minutes={minutes}
              seconds={seconds}
              textAlign="center"
              trend={1}
              width={CANVAS_WIDTH}
              y={SKIA_FONT_SIZE}
            />
          </Canvas>
        </View>

        {/* Continuous */}
        <View
          style={{
            flex: 1,
            backgroundColor: "#f5f5f5",
            borderRadius: 12,
            padding: 12,
            alignItems: "center",
            justifyContent: "center",
            minHeight: 70,
            gap: 4,
          }}
        >
          <Text style={{ fontSize: 11, fontWeight: "500", color: "#999" }}>
            Continuous
          </Text>
          <Canvas style={{ width: CANVAS_WIDTH, height: CANVAS_HEIGHT }}>
            <SkiaTimeFlow
              color="#007AFF"
              continuous
              font={skiaFont}
              hours={hours}
              minutes={minutes}
              seconds={seconds}
              textAlign="center"
              trend={1}
              width={CANVAS_WIDTH}
              y={SKIA_FONT_SIZE}
            />
          </Canvas>
        </View>
      </View>

      {/* Action buttons */}
      <View style={{ flexDirection: "row", gap: 8 }}>
        <Pressable
          onPress={incrementHour}
          style={{
            flex: 1,
            backgroundColor: "#e8e8e8",
            borderRadius: 8,
            padding: 12,
            alignItems: "center",
          }}
        >
          <Text style={{ fontSize: 14, fontWeight: "500", color: "#333" }}>
            +1 Hour
          </Text>
        </Pressable>

        <Pressable
          onPress={incrementMinute}
          style={{
            flex: 1,
            backgroundColor: "#e8e8e8",
            borderRadius: 8,
            padding: 12,
            alignItems: "center",
          }}
        >
          <Text style={{ fontSize: 14, fontWeight: "500", color: "#333" }}>
            +1 Minute
          </Text>
        </Pressable>

        <Pressable
          onPress={reset}
          style={{
            flex: 1,
            backgroundColor: "#e8e8e8",
            borderRadius: 8,
            padding: 12,
            alignItems: "center",
          }}
        >
          <Text style={{ fontSize: 14, fontWeight: "500", color: "#333" }}>
            Reset
          </Text>
        </Pressable>
      </View>
    </View>
  );
};
