import { Canvas, useFont } from "@shopify/react-native-skia";
import { NumberFlow } from "number-flow-react-native/native";
import { SkiaNumberFlow, useSkiaFont } from "number-flow-react-native/skia";
import { useCallback, useEffect, useRef, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { colors } from "../theme/colors";
import { FONT_REGULAR, INTER_FONT_ASSET } from "../theme/fonts";

const FONT_SIZE = 36;
const CANVAS_WIDTH = 280;
const CANVAS_HEIGHT = 52;
const TEST_VALUE = 12345;

const FORMATTED_VALUE = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
}).format(TEST_VALUE);

const FORMAT_OPTIONS: Intl.NumberFormatOptions = {
  useGrouping: true,
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
};

interface TimingResult {
  label: string;
  timeMs: number;
}

/**
 * Wrapper that detects when its child renders visible content via onLayout.
 * For NumberFlow, the first layout has height ~0 (async measurement phase),
 * and the second layout has the real height — so we only fire when height
 * exceeds minHeight.
 */
function VisibilityProbe({
  label,
  startTime,
  onVisible,
  minHeight = 1,
  children,
}: {
  label: string;
  startTime: number;
  onVisible: (result: TimingResult) => void;
  minHeight?: number;
  children: React.ReactNode;
}) {
  const firedRef = useRef(false);

  const handleLayout = useCallback(
    (e: { nativeEvent: { layout: { height: number } } }) => {
      if (firedRef.current) return;
      if (e.nativeEvent.layout.height < minHeight) return;

      firedRef.current = true;
      onVisible({ label, timeMs: performance.now() - startTime });
    },
    [label, startTime, onVisible, minHeight],
  );

  return <View onLayout={handleLayout}>{children}</View>;
}

function TimingBadge({ timeMs }: { timeMs: number | undefined }) {
  if (timeMs === undefined) return null;

  return (
    <Text
      style={{
        fontSize: 13,
        fontWeight: "600",
        color: colors.accent,
        textAlign: "center",
        marginTop: 8,
      }}
    >
      {timeMs.toFixed(1)}ms
    </Text>
  );
}

// ─── Native test run ─────────────────────────────────────────────────────────

