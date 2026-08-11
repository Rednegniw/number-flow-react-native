import { Canvas, useFont } from "@shopify/react-native-skia";
import { NumberFlow as BaselineNumberFlow } from "number-flow-baseline";
import { SkiaNumberFlow as BaselineSkiaNumberFlow } from "number-flow-baseline/skia";
import { NumberFlow } from "number-flow-react-native";
import { SkiaNumberFlow } from "number-flow-react-native/skia";
import { useCallback, useEffect, useRef, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { Easing } from "react-native-reanimated";
import { INTER_FONT_ASSET } from "../theme/fonts";

/**
 * Frame-parity screen: current (rows 0, 2) and frozen baseline (rows 1, 3)
 * render the SAME scripted value sequence at fixed pixel positions. A screen
 * recording is sliced frame by frame and row pairs are pixel-diffed; because
 * both variants share every captured frame, encoder timing cannot skew the
 * comparison. Row geometry is hardcoded and mirrored by the diff script.
 */

export const PARITY_ROW_TOP = 80;
export const PARITY_ROW_HEIGHT = 90;
export const PARITY_ROW_LEFT = 16;
export const PARITY_ROW_WIDTH = 370;

const FONT_SIZE = 34;

/**
 * 4x slow motion: variants can lag each other by a display frame or two when
 * one canvas drops frames (that is a performance artifact, not a rendering
 * difference). Slowing the animation makes a one-frame lag a negligible
 * fraction of animation progress, so same-time comparison approximates
 * same-state comparison. The diff script adds temporal alignment on top.
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

export const VisualParityScreen = () => {
  const [value, setValue] = useState(VALUE_SCRIPT[0]);
  const [phase, setPhase] = useState<"idle" | "running" | "done">("idle");
  const stepRef = useRef(0);

  const fontSkia = useFont(INTER_FONT_ASSET, FONT_SIZE);

  const start = useCallback(() => {
    stepRef.current = 0;
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

  return (
    <View style={{ flex: 1, backgroundColor: "#FFFFFF" }}>
      {/* Row 0: current native */}
      <View style={rowStyle(0)}>
        <NumberFlow
          opacityTiming={SLOW_OPACITY}
          spinTiming={SLOW_SPIN}
          style={{ fontSize: FONT_SIZE, color: "#000000" }}
          transformTiming={SLOW_SPIN}
          value={value}
        />
      </View>

      {/* Row 1: baseline native */}
      <View style={rowStyle(1)}>
        <BaselineNumberFlow
          opacityTiming={SLOW_OPACITY}
          spinTiming={SLOW_SPIN}
          style={{ fontSize: FONT_SIZE, color: "#000000" }}
          transformTiming={SLOW_SPIN}
          value={value}
        />
      </View>

      {/* Row 2: current skia */}
      <View style={rowStyle(2)}>
        <Canvas style={{ width: PARITY_ROW_WIDTH, height: PARITY_ROW_HEIGHT }}>
          <SkiaNumberFlow
            color="#000000"
            font={fontSkia}
            opacityTiming={SLOW_OPACITY}
            spinTiming={SLOW_SPIN}
            transformTiming={SLOW_SPIN}
            value={value}
            x={4}
            y={60}
          />
        </Canvas>
      </View>

      {/* Row 3: baseline skia */}
      <View style={rowStyle(3)}>
        <Canvas style={{ width: PARITY_ROW_WIDTH, height: PARITY_ROW_HEIGHT }}>
          <BaselineSkiaNumberFlow
            color="#000000"
            font={fontSkia}
            opacityTiming={SLOW_OPACITY}
            spinTiming={SLOW_SPIN}
            transformTiming={SLOW_SPIN}
            value={value}
            x={4}
            y={60}
          />
        </Canvas>
      </View>

      {/* Controls and status marker, positioned below all diffed rows */}
      <Pressable
        onPress={start}
        style={{
          position: "absolute",
          top: PARITY_ROW_TOP + 4 * PARITY_ROW_HEIGHT + 60,
          left: PARITY_ROW_LEFT,
          backgroundColor: "#0A0A0A",
          borderRadius: 10,
          paddingVertical: 12,
          paddingHorizontal: 24,
        }}
      >
        <Text style={{ color: "#FFFFFF", fontSize: 15 }}>
          {phase === "running"
            ? "RUNNING"
            : phase === "done"
              ? "DONE - run again"
              : "Start parity script"}
        </Text>
      </Pressable>
    </View>
  );
};
