/**
 * Type-level tests for the public API.
 *
 * Uses @ts-expect-error to assert that invalid prop combinations fail at compile time.
 * If a @ts-expect-error line compiles successfully, tsc reports "unused expect-error",
 * which means our type constraint is broken.
 *
 * Run: tsc -p __tests__/tsconfig.json --noEmit
 */

import type { SharedValue } from "react-native-reanimated";
import type { Trend, SkiaNumberFlowProps } from "../src/core/types";
import type { NumberFlowProps } from "../src/native/types";
import type { TimeFlowProps, SkiaTimeFlowProps } from "../src/core/timeTypes";

// ─── Trend type ───

const _t1: Trend = -1;
const _t2: Trend = 0;
const _t3: Trend = 1;
// @ts-expect-error — Trend rejects 2
const _t4: Trend = 2;
// @ts-expect-error — Trend rejects -2
const _t5: Trend = -2;
// @ts-expect-error — Trend rejects floats
const _t6: Trend = 0.5;

// ─── NumberFlowProps: discriminated union ───

// Valid: value mode
const _nf1: NumberFlowProps = { value: 42, style: { fontSize: 32 } };

// Valid: value mode with format
const _nf2: NumberFlowProps = { value: 42, format: { minimumFractionDigits: 2 }, locales: "en-US", style: { fontSize: 32 } };

// Valid: sharedValue mode
const _nf3: NumberFlowProps = { sharedValue: {} as SharedValue<string>, style: { fontSize: 32 } };

// Both value and sharedValue — should fail
// @ts-expect-error
const _nf4: NumberFlowProps = { value: 42, sharedValue: {} as SharedValue<string>, style: { fontSize: 32 } };

// format in sharedValue mode — should fail
// @ts-expect-error
const _nf5: NumberFlowProps = { sharedValue: {} as SharedValue<string>, format: { minimumFractionDigits: 2 }, style: { fontSize: 32 } };

// locales in sharedValue mode — should fail
// @ts-expect-error
const _nf6: NumberFlowProps = { sharedValue: {} as SharedValue<string>, locales: "en-US", style: { fontSize: 32 } };

// Valid: optional fontFamily
const _nf7: NumberFlowProps = { value: 42, style: { fontSize: 32 } };

// Valid: fontFamily still accepted
const _nf8: NumberFlowProps = { value: 42, style: { fontSize: 32, fontFamily: "Inter-Bold" } };

// Valid: new props
const _nf9: NumberFlowProps = {
  value: 42,
  style: { fontSize: 32 },
  animated: false,
  respectMotionPreference: false,
  onAnimationsStart: () => {},
  onAnimationsFinish: () => {},
  trend: 1,
};

// trend rejects arbitrary numbers
const _nf10: NumberFlowProps = {
  value: 42,
  style: { fontSize: 32 },
  // @ts-expect-error
  trend: 2,
};

// ─── SkiaNumberFlowProps: discriminated union ───

// Valid: value mode
const _snf1: SkiaNumberFlowProps = { value: 42, font: null };

// Valid: sharedValue mode
const _snf2: SkiaNumberFlowProps = { sharedValue: {} as SharedValue<string>, font: null };

// Both value and sharedValue — should fail
// @ts-expect-error
const _snf3: SkiaNumberFlowProps = { value: 42, sharedValue: {} as SharedValue<string>, font: null };

// format in sharedValue mode — should fail
// @ts-expect-error
const _snf4: SkiaNumberFlowProps = { sharedValue: {} as SharedValue<string>, format: { minimumFractionDigits: 2 }, font: null };

// ─── TimeFlowProps: discriminated union ───

// Valid: direct time mode
const _tf1: TimeFlowProps = { minutes: 30, style: { fontSize: 32 } };

// Valid: with all time fields
const _tf2: TimeFlowProps = { hours: 14, minutes: 30, seconds: 45, style: { fontSize: 32 } };

// Valid: timestamp mode
const _tf3: TimeFlowProps = { minutes: 0, timestamp: Date.now(), style: { fontSize: 32 } };

// Valid: sharedValue mode
const _tf4: TimeFlowProps = { sharedValue: {} as SharedValue<string>, style: { fontSize: 32 } };

// minutes with sharedValue — should fail
// @ts-expect-error
const _tf5: TimeFlowProps = { minutes: 30, sharedValue: {} as SharedValue<string>, style: { fontSize: 32 } };

// hours with sharedValue — should fail
// @ts-expect-error
const _tf6: TimeFlowProps = { hours: 14, sharedValue: {} as SharedValue<string>, style: { fontSize: 32 } };

// timestamp with sharedValue — should fail
// @ts-expect-error
const _tf7: TimeFlowProps = { timestamp: Date.now(), sharedValue: {} as SharedValue<string>, style: { fontSize: 32 } };

// Valid: new props on TimeFlow
const _tf8: TimeFlowProps = {
  minutes: 30,
  style: { fontSize: 32 },
  animated: false,
  respectMotionPreference: false,
  onAnimationsStart: () => {},
  onAnimationsFinish: () => {},
};

// ─── SkiaTimeFlowProps: discriminated union ───

// Valid: direct time mode
const _stf1: SkiaTimeFlowProps = { minutes: 30, font: null };

// Valid: sharedValue mode
const _stf2: SkiaTimeFlowProps = { sharedValue: {} as SharedValue<string>, font: null };

// minutes with sharedValue — should fail
// @ts-expect-error
const _stf3: SkiaTimeFlowProps = { minutes: 30, sharedValue: {} as SharedValue<string>, font: null };

// hours with sharedValue — should fail
// @ts-expect-error
const _stf4: SkiaTimeFlowProps = { hours: 14, sharedValue: {} as SharedValue<string>, font: null };