function NativeTestRun({
  onAllDone,
}: {
  onAllDone: (results: TimingResult[]) => void;
}) {
  const startTime = useRef(performance.now()).current;
  const [times, setTimes] = useState<Record<string, number>>({});
  const reportedRef = useRef(false);

  const handleVisible = useCallback((result: TimingResult) => {
    setTimes((prev) => ({ ...prev, [result.label]: result.timeMs }));
  }, []);

  useEffect(() => {
    if (reportedRef.current) return;

    const allDone = times.Text !== undefined && times.NumberFlow !== undefined;
    if (!allDone) return;

    reportedRef.current = true;
    onAllDone([
      { label: "Text", timeMs: times.Text },
      { label: "NumberFlow", timeMs: times.NumberFlow },
    ]);
  }, [times, onAllDone]);

  return (
    <View style={{ gap: 16 }}>
      {/* Plain Text baseline */}
      <View style={{ gap: 4 }}>
        <Text style={{ fontSize: 11, color: colors.textSecondary, fontWeight: "600" }}>
          Plain Text (baseline)
        </Text>
        <View
          style={{
            backgroundColor: colors.demoBackground,
            borderRadius: 12,
            padding: 20,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <VisibilityProbe label="Text" onVisible={handleVisible} startTime={startTime}>
            <Text
              style={{ fontFamily: FONT_REGULAR, fontSize: FONT_SIZE, color: colors.text }}
            >
              {FORMATTED_VALUE}
            </Text>
          </VisibilityProbe>
          <TimingBadge timeMs={times.Text} />
        </View>
      </View>

      {/* NumberFlow Native */}
      <View style={{ gap: 4 }}>
        <Text style={{ fontSize: 11, color: colors.textSecondary, fontWeight: "600" }}>
          NumberFlow (Native)
        </Text>
        <View
          style={{
            backgroundColor: colors.demoBackground,
            borderRadius: 12,
            padding: 20,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <VisibilityProbe
            label="NumberFlow"
            minHeight={10}
            onVisible={handleVisible}
            startTime={startTime}
          >
            <NumberFlow
              containerStyle={{ width: CANVAS_WIDTH }}
              format={FORMAT_OPTIONS}
              mask={false}
              style={{ fontFamily: FONT_REGULAR, fontSize: FONT_SIZE, color: colors.text }}
              textAlign="center"
              value={TEST_VALUE}
            />
          </VisibilityProbe>
          <TimingBadge timeMs={times.NumberFlow} />
        </View>
      </View>
    </View>
  );
}

export const PerformanceDemoNative = () => {
  const [runKey, setRunKey] = useState(0);
  const [mounted, setMounted] = useState(false);
  const [allRuns, setAllRuns] = useState<TimingResult[][]>([]);

  const handleAllDone = useCallback((results: TimingResult[]) => {
    setAllRuns((prev) => [...prev, results]);
  }, []);

  const runTest = useCallback(() => {
    setMounted(false);
    requestAnimationFrame(() => {
      setRunKey((k) => k + 1);
      setMounted(true);
    });
  }, []);

  const latestRun = allRuns.length > 0 ? allRuns[allRuns.length - 1] : undefined;
  const latestOverhead = latestRun
    ? (latestRun.find((r) => r.label === "NumberFlow")?.timeMs ?? 0) -
      (latestRun.find((r) => r.label === "Text")?.timeMs ?? 0)
    : 0;

  const averages =
    allRuns.length > 1
      ? (["Text", "NumberFlow"] as const).map((label) => {
          const times = allRuns.map((run) => run.find((r) => r.label === label)?.timeMs ?? 0);
          const avg = times.reduce((a, b) => a + b, 0) / times.length;
          return { label, avg };
        })
      : [];

  return (
    <View style={{ gap: 16 }}>
      {/* Run button */}
      <Pressable
        onPress={runTest}
        style={{
          backgroundColor: colors.accent,
          borderRadius: 8,
          padding: 12,
          alignItems: "center",
        }}
      >
        <Text style={{ fontSize: 14, fontWeight: "600", color: "#FFFFFF" }}>
          {mounted ? "Re-run Test" : "Run Mount Test"}
        </Text>
      </Pressable>

      {/* Test components */}
      {mounted && <NativeTestRun key={runKey} onAllDone={handleAllDone} />}

      {/* Overhead summary */}
      {latestRun && (
        <View
          style={{
            padding: 12,
            backgroundColor: colors.demoBackground,
            borderRadius: 8,
            gap: 4,
          }}
        >
          <Text style={{ fontSize: 13, fontWeight: "600", color: colors.text }}>
            Overhead: +{latestOverhead.toFixed(1)}ms
          </Text>
          <Text style={{ fontSize: 11, color: colors.textSecondary }}>
            NumberFlow takes {latestOverhead.toFixed(1)}ms longer than plain Text to become visible
          </Text>
        </View>
      )}

      {/* Averages */}
      {averages.length > 0 && (
        <View
          style={{
            padding: 12,
            backgroundColor: colors.demoBackground,
            borderRadius: 8,
            gap: 4,
          }}
        >
          <Text style={{ fontSize: 13, fontWeight: "600", color: colors.text }}>
            Averages ({allRuns.length} runs)
          </Text>
          {averages.map((a) => (
            <Text
              key={a.label}
              style={{ fontSize: 12, color: colors.textSecondary, fontFamily: "monospace" }}
            >
              {a.label.padEnd(14)} {a.avg.toFixed(1).padStart(7)}ms
            </Text>
          ))}
        </View>
      )}

      {/* Run history */}
      {allRuns.length > 1 && (
        <View
          style={{
            padding: 12,
            backgroundColor: colors.demoBackground,
            borderRadius: 8,
            gap: 4,
          }}
        >
          <Text style={{ fontSize: 13, fontWeight: "600", color: colors.text }}>History</Text>
          {allRuns.map((run, i) => {
            const textTime = run.find((r) => r.label === "Text")?.timeMs ?? 0;
            const nfTime = run.find((r) => r.label === "NumberFlow")?.timeMs ?? 0;
            const overhead = nfTime - textTime;
            return (
              <Text
                key={i}
                style={{ fontSize: 11, color: colors.textSecondary, fontFamily: "monospace" }}
              >
                #{String(i + 1).padStart(2)}: Text={textTime.toFixed(1)}ms NF=
                {nfTime.toFixed(1)}ms (+{overhead.toFixed(1)}ms)
              </Text>
            );
          })}
        </View>
      )}
    </View>
  );
};

// ─── Skia test run ───────────────────────────────────────────────────────────

// Track whether the font has been loaded at least once across remounts.
// After the first load, Skia.Data.fromURI() resolves from cache almost instantly.
let skiaFontLoadedOnce = false;

function SkiaTestRun({
  onDone,
}: {
  onDone: (result: { fontLoadMs: number; cached: boolean }) => void;
}) {
  // useFont path — returns null until font loads (internal matchFont fallback shows static text)
  const rawFont = useFont(INTER_FONT_ASSET, FONT_SIZE);

  // useSkiaFont path — always non-null (system font → custom font swap)
  const smartFont = useSkiaFont(INTER_FONT_ASSET, FONT_SIZE);

  const startTime = useRef(performance.now()).current;
  const [fontLoadMs, setFontLoadMs] = useState<number | null>(null);
  const firedRef = useRef(false);
  const wasCached = useRef(skiaFontLoadedOnce);

  useEffect(() => {
    if (firedRef.current || !rawFont) return;

    firedRef.current = true;
    skiaFontLoadedOnce = true;
    const elapsed = performance.now() - startTime;
    setFontLoadMs(elapsed);
    onDone({ fontLoadMs: elapsed, cached: wasCached.current });
  }, [rawFont, startTime, onDone]);

  const fontLoaded = rawFont !== null;

  return (
    <View style={{ gap: 16 }}>
      {/* useFont — internal fallback (two-phase: static text → animated slots) */}
      <View style={{ gap: 4 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
          <Text style={{ fontSize: 11, color: colors.textSecondary, fontWeight: "600" }}>
            useFont (internal fallback)
          </Text>
          {!fontLoaded && (
            <Text style={{ fontSize: 10, color: colors.accent, fontWeight: "600" }}>
              loading...
            </Text>
          )}
          {fontLoaded && wasCached.current && (
            <Text style={{ fontSize: 10, color: colors.textSecondary }}>(cached)</Text>
          )}
        </View>
        <View
          style={{
            backgroundColor: colors.demoBackground,
            borderRadius: 12,
            padding: 20,
            alignItems: "center",
            justifyContent: "center",
            borderWidth: fontLoaded ? 0 : 1,
            borderColor: colors.accent,
            borderStyle: "dashed",
          }}
        >
          <Canvas style={{ width: CANVAS_WIDTH, height: CANVAS_HEIGHT }}>
            <SkiaNumberFlow
              color={colors.text}
              font={rawFont}
              format={FORMAT_OPTIONS}
              mask={false}
              textAlign="center"
              value={TEST_VALUE}
              width={CANVAS_WIDTH}
              y={FONT_SIZE}
            />
          </Canvas>
          {fontLoaded && <TimingBadge timeMs={fontLoadMs ?? undefined} />}
        </View>
        <Text style={{ fontSize: 10, color: colors.textSecondary, textAlign: "center" }}>
          Shows static system font text until custom font loads, then animated slots
        </Text>
      </View>

      {/* useSkiaFont — always animated (single-phase: animated from frame 1) */}
      <View style={{ gap: 4 }}>
        <Text style={{ fontSize: 11, color: colors.accent, fontWeight: "600" }}>
          useSkiaFont (animated fallback)
        </Text>
        <View
          style={{
            backgroundColor: colors.demoBackground,
            borderRadius: 12,
            padding: 20,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Canvas style={{ width: CANVAS_WIDTH, height: CANVAS_HEIGHT }}>
            <SkiaNumberFlow
              color={colors.accent}
              font={smartFont}
              format={FORMAT_OPTIONS}
              mask={false}
              textAlign="center"
              value={TEST_VALUE}
              width={CANVAS_WIDTH}
              y={FONT_SIZE}
            />
          </Canvas>
          <TimingBadge timeMs={0} />
        </View>
        <Text style={{ fontSize: 10, color: colors.textSecondary, textAlign: "center" }}>
          Animated from frame 1 with system font, smooth swap when custom font loads
        </Text>
      </View>
    </View>
  );
}

interface FontLoadRun {
  fontLoadMs: number;
  cached: boolean;
}

export const PerformanceDemoSkia = () => {
  const [runKey, setRunKey] = useState(0);
  const [mounted, setMounted] = useState(false);
  const [allRuns, setAllRuns] = useState<FontLoadRun[]>([]);

  const handleDone = useCallback((result: FontLoadRun) => {
    setAllRuns((prev) => [...prev, result]);
  }, []);

  const runTest = useCallback(() => {
    setMounted(false);
    requestAnimationFrame(() => {
      setRunKey((k) => k + 1);
      setMounted(true);
    });
  }, []);

  const latestRun = allRuns.length > 0 ? allRuns[allRuns.length - 1] : undefined;

  const coldRuns = allRuns.filter((r) => !r.cached);
  const cachedRuns = allRuns.filter((r) => r.cached);

  const coldAvg =
    coldRuns.length > 0
      ? coldRuns.reduce((sum, r) => sum + r.fontLoadMs, 0) / coldRuns.length
      : null;

  const cachedAvg =
    cachedRuns.length > 0
      ? cachedRuns.reduce((sum, r) => sum + r.fontLoadMs, 0) / cachedRuns.length
      : null;

  return (
    <View style={{ gap: 16 }}>
      {/* Run button */}
      <Pressable
        onPress={runTest}
        style={{
          backgroundColor: colors.accent,
          borderRadius: 8,
          padding: 12,
          alignItems: "center",
        }}
      >
        <Text style={{ fontSize: 14, fontWeight: "600", color: "#FFFFFF" }}>
          {mounted ? "Re-run Test" : "Run Mount Test"}
        </Text>
      </Pressable>

      {/* Test component */}
      {mounted && <SkiaTestRun key={runKey} onDone={handleDone} />}

      {/* Latest result */}
      {latestRun && (
        <View
          style={{
            padding: 12,
            backgroundColor: colors.demoBackground,
            borderRadius: 8,
            gap: 4,
          }}
        >
          <Text style={{ fontSize: 13, fontWeight: "600", color: colors.text }}>
            Custom font loaded in {latestRun.fontLoadMs.toFixed(1)}ms
            {latestRun.cached ? " (cached)" : " (cold)"}
          </Text>
          <Text style={{ fontSize: 11, color: colors.textSecondary }}>
            {latestRun.cached
              ? "useFont: async cycle even from cache. useSkiaFont: animated with system font while waiting."
              : "useFont: blank until loaded. useSkiaFont: animated from frame 1 with system font fallback."}
          </Text>
        </View>
      )}

      {/* Averages */}
      {allRuns.length > 1 && (
        <View
          style={{
            padding: 12,
            backgroundColor: colors.demoBackground,
            borderRadius: 8,
            gap: 4,
          }}
        >
          <Text style={{ fontSize: 13, fontWeight: "600", color: colors.text }}>
            Averages ({allRuns.length} runs)
          </Text>
          {coldAvg !== null && (
            <Text style={{ fontSize: 12, color: colors.textSecondary, fontFamily: "monospace" }}>
              Cold ({coldRuns.length})   {coldAvg.toFixed(1).padStart(7)}ms
            </Text>
          )}
          {cachedAvg !== null && (
            <Text style={{ fontSize: 12, color: colors.textSecondary, fontFamily: "monospace" }}>
              Cached ({cachedRuns.length}) {cachedAvg.toFixed(1).padStart(7)}ms
            </Text>
          )}
        </View>
      )}

      {/* Run history */}
      {allRuns.length > 1 && (
        <View
          style={{
            padding: 12,
            backgroundColor: colors.demoBackground,
            borderRadius: 8,
            gap: 4,
          }}
        >
          <Text style={{ fontSize: 13, fontWeight: "600", color: colors.text }}>History</Text>
          {allRuns.map((run, i) => (
            <Text
              key={i}
              style={{ fontSize: 11, color: colors.textSecondary, fontFamily: "monospace" }}
            >
              #{String(i + 1).padStart(2)}: {run.fontLoadMs.toFixed(1).padStart(7)}ms
              {run.cached ? " (cached)" : " (cold)"}
            </Text>
          ))}
        </View>
      )}
    </View>
  );
};
