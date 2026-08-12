import { act, render } from "@testing-library/react-native";
import { DEFAULT_FONT_SIZE } from "../../core/constants";
import { getFormatCharacters } from "../../core/intlHelpers";
import type { GlyphMetrics } from "../../core/types";
import { buildCharSet, cacheKey, metricsCache } from "../../native/glyphMetricsShared";
import { NumberFlow } from "../../native/NumberFlow";

/**
 * Diagnostic for the settle-time slot shift observed on device: in
 * 123,449 -> 199,999 the slot for the first "9" renders at the correct x
 * during the roll, then snaps ~4pt right when the spin completes.
 *
 * Captures every DigitSlot's targetX on every committed render, with fake
 * timers to step through the post-change window.
 */

const renderLog: { key: string; targetX: number; charWidth: number; digitValue: number }[][] = [];
let mockCommitLog: { key: string; targetX: number; charWidth: number; digitValue: number }[] = [];

jest.mock("../../native/DigitSlot", () => {
  const ReactActual = require("react");

  const RecordingDigitSlot = (props: {
    digitValue: number;
    targetX: number;
    charWidth: number;
  }) => {
    mockCommitLog.push({
      key: `dv${props.digitValue}`,
      targetX: props.targetX,
      charWidth: props.charWidth,
      digitValue: props.digitValue,
    });
    return ReactActual.createElement(ReactActual.Fragment);
  };

  return { DigitSlot: RecordingDigitSlot };
});

/** Proportional synthetic metrics: "1" is narrow (6), everything else 10 */
function seedProportionalMetrics(): void {
  const formatChars = getFormatCharacters(undefined, undefined, "", "");
  const charSet = buildCharSet(formatChars);

  const charWidths: Record<string, number> = {};
  const charBounds: Record<string, { top: number; bottom: number }> = {};
  for (const ch of charSet) {
    charWidths[ch] = ch === "1" ? 6 : 10;
    charBounds[ch] = { top: -14, bottom: 0 };
  }

  const metrics: GlyphMetrics = {
    charWidths,
    maxDigitWidth: 10,
    lineHeight: 24,
    ascent: -16,
    descent: 4,
    charBounds,
  };

  metricsCache.set(cacheKey({ fontSize: DEFAULT_FONT_SIZE }, formatChars), metrics);
}

function snapshotCommit(label: string) {
  if (mockCommitLog.length > 0) {
    renderLog.push([...mockCommitLog]);
    console.log(
      label,
      mockCommitLog.map((c) => `${c.key}@x=${c.targetX}(w=${c.charWidth})`).join(" "),
    );
  }
  mockCommitLog = [];
}

beforeEach(() => {
  renderLog.length = 0;
  mockCommitLog = [];
});

test("slot x stays at layout position through the settle window (123,449 -> 199,999)", async () => {
  jest.useFakeTimers();
  seedProportionalMetrics();

  const result = await render(<NumberFlow value={123449} />);
  snapshotCommit("mount:");

  /**
   * Simulate the device's container onLayout: the outer view reports its
   * measured width (content width of 123,449 = 6+10*5+10 = 66).
   */
  const container = result.root;
  const fireLayout = async (width: number) => {
    await act(async () => {
      container?.props.onLayout?.({ nativeEvent: { layout: { width, height: 24, x: 0, y: 0 } } });
    });
  };
  await fireLayout(66);
  snapshotCommit("layout(66):");

  const changeIdx = renderLog.length;
  await result.rerender(<NumberFlow value={199999} />);
  snapshotCommit("change:");

  /**
   * Step through the spin window, firing onLayout mid-animation and at the
   * end the way the animated container minWidth does on device
   * (66 -> 70 as the "1"-narrow content grows).
   */
  for (const [ms, width] of [
    [100, 67],
    [500, 68],
    [1000, 69],
    [2000, 70],
    [4000, 70],
  ] as const) {
    await act(async () => {
      jest.advanceTimersByTime(ms);
    });
    await fireLayout(width);
    snapshotCommit(`+${ms}ms layout(${width}):`);
  }

  /**
   * Expected x for "199,999" with w(1)=6, w(digit)=10, w(,)=10:
   * 1@0, 9@6, 9@16, ,@26, 9@36, 9@46, 9@56.
   * The first "9" (after the narrow 1) must sit at x=6 in EVERY commit
   * after the change; any commit placing it elsewhere reproduces the bug.
   */
  const postChange = renderLog.slice(changeIdx);
  for (const commit of postChange) {
    const nines = commit.filter((c) => c.digitValue === 9);
    expect(nines.map((c) => c.targetX)).toEqual([6, 16, 36, 46, 56]);
  }

  jest.useRealTimers();
});
