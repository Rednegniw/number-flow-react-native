import { Canvas, type SkFont, useFont } from "@shopify/react-native-skia";
import { NumberFlow as BaselineNumberFlow } from "number-flow-baseline";
import { SkiaNumberFlow as BaselineSkiaNumberFlow } from "number-flow-baseline/skia";
import { NumberFlow } from "number-flow-react-native";
import { SkiaNumberFlow } from "number-flow-react-native/skia";
import { useCallback, useEffect, useRef, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { Easing } from "react-native-reanimated";
import { INTER_FONT_ASSET } from "../theme/fonts";

/**
 * Frame-parity screen: four rows render the SAME scripted value sequence at
 * fixed pixel positions, captured in one screen recording and diffed row-pair
 * against row-pair. Because both members of a pair live in the SAME captured
 * frame, encoder timing cannot skew the comparison.
 *
 * Two modes:
 *   "ab"      rows = current, baseline, current(skia), baseline(skia)
 *   "control" rows = current, current,  current(skia), current(skia)
 *
 * The control mode is the harness null test: identical code in two component
 * instances still animates on independent `withTiming` clocks, so whatever
 * residual it produces is harness noise, not a rendering difference. An A/B
 * residual is only meaningful above the control's floor.
 */

export const PARITY_ROW_TOP = 80;
export const PARITY_ROW_HEIGHT = 90;
export const PARITY_ROW_LEFT = 16;
export const PARITY_ROW_WIDTH = 370;

const FONT_SIZE = 34;

/**
 * 4x slow motion: a variant can render a display frame or two behind its
 * counterpart when a canvas drops frames (a performance artifact, not a
 * rendering difference). Slowing the animation shrinks a one-frame lag to a
 * negligible fraction of animation progress; the diff script adds temporal
 * alignment and a phase-tolerant ink-mass metric on top.
 */
const SLOW_SPIN = { duration: 3600, easing: Easing.inOut(Easing.ease) };
const SLOW_OPACITY = { duration: 1800, easing: Easing.out(Easing.ease) };
const STEP_MS = 4400;

/**
 * Covers: single-digit roll up, roll down (trend flip), full carry
 * (99->00 cascades), digit-count grow (enter), shrink (exit), sign enter,
 * decimal enter, and return to start.
 */
const VALUE_SCRIPT = [123456, 123457, 123449, 199999, 200000, 1234, 98, -42, 87.5, 123456];

type ParityMode = "ab" | "control";

const NativeRow = ({ value, baseline }: { value: number; baseline: boolean }) => {
  const Component = baseline ? BaselineNumberFlow : NumberFlow;

  return (
    <Component
      opacityTiming={SLOW_OPACITY}
      spinTiming={SLOW_SPIN}
      style={{ fontSize: FONT_SIZE, color: "#000000" }}
      transformTiming={SLOW_SPIN}
      value={value}
    />
  );
};

const SkiaRow = ({
  value,
  baseline,
  font,
}: {
  value: number;
  baseline: boolean;
  font: SkFont | null;
}) => {
  const Component = baseline ? BaselineSkiaNumberFlow : SkiaNumberFlow;

  return (
    <Canvas style={{ width: PARITY_ROW_WIDTH, height: PARITY_ROW_HEIGHT }}>
      <Component
        color="#000000"
        font={font}
        opacityTiming={SLOW_OPACITY}
        spinTiming={SLOW_SPIN}
        transformTiming={SLOW_SPIN}
        value={value}
        x={4}
        y={60}
      />
    </Canvas>
  );
};

export const VisualParityScreen = () => {
  const [value, setValue] = useState(VALUE_SCRIPT[0]);
  const [phase, setPhase] = useState<"idle" | "running" | "done">("idle");
  const [mode, setMode] = useState<ParityMode>("ab");
  const stepRef = useRef(0);

  const fontSkia = useFont(INTER_FONT_ASSET, FONT_SIZE);

  const start = useCallback((nextMode: ParityMode) => {
    stepRef.current = 0;
    setMode(nextMode);
    setValue(VALUE_SCRIPT[0]);
    setPhase("running");
  }, []);

  useEffect(() => {
    if (phase !== "running") return;

    const id = setInterval(() => {
      stepRef.current += 1;

      if (stepRef.current >= VALUE_SCRIPT.length) {
        clearInterval(id);
        setPhase("done");
        return;
      }
      setValue(VALUE_SCRIPT[stepRef.current]);
    }, STEP_MS);

    return () => clearInterval(id);
  }, [phase]);

  // Row 1 and row 3 hold the comparison variant: baseline in A/B, current in control
  const compareIsBaseline = mode === "ab";

  const rowStyle = (index: number) =>
    ({
      position: "absolute",
      top: PARITY_ROW_TOP + index * PARITY_ROW_HEIGHT,
      left: PARITY_ROW_LEFT,
      width: PARITY_ROW_WIDTH,
      height: PARITY_ROW_HEIGHT,
      justifyContent: "center",
      alignItems: "flex-start",
    }) as const;

  const buttonStyle = (offset: number) =>
    ({
      position: "absolute",
      top: PARITY_ROW_TOP + 4 * PARITY_ROW_HEIGHT + 60 + offset,
      left: PARITY_ROW_LEFT,
      backgroundColor: "#0A0A0A",
      borderRadius: 10,
      paddingVertical: 12,
      paddingHorizontal: 24,
    }) as const;

  return (
    <View style={{ flex: 1, backgroundColor: "#FFFFFF" }}>
      {/* Row 0: current native */}
      <View style={rowStyle(0)}>
        <NativeRow baseline={false} value={value} />
      </View>

      {/* Row 1: comparison native */}
      <View style={rowStyle(1)}>
        <NativeRow baseline={compareIsBaseline} value={value} />
      </View>

      {/* Row 2: current skia */}
      <View style={rowStyle(2)}>
        <SkiaRow baseline={false} font={fontSkia} value={value} />
      </View>

      {/* Row 3: comparison skia */}
      <View style={rowStyle(3)}>
        <SkiaRow baseline={compareIsBaseline} font={fontSkia} value={value} />
      </View>

      {/* Controls, positioned below all diffed rows */}
      <Pressable onPress={() => start("ab")} style={buttonStyle(0)}>
        <Text style={{ color: "#FFFFFF", fontSize: 15 }}>
          {phase === "running" && mode === "ab"
            ? "RUNNING A/B"
            : phase === "done" && mode === "ab"
              ? "DONE A/B - run again"
              : "Run A/B (current vs baseline)"}
        </Text>
      </Pressable>

      <Pressable onPress={() => start("control")} style={buttonStyle(60)}>
        <Text style={{ color: "#FFFFFF", fontSize: 15 }}>
          {phase === "running" && mode === "control"
            ? "RUNNING CONTROL"
            : phase === "done" && mode === "control"
              ? "DONE CONTROL - run again"
              : "Run control (current vs current)"}
        </Text>
      </Pressable>
    </View>
  );
};
