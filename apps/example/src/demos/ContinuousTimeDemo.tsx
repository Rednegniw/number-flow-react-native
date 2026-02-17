import { Canvas } from "@shopify/react-native-skia";
import { TimeFlow } from "number-flow-react-native/native";
import { SkiaTimeFlow, useSkiaFont } from "number-flow-react-native/skia";
import { useCallback, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { colors } from "../theme/colors";
import { FONT_REGULAR, INTER_FONT_ASSET } from "../theme/fonts";

const FONT_SIZE = 24;
const CANVAS_WIDTH = 140;
const CANVAS_HEIGHT = 34;

function useContinuousTimeDemoState() {
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

  return { hours, minutes, seconds, incrementHour, incrementMinute, reset };
}

const ActionButtons = ({
  onIncrementHour,
  onIncrementMinute,
  onReset,
}: {
  onIncrementHour: () => void;
  onIncrementMinute: () => void;
  onReset: () => void;
}) => (
  <View style={{ flexDirection: "row", gap: 8 }}>
    <Pressable
      onPress={onIncrementHour}
      style={{
        flex: 1,
        backgroundColor: colors.buttonBackground,
        borderRadius: 8,
        padding: 12,
        alignItems: "center",
      }}
    >
      <Text style={{ fontSize: 14, fontWeight: "500", color: colors.buttonText }}>+1 Hour</Text>
    </Pressable>

    <Pressable
      onPress={onIncrementMinute}
      style={{
        flex: 1,
        backgroundColor: colors.buttonBackground,
        borderRadius: 8,
        padding: 12,
        alignItems: "center",
      }}
    >
      <Text style={{ fontSize: 14, fontWeight: "500", color: colors.buttonText }}>+1 Minute</Text>
    </Pressable>

    <Pressable
      onPress={onReset}
      style={{
        flex: 1,
        backgroundColor: colors.buttonBackground,
        borderRadius: 8,
        padding: 12,
        alignItems: "center",
      }}
    >
      <Text style={{ fontSize: 14, fontWeight: "500", color: colors.buttonText }}>Reset</Text>
    </Pressable>
  </View>
);

export const ContinuousTimeDemoNative = () => {
  const { hours, minutes, seconds, incrementHour, incrementMinute, reset } =
    useContinuousTimeDemoState();

  return (
    <View style={{ gap: 8 }}>
      {/* Description */}
      <Text style={{ fontSize: 11, color: colors.textSecondary }}>
        Left is default, right has continuous=true — try +1 Hour
      </Text>

      {/* Side-by-side comparison */}
      <View style={{ flexDirection: "row", gap: 12 }}>
        {/* Default */}
        <View
          style={{
            flex: 1,
            backgroundColor: colors.demoBackground,
            borderRadius: 12,
            padding: 12,
            alignItems: "center",
            justifyContent: "center",
            minHeight: 70,
            gap: 4,
          }}
        >
          <Text style={{ fontSize: 11, fontWeight: "500", color: colors.textSecondary }}>
            Default
          </Text>
          <TimeFlow
            containerStyle={{ width: CANVAS_WIDTH }}
            hours={hours}
            minutes={minutes}
            seconds={seconds}
            style={{ fontFamily: FONT_REGULAR, fontSize: FONT_SIZE, color: colors.text }}
            textAlign="center"
            trend={1}
          />
        </View>

        {/* Continuous */}
        <View
          style={{
            flex: 1,
            backgroundColor: colors.demoBackground,
            borderRadius: 12,
            padding: 12,
            alignItems: "center",
            justifyContent: "center",
            minHeight: 70,
            gap: 4,
          }}
        >
          <Text style={{ fontSize: 11, fontWeight: "500", color: colors.textSecondary }}>
            Continuous
          </Text>
          <TimeFlow
            containerStyle={{ width: CANVAS_WIDTH }}
            continuous
            hours={hours}
            minutes={minutes}
            seconds={seconds}
            style={{ fontFamily: FONT_REGULAR, fontSize: FONT_SIZE, color: colors.text }}
            textAlign="center"
            trend={1}
          />
        </View>
      </View>

      {/* Action buttons */}
      <ActionButtons
        onIncrementHour={incrementHour}
        onIncrementMinute={incrementMinute}
        onReset={reset}
      />
    </View>
  );
};

export const ContinuousTimeDemoSkia = () => {
  const skiaFont = useSkiaFont(INTER_FONT_ASSET, FONT_SIZE);
  const { hours, minutes, seconds, incrementHour, incrementMinute, reset } =
    useContinuousTimeDemoState();

  return (
    <View style={{ gap: 8 }}>
      {/* Description */}
      <Text style={{ fontSize: 11, color: colors.textSecondary }}>
        Left is default, right has continuous=true — try +1 Hour
      </Text>

      {/* Side-by-side comparison */}
      <View style={{ flexDirection: "row", gap: 12 }}>
        {/* Default */}
        <View
          style={{
            flex: 1,
            backgroundColor: colors.demoBackground,
            borderRadius: 12,
            padding: 12,
            alignItems: "center",
            justifyContent: "center",
            minHeight: 70,
            gap: 4,
          }}
        >
          <Text style={{ fontSize: 11, fontWeight: "500", color: colors.textSecondary }}>
            Default
          </Text>
          <Canvas style={{ width: CANVAS_WIDTH, height: CANVAS_HEIGHT }}>
            <SkiaTimeFlow
              color={colors.accent}
              font={skiaFont}
              hours={hours}
              minutes={minutes}
              seconds={seconds}
              textAlign="center"
              trend={1}
              width={CANVAS_WIDTH}
              y={FONT_SIZE}
            />
          </Canvas>
        </View>

        {/* Continuous */}
        <View
          style={{
            flex: 1,
            backgroundColor: colors.demoBackground,
            borderRadius: 12,
            padding: 12,
            alignItems: "center",
            justifyContent: "center",
            minHeight: 70,
            gap: 4,
          }}
        >
          <Text style={{ fontSize: 11, fontWeight: "500", color: colors.textSecondary }}>
            Continuous
          </Text>
          <Canvas style={{ width: CANVAS_WIDTH, height: CANVAS_HEIGHT }}>
            <SkiaTimeFlow
              color={colors.accent}
              continuous
              font={skiaFont}
              hours={hours}
              minutes={minutes}
              seconds={seconds}
              textAlign="center"
              trend={1}
              width={CANVAS_WIDTH}
              y={FONT_SIZE}
            />
          </Canvas>
        </View>
      </View>

      {/* Action buttons */}
      <ActionButtons
        onIncrementHour={incrementHour}
        onIncrementMinute={incrementMinute}
        onReset={reset}
      />
    </View>
  );
};
