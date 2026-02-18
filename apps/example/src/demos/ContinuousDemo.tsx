import { Canvas } from "@shopify/react-native-skia";
import { NumberFlow, TimeFlow } from "number-flow-react-native/native";
import { SkiaNumberFlow, SkiaTimeFlow, useSkiaFont } from "number-flow-react-native/skia";
import { useCallback, useState } from "react";
import { Text, View } from "react-native";
import { DemoButton } from "../components/DemoButton";
import { colors } from "../theme/colors";
import {
  CANVAS_HEIGHT_COMPACT,
  CANVAS_WIDTH_COMPACT,
  DEMO_FONT_FAMILY,
  DEMO_FONT_SIZE_COMPACT,
  DEMO_SKIA_FONT_ASSET,
  DEMO_TEXT_COLOR,
} from "../theme/demoConstants";

const JUMPS = [100, 200, 500, 1000, 5000];

function useContinuousNumberState() {
  const [value, setValue] = useState(100);

  const jump = useCallback(() => {
    const delta = JUMPS[Math.floor(Math.random() * JUMPS.length)];
    setValue((v) => v + delta);
  }, []);

  const reset = useCallback(() => {
    setValue(100);
  }, []);

  return { value, jump, reset };
}

function useContinuousTimeState() {
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

const ComparisonLabel = ({ label }: { label: string }) => (
  <Text style={{ fontSize: 11, fontWeight: "500", color: colors.textSecondary }}>{label}</Text>
);

const ComparisonCard = ({ children, label }: { children: React.ReactNode; label: string }) => (
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
    <ComparisonLabel label={label} />
    {children}
  </View>
);

export const ContinuousDemoNative = () => {
  const number = useContinuousNumberState();
  const time = useContinuousTimeState();

  return (
    <View style={{ gap: 16 }}>
      {/* NumberFlow comparison */}
      <View style={{ gap: 8 }}>
        <Text style={{ fontSize: 11, color: colors.textSecondary }}>
          NumberFlow — left is default, right has continuous=true
        </Text>

        <View style={{ flexDirection: "row", gap: 12 }}>
          <ComparisonCard label="Default">
            <NumberFlow
              containerStyle={{ width: CANVAS_WIDTH_COMPACT }}
              format={{ useGrouping: true }}
              style={{
                fontFamily: DEMO_FONT_FAMILY,
                fontSize: DEMO_FONT_SIZE_COMPACT,
                color: DEMO_TEXT_COLOR,
              }}
              textAlign="center"
              trend={1}
              value={number.value}
            />
          </ComparisonCard>

          <ComparisonCard label="Continuous">
            <NumberFlow
              containerStyle={{ width: CANVAS_WIDTH_COMPACT }}
              continuous
              format={{ useGrouping: true }}
              style={{
                fontFamily: DEMO_FONT_FAMILY,
                fontSize: DEMO_FONT_SIZE_COMPACT,
                color: DEMO_TEXT_COLOR,
              }}
              textAlign="center"
              trend={1}
              value={number.value}
            />
          </ComparisonCard>
        </View>

        <View style={{ flexDirection: "row", gap: 8 }}>
          <DemoButton label="Jump +random" onPress={number.jump} style={{ flex: 1 }} />
          <DemoButton label="Reset" onPress={number.reset} style={{ flex: 1 }} />
        </View>
      </View>

      {/* TimeFlow comparison */}
      <View style={{ gap: 8 }}>
        <Text style={{ fontSize: 11, color: colors.textSecondary }}>
          TimeFlow — left is default, right has continuous=true — try +1 Hour
        </Text>

        <View style={{ flexDirection: "row", gap: 12 }}>
          <ComparisonCard label="Default">
            <TimeFlow
              containerStyle={{ width: CANVAS_WIDTH_COMPACT + 20 }}
              hours={time.hours}
              minutes={time.minutes}
              seconds={time.seconds}
              style={{
                fontFamily: DEMO_FONT_FAMILY,
                fontSize: DEMO_FONT_SIZE_COMPACT,
                color: DEMO_TEXT_COLOR,
              }}
              textAlign="center"
              trend={1}
            />
          </ComparisonCard>

          <ComparisonCard label="Continuous">
            <TimeFlow
              containerStyle={{ width: CANVAS_WIDTH_COMPACT + 20 }}
              continuous
              hours={time.hours}
              minutes={time.minutes}
              seconds={time.seconds}
              style={{
                fontFamily: DEMO_FONT_FAMILY,
                fontSize: DEMO_FONT_SIZE_COMPACT,
                color: DEMO_TEXT_COLOR,
              }}
              textAlign="center"
              trend={1}
            />
          </ComparisonCard>
        </View>

        <View style={{ flexDirection: "row", gap: 8 }}>
          <DemoButton label="+1 Hour" onPress={time.incrementHour} style={{ flex: 1 }} />
          <DemoButton label="+1 Minute" onPress={time.incrementMinute} style={{ flex: 1 }} />
          <DemoButton label="Reset" onPress={time.reset} style={{ flex: 1 }} />
        </View>
      </View>
    </View>
  );
};

export const ContinuousDemoSkia = () => {
  const skiaFont = useSkiaFont(DEMO_SKIA_FONT_ASSET, DEMO_FONT_SIZE_COMPACT);
  const number = useContinuousNumberState();
  const time = useContinuousTimeState();

  const timeCanvasWidth = CANVAS_WIDTH_COMPACT + 20;

  return (
    <View style={{ gap: 16 }}>
      {/* NumberFlow comparison */}
      <View style={{ gap: 8 }}>
        <Text style={{ fontSize: 11, color: colors.textSecondary }}>
          NumberFlow — left is default, right has continuous=true
        </Text>

        <View style={{ flexDirection: "row", gap: 12 }}>
          <ComparisonCard label="Default">
            <Canvas style={{ width: CANVAS_WIDTH_COMPACT, height: CANVAS_HEIGHT_COMPACT }}>
              <SkiaNumberFlow
                color={DEMO_TEXT_COLOR}
                font={skiaFont}
                format={{ useGrouping: true }}
                textAlign="center"
                trend={1}
                value={number.value}
                width={CANVAS_WIDTH_COMPACT}
                y={DEMO_FONT_SIZE_COMPACT}
              />
            </Canvas>
          </ComparisonCard>

          <ComparisonCard label="Continuous">
            <Canvas style={{ width: CANVAS_WIDTH_COMPACT, height: CANVAS_HEIGHT_COMPACT }}>
              <SkiaNumberFlow
                color={DEMO_TEXT_COLOR}
                continuous
                font={skiaFont}
                format={{ useGrouping: true }}
                textAlign="center"
                trend={1}
                value={number.value}
                width={CANVAS_WIDTH_COMPACT}
                y={DEMO_FONT_SIZE_COMPACT}
              />
            </Canvas>
          </ComparisonCard>
        </View>

        <View style={{ flexDirection: "row", gap: 8 }}>
          <DemoButton label="Jump +random" onPress={number.jump} style={{ flex: 1 }} />
          <DemoButton label="Reset" onPress={number.reset} style={{ flex: 1 }} />
        </View>
      </View>

      {/* TimeFlow comparison */}
      <View style={{ gap: 8 }}>
        <Text style={{ fontSize: 11, color: colors.textSecondary }}>
          TimeFlow — left is default, right has continuous=true — try +1 Hour
        </Text>

        <View style={{ flexDirection: "row", gap: 12 }}>
          <ComparisonCard label="Default">
            <Canvas style={{ width: timeCanvasWidth, height: CANVAS_HEIGHT_COMPACT }}>
              <SkiaTimeFlow
                color={DEMO_TEXT_COLOR}
                font={skiaFont}
                hours={time.hours}
                minutes={time.minutes}
                seconds={time.seconds}
                textAlign="center"
                trend={1}
                width={timeCanvasWidth}
                y={DEMO_FONT_SIZE_COMPACT}
              />
            </Canvas>
          </ComparisonCard>

          <ComparisonCard label="Continuous">
            <Canvas style={{ width: timeCanvasWidth, height: CANVAS_HEIGHT_COMPACT }}>
              <SkiaTimeFlow
                color={DEMO_TEXT_COLOR}
                continuous
                font={skiaFont}
                hours={time.hours}
                minutes={time.minutes}
                seconds={time.seconds}
                textAlign="center"
                trend={1}
                width={timeCanvasWidth}
                y={DEMO_FONT_SIZE_COMPACT}
              />
            </Canvas>
          </ComparisonCard>
        </View>

        <View style={{ flexDirection: "row", gap: 8 }}>
          <DemoButton label="+1 Hour" onPress={time.incrementHour} style={{ flex: 1 }} />
          <DemoButton label="+1 Minute" onPress={time.incrementMinute} style={{ flex: 1 }} />
          <DemoButton label="Reset" onPress={time.reset} style={{ flex: 1 }} />
        </View>
      </View>
    </View>
  );
};
