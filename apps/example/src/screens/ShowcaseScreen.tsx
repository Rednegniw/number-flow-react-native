import {
  Canvas,
  Circle,
  DashPathEffect,
  Group,
  Line,
  LinearGradient,
  matchFont,
  Paint,
  RoundedRect,
  Skia,
  Image as SkiaImage,
  Path as SkiaPath,
  Rect as SkiaRect,
  Text as SkiaText,
  useImage,
  usePathValue,
  vec,
} from "@shopify/react-native-skia";
import type { Trend } from "number-flow-react-native";
import { SkiaNumberFlow, SkiaTimeFlow, useSkiaFont } from "number-flow-react-native/skia";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { StatusBar, useWindowDimensions } from "react-native";
import {
  cancelAnimation,
  Easing,
  useDerivedValue,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { INTER_FONT_ASSET, INTER_SEMIBOLD_FONT_ASSET } from "../theme/fonts";

// ─── Font assets ───────────────────────────────────────────

const GOOGLE_SANS_REGULAR = require("../../assets/fonts/GoogleSans-Regular.ttf");
const GOOGLE_SANS_SEMIBOLD = require("../../assets/fonts/GoogleSans-SemiBold.ttf");
const ORBITRON_MEDIUM = require("../../assets/fonts/Orbitron-Medium.ttf");

// ─── General ───────────────────────────────────────────────

const ORBITRON_BOLD = require("../../assets/fonts/Orbitron-Bold.ttf");

const BACKGROUND = "#0A0A0A";
const FADE_DURATION = 300;
const SCENE_DURATION = 4000;
const PAUSE_DURATION = 5000;
const TOTAL_SCENES = 6;
const easeInOut = Easing.inOut(Easing.ease);

// ─── Scene 2: Step Counter ─────────────────────────────────

const DAILY_GOAL = 6000;
const WATCH_SIZE = 360;
const WATCH_STROKE = 16;
const WATCH_RADIUS = (WATCH_SIZE - WATCH_STROKE) / 2 - 6;
const ARC_DEGREES = 240;
const ARC_ROTATION = 150;
const DAYS = ["S", "M", "T", "W", "T", "F", "S"];
const ACTIVITY_DAYS = [1, 2, 3, 4];

const SHOE_SVG =
  "M2 15C2 15 2 12 4 12C4.68 12 5.46 11.95 6.28 11.82C7.2 12.54 8.5 13 10 13H10.25L8.56 11.29C8.91 11.18 9.25 11.05 9.59 10.91L11.5 12.82C11.89 12.74 12.25 12.63 12.58 12.5L10.55 10.45C10.85 10.28 11.14 10.11 11.43 9.91L13.5 12C13.8 11.79 14.04 11.56 14.25 11.32L12.22 9.29C12.46 9.07 12.7 8.83 12.92 8.58L14.79 10.45C14.91 10.14 15 9.83 15 9.5C15 8.65 14.55 7.89 13.84 7.28C13.89 7.19 13.95 7.1 14 7L15.53 6.23C16.38 7.17 18.14 7.84 20.25 7.97L20.3 8H21C21 8 22 9 22 12.5C22 13.07 22 13.57 21.96 14H19C17.9 14 16.58 14.26 15.3 14.5C14.12 14.76 12.9 15 12 15H2M21 17C21 17 21.58 17 21.86 15H19C17 15 14 16 12 16H2.28C2.62 16.6 3.26 17 4 17H21Z";

// ─── Scene 4: Trading Ticker ───────────────────────────────

const GREEN = "#34C759";
const RED = "#FF3B30";

const TICKER_PADDING_H = 16;
const TICKER_ROW_H = 68;
const SPARKLINE_W = 60;
const SPARKLINE_H = 34;
const SPARKLINE_GAP = 8;
const PRICE_COL_W = 100;
const BADGE_W = 68;
const BADGE_H = 24;

interface Stock {
  symbol: string;
  name: string;
  basePrice: number;
  price: number;
  prevPrice: number;
  change: number;
  sparkline: number[];
  isPositive: boolean;
}

function generateSparkline(base: number, isPositive: boolean): number[] {
  const points: number[] = [];
  let price = base;

  for (let i = 0; i < 20; i++) {
    const bias = isPositive ? 0.0008 : -0.0008;
    const noise = (Math.random() - 0.5) * base * 0.005;
    price += bias * base + noise;
    points.push(price);
  }

  return points;
}

function createStock(symbol: string, name: string, basePrice: number, isPositive: boolean): Stock {
  const sparkline = generateSparkline(basePrice, isPositive);
  const price = sparkline[sparkline.length - 1];

  return {
    symbol,
    name,
    basePrice,
    price,
    prevPrice: price,
    change: price - basePrice,
    sparkline,
    isPositive,
  };
}

const INITIAL_STOCKS: Stock[] = [
  createStock("AAPL", "Apple Inc.", 263.47, true),
  createStock("GOOGL", "Alphabet Inc.", 176.32, true),
  createStock("MSFT", "Microsoft Corp.", 420.55, true),
  createStock("TSLA", "Tesla Inc.", 248.5, false),
  createStock("NVDA", "NVIDIA Corp.", 875.28, true),
  createStock("BA", "The Boeing Company", 232.95, false),
  createStock("DIS", "The Walt Disney Company", 105.67, false),
];

const priceFormat: Intl.NumberFormatOptions = {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
};

const changeFormat: Intl.NumberFormatOptions = {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
  signDisplay: "exceptZero",
};

const trendFn = (prev: number, next: number): Trend => {
  if (next > prev) return 1;
  if (next < prev) return -1;
  return 0;
};

// ─── Scene 5: Countdown ────────────────────────────────────

const MARS_IMAGE_URL =
  "https://images.unsplash.com/photo-1630694093867-4b947d812bf0?w=800&q=80&auto=format";
const COUNTDOWN_BG = "#050510";
const INITIAL_COUNTDOWN = 19 * 3600 + 23 * 60 + 45; // 19:23:45

// ─── Helpers ───────────────────────────────────────────────

function buildSparklinePaths(data: number[], x: number, y: number, w: number, h: number) {
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const pad = 2;
  const innerH = h - pad * 2;

  const pts = data.map((val, i) => ({
    px: x + (i / (data.length - 1)) * w,
    py: y + pad + innerH - ((val - min) / range) * innerH,
  }));

  const linePath = Skia.Path.Make();
  linePath.moveTo(pts[0].px, pts[0].py);
  for (let i = 1; i < pts.length; i++) {
    linePath.lineTo(pts[i].px, pts[i].py);
  }

  const areaPath = Skia.Path.Make();
  areaPath.moveTo(pts[0].px, pts[0].py);
  for (let i = 1; i < pts.length; i++) {
    areaPath.lineTo(pts[i].px, pts[i].py);
  }
  areaPath.lineTo(x + w, y + h);
  areaPath.lineTo(x, y + h);
  areaPath.close();

  return { linePath, areaPath, refY: pts[0].py };
}

// ════════════════════════════════════════════════════════════

export const ShowcaseScreen = () => {
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();

  // ─── Fonts ─────────────────────────────────────────────

  const interSemiBold72 = useSkiaFont(INTER_SEMIBOLD_FONT_ASSET, 72);
  const googleSansSemiBold64 = useSkiaFont(GOOGLE_SANS_SEMIBOLD, 64);
  const googleSansRegular20 = useSkiaFont(GOOGLE_SANS_REGULAR, 20);
  const interSemiBold16Day = useSkiaFont(INTER_SEMIBOLD_FONT_ASSET, 16);
  const sfProLight88 = useMemo(() => matchFont({ fontSize: 88, fontWeight: "200" }), []);
  const sfProMedium19 = useMemo(() => matchFont({ fontSize: 19, fontWeight: "500" }), []);
  const interSemiBold19 = useSkiaFont(INTER_SEMIBOLD_FONT_ASSET, 19);
  const interRegular16 = useSkiaFont(INTER_FONT_ASSET, 16);
  const interSemiBold22 = useSkiaFont(INTER_SEMIBOLD_FONT_ASSET, 22);
  const interSemiBold15 = useSkiaFont(INTER_SEMIBOLD_FONT_ASSET, 15);
  const orbitronMedium14 = useSkiaFont(ORBITRON_MEDIUM, 14);
  const orbitronBold56 = useSkiaFont(ORBITRON_BOLD, 56);

  // ─── Scene state ───────────────────────────────────────

  const opacity = useSharedValue(0);
  const [sceneIndex, setSceneIndex] = useState(0);

  // Scene 1: Hero Numbers
  const [heroValue, setHeroValue] = useState(42);
  const [heroFormat, setHeroFormat] = useState<Intl.NumberFormatOptions>({
    useGrouping: true,
  });

  // Scene 2: Step Counter
  const [steps, setSteps] = useState(1000);

  // Scene 3: Stopwatch (total centiseconds, starting at 03:42.15)
  const [swTotal, setSwTotal] = useState(3 * 6000 + 42 * 100 + 15);

  // Scene 4: Trading Ticker
  const [stocks, setStocks] = useState(INITIAL_STOCKS);
  const staggerProgress = useSharedValue(0);

  const rowOpacity0 = useDerivedValue(() =>
    Math.min(Math.max((staggerProgress.value - 0.0) / 0.3, 0), 1),
  );
  const rowOpacity1 = useDerivedValue(() =>
    Math.min(Math.max((staggerProgress.value - 0.1) / 0.3, 0), 1),
  );
  const rowOpacity2 = useDerivedValue(() =>
    Math.min(Math.max((staggerProgress.value - 0.2) / 0.3, 0), 1),
  );
  const rowOpacity3 = useDerivedValue(() =>
    Math.min(Math.max((staggerProgress.value - 0.3) / 0.3, 0), 1),
  );
  const rowOpacity4 = useDerivedValue(() =>
    Math.min(Math.max((staggerProgress.value - 0.4) / 0.3, 0), 1),
  );
  const rowOpacity5 = useDerivedValue(() =>
    Math.min(Math.max((staggerProgress.value - 0.5) / 0.3, 0), 1),
  );
  const rowOpacity6 = useDerivedValue(() =>
    Math.min(Math.max((staggerProgress.value - 0.6) / 0.3, 0), 1),
  );
  const rowOpacities = [
    rowOpacity0,
    rowOpacity1,
    rowOpacity2,
    rowOpacity3,
    rowOpacity4,
    rowOpacity5,
    rowOpacity6,
  ];

  // Scene 5: Countdown
  const [cdRemaining, setCdRemaining] = useState(INITIAL_COUNTDOWN);

  // Mars background image (starts loading immediately)
  const marsImage = useImage(MARS_IMAGE_URL);

  // ─── Timing refs ───────────────────────────────────────

  const timeoutsRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const intervalsRef = useRef<ReturnType<typeof setInterval>[]>([]);

  const advanceScene = useCallback(() => {
    setSceneIndex((prev) => (prev + 1) % TOTAL_SCENES);
  }, []);

  // ─── Scene 2: Arc paths ────────────────────────────────

  const watchCX = screenWidth / 2;
  const watchCY = screenHeight / 2;

  const arcOval = useMemo(
    () =>
      Skia.XYWHRect(
        watchCX - WATCH_RADIUS,
        watchCY - WATCH_RADIUS,
        WATCH_RADIUS * 2,
        WATCH_RADIUS * 2,
      ),
    [watchCX, watchCY],
  );

  const bgArcPath = useMemo(() => {
    const p = Skia.Path.Make();
    p.addArc(arcOval, ARC_ROTATION, ARC_DEGREES);
    return p;
  }, [arcOval]);

  const arcProgress = useSharedValue(0);

  const fgArcPath = usePathValue((path) => {
    "worklet";
    const sweep = ARC_DEGREES * arcProgress.value;
    if (sweep > 0) {
      path.addArc(arcOval, ARC_ROTATION, sweep);
    }
  });

  const shoePath = useMemo(() => Skia.Path.MakeFromSVGString(SHOE_SVG), []);

  const currentDay = useMemo(() => new Date().getDay(), []);

  // ─── Scene 3: Stopwatch derived values ─────────────────

  const swMinutes = Math.floor(swTotal / 6000);
  const swSeconds = Math.floor((swTotal % 6000) / 100);
  const swCentiseconds = swTotal % 100;

  const swTimeY = screenHeight * 0.35;
  const swDotsY = swTimeY + 55;
  const swBtnY = swTimeY + 165;
  const swLeftBtnX = 16 + 46;
  const swRightBtnX = screenWidth - 16 - 46;

  // ─── Scene 4: Layout values ────────────────────────────

  const totalTickerH = 7 * TICKER_ROW_H;
  const tickerTopY = (screenHeight - totalTickerH) / 2;
  const sparklineX = screenWidth - TICKER_PADDING_H - PRICE_COL_W - SPARKLINE_GAP - SPARKLINE_W;
  const priceColX = screenWidth - TICKER_PADDING_H - PRICE_COL_W;

  const sparklineData = useMemo(() => {
    return stocks.map((stock, i) => {
      const rowY = tickerTopY + i * TICKER_ROW_H;
      const sy = rowY + (TICKER_ROW_H - SPARKLINE_H) / 2;
      return buildSparklinePaths(stock.sparkline, sparklineX, sy, SPARKLINE_W, SPARKLINE_H);
    });
  }, [stocks, sparklineX, tickerTopY]);

  // ─── Scene 5: Layout values ────────────────────────────

  const cdBoxH = 90;
  const cdBoxBottom = screenHeight * 0.72;
  const cdBoxTop = cdBoxBottom - cdBoxH;
  const cdTimeY = cdBoxTop + 66;
  const cdHeaderY = cdBoxTop - 18;

  const cdHours = Math.floor(cdRemaining / 3600);
  const cdMinutes = Math.floor((cdRemaining % 3600) / 60);
  const cdSeconds = cdRemaining % 60;

  // ─── Pre-computed text positions ───────────────────────

  // Scene 2
  const goalText = `/ ${DAILY_GOAL.toLocaleString()} steps`;
  const goalTextWidth = googleSansRegular20.measureText(goalText).width;
  const goalTextX = watchCX - goalTextWidth / 2;

  // Scene 3
  const lapTextWidth = sfProMedium19.measureText("Lap").width;
  const lapTextX = swLeftBtnX - lapTextWidth / 2;
  const stopTextWidth = sfProMedium19.measureText("Stop").width;
  const stopTextX = swRightBtnX - stopTextWidth / 2;

  // Scene 5
  const cdHeaderText = "LANDING ON MARS IN";
  const cdHeaderWidth = orbitronMedium14.measureText(cdHeaderText).width;
  const cdHeaderX = screenWidth / 2 - cdHeaderWidth / 2;

  // ─── Scene timing ─────────────────────────────────────

  useEffect(() => {
    const timeouts = timeoutsRef.current;
    const intervals = intervalsRef.current;

    timeouts.forEach(clearTimeout);
    intervals.forEach(clearInterval);
    timeouts.length = 0;
    intervals.length = 0;

    const schedule = (fn: () => void, delay: number) => {
      timeouts.push(setTimeout(fn, delay));
    };

    // Snap opacity to 0 to prevent residual flicker from previous scene
    cancelAnimation(opacity);
    opacity.value = 0;

    // Reset shared state so remounting scenes don't flash stale values
    setSteps(1000);
    arcProgress.value = 0;

    // Reset state for current scene
    switch (sceneIndex) {
      case 0:
        setHeroValue(42);
        setHeroFormat({ useGrouping: true });
        break;
      case 2:
        setSwTotal(3 * 6000 + 42 * 100 + 15);
        break;
      case 3:
        setStocks(INITIAL_STOCKS);
        staggerProgress.value = 0;
        break;
      case 4:
        setCdRemaining(INITIAL_COUNTDOWN);
        break;
    }

    // Fade in (delayed one frame so the canvas renders at opacity=0 first)
    schedule(() => {
      opacity.value = withTiming(1, {
        duration: FADE_DURATION,
        easing: easeInOut,
      });
    }, 17);

    // Per-scene mutations
    switch (sceneIndex) {
      case 0: {
        // Currency
        schedule(() => {
          setHeroValue(123.45);
          setHeroFormat({
            style: "currency",
            currency: "USD",
            minimumFractionDigits: 2,
          });
        }, 1100);

        // Scientific notation
        schedule(() => {
          setHeroValue(1234);
          setHeroFormat({
            notation: "scientific",
            maximumFractionDigits: 2,
          });
        }, 2200);

        // Roll the exponent (3 → 5)
        schedule(() => {
          setHeroValue(123456);
        }, 3200);

        break;
      }

      case 1: {
        // Animate steps 1000→3458 and arc 0→progress after fade-in
        schedule(() => {
          setSteps(3458);
          arcProgress.value = withTiming(Math.min(3458 / DAILY_GOAL, 1), {
            duration: 800,
            easing: Easing.out(Easing.cubic),
          });
        }, FADE_DURATION + 100);

        // Increment steps and animate arc to new progress
        const interval = setInterval(() => {
          setSteps((prev) => {
            const newSteps = prev + Math.floor(Math.random() * 12) + 1;
            arcProgress.value = withTiming(Math.min(newSteps / DAILY_GOAL, 1), { duration: 400 });
            return newSteps;
          });
        }, 1500);
        intervals.push(interval);
        break;
      }

      case 2: {
        const interval = setInterval(() => {
          setSwTotal((prev) => prev + 4);
        }, 40);
        intervals.push(interval);
        break;
      }

      case 3: {
        // Staggered row reveal after fade-in
        schedule(() => {
          staggerProgress.value = withTiming(1, {
            duration: 600,
            easing: Easing.out(Easing.quad),
          });
        }, FADE_DURATION);

        const updatePrices = () => {
          setStocks((prev) =>
            prev.map((stock) => {
              const bias = stock.isPositive ? 0.3 : -0.3;
              const delta = (Math.random() - 0.5 + bias * 0.1) * stock.basePrice * 0.003;
              const newPrice = Math.max(stock.basePrice * 0.95, stock.price + delta);
              const newSparkline = [...stock.sparkline.slice(-19), newPrice];

              return {
                ...stock,
                prevPrice: stock.price,
                price: newPrice,
                change: newPrice - stock.basePrice,
                sparkline: newSparkline,
              };
            }),
          );
        };

        // First update as rows reveal so NumberFlows animate on entrance
        schedule(updatePrices, FADE_DURATION + 100);

        const interval = setInterval(updatePrices, 2500);
        intervals.push(interval);
        break;
      }

      case 4: {
        const interval = setInterval(() => {
          setCdRemaining((prev) => Math.max(0, prev - 1));
        }, 1000);
        intervals.push(interval);
        break;
      }
    }

    // Scene 5 is a blank pause for recording — skip fade, just wait
    const isPause = sceneIndex === 5;
    const duration = isPause ? PAUSE_DURATION : SCENE_DURATION;

    if (!isPause) {
      schedule(() => {
        opacity.value = withTiming(0, {
          duration: FADE_DURATION,
          easing: easeInOut,
        });
      }, duration - FADE_DURATION);
    }

    schedule(advanceScene, duration);

    return () => {
      timeouts.forEach(clearTimeout);
      intervals.forEach(clearInterval);
      timeouts.length = 0;
      intervals.length = 0;
    };
  }, [sceneIndex, opacity, advanceScene, arcProgress, staggerProgress]);

  // ─── Render ────────────────────────────────────────────

  return (
    <>
      <StatusBar hidden />
      <Canvas style={{ flex: 1, backgroundColor: BACKGROUND }}>
        {/* ═══ Scene 1: Hero Numbers ═══ */}
        {sceneIndex === 0 && (
          <SkiaNumberFlow
            value={heroValue}
            format={heroFormat}
            locales="en-US"
            font={interSemiBold72}
            color="#fff"
            opacity={opacity}
            textAlign="center"
            width={screenWidth}
            y={screenHeight / 2}
          />
        )}

        {/* ═══ Scene 2: Step Counter ═══ */}
        {sceneIndex === 1 && (
          <Group layer={<Paint opacity={opacity} />}>
            {/* Watch face background */}
            <Circle cx={watchCX} cy={watchCY} r={WATCH_SIZE / 2} color="#000" />

            {/* Background arc */}
            <SkiaPath
              path={bgArcPath}
              color="#222"
              style="stroke"
              strokeWidth={WATCH_STROKE}
              strokeCap="round"
            />

            {/* Foreground arc */}
            <SkiaPath
              path={fgArcPath}
              color="#00E676"
              style="stroke"
              strokeWidth={WATCH_STROKE}
              strokeCap="round"
            />

            {/* Shoe icon */}
            {shoePath && (
              <Group
                transform={[
                  { translateX: watchCX - 22 },
                  { translateY: watchCY - 84 },
                  { scale: 44 / 24 },
                ]}
              >
                <SkiaPath path={shoePath} color="#00E676" />
              </Group>
            )}

            {/* Step count */}
            <SkiaNumberFlow
              value={steps}
              continuous
              font={googleSansSemiBold64}
              color="#fff"
              textAlign="center"
              width={screenWidth}
              y={watchCY + 12}
              format={{ useGrouping: true }}
            />

            {/* Goal label */}
            <SkiaText
              font={googleSansRegular20}
              text={goalText}
              x={goalTextX}
              y={watchCY + 40}
              color="#666"
            />

            {/* Pagination dots */}
            {[0, 1, 2, 3].map((i) => (
              <Circle
                key={`dot-${i}`}
                cx={watchCX - 18 + i * 12}
                cy={watchCY + 62}
                r={4}
                color={i === 1 ? "#FF6D00" : "#333"}
              />
            ))}

            {/* Weekday row */}
            {DAYS.map((day, i) => {
              const isToday = i === currentDay;
              const hasActivity = ACTIVITY_DAYS.includes(i);
              const dayCX = watchCX - 119 + i * 34 + 17;
              const dayRowY = watchCY + WATCH_SIZE / 2 - 42;
              const dayTextWidth = interSemiBold16Day.measureText(day).width;
              const dayTextX = dayCX - dayTextWidth / 2;

              return (
                <Group key={`day-${i}`}>
                  {isToday && <Circle cx={dayCX} cy={dayRowY} r={15} color="#333" />}
                  <SkiaText
                    font={interSemiBold16Day}
                    text={day}
                    x={dayTextX}
                    y={dayRowY + 6}
                    color={isToday ? "#fff" : "#555"}
                  />
                  {hasActivity && <Circle cx={dayCX} cy={dayRowY + 22} r={2.5} color="#FF6D00" />}
                </Group>
              );
            })}
          </Group>
        )}

        {/* ═══ Scene 3: Apple Stopwatch ═══ */}
        {sceneIndex === 2 && (
          <Group layer={<Paint opacity={opacity} />}>
            {/* Time display */}
            <SkiaTimeFlow
              minutes={swMinutes}
              seconds={swSeconds}
              centiseconds={swCentiseconds}
              trend={1}
              tabularNums
              font={sfProLight88}
              color="#fff"
              textAlign="center"
              width={screenWidth}
              y={swTimeY}
            />

            {/* Pagination dots */}
            <Circle cx={screenWidth / 2 - 7} cy={swDotsY} r={4} color="#fff" />
            <Circle cx={screenWidth / 2 + 7} cy={swDotsY} r={4} color="rgba(255,255,255,0.3)" />

            {/* Button: Lap (left) */}
            <Circle
              cx={swLeftBtnX}
              cy={swBtnY}
              r={46}
              color="#333"
              style="stroke"
              strokeWidth={2}
            />
            <Circle cx={swLeftBtnX} cy={swBtnY} r={42} color="#333" />
            <SkiaText font={sfProMedium19} text="Lap" x={lapTextX} y={swBtnY + 7} color="#fff" />

            {/* Button: Stop (right) */}
            <Circle
              cx={swRightBtnX}
              cy={swBtnY}
              r={46}
              color="rgba(255,59,48,0.3)"
              style="stroke"
              strokeWidth={2}
            />
            <Circle cx={swRightBtnX} cy={swBtnY} r={42} color="rgba(255,59,48,0.3)" />
            <SkiaText
              font={sfProMedium19}
              text="Stop"
              x={stopTextX}
              y={swBtnY + 7}
              color="#FF3B30"
            />
          </Group>
        )}

        {/* ═══ Scene 4: Trading Ticker ═══ */}
        {sceneIndex === 3 && (
          <Group layer={<Paint opacity={opacity} />}>
            {stocks.map((stock, i) => {
              const rowY = tickerTopY + i * TICKER_ROW_H;
              const isLast = i === stocks.length - 1;
              const color = stock.isPositive ? GREEN : RED;
              const sparkPaths = sparklineData[i];
              const sparkY = rowY + (TICKER_ROW_H - SPARKLINE_H) / 2;

              const badgeX = priceColX + PRICE_COL_W - BADGE_W;
              const badgeY = rowY + 40;

              const refLineColor = stock.isPositive
                ? "rgba(52,199,89,0.25)"
                : "rgba(255,59,48,0.25)";
              const areaColorTop = stock.isPositive ? "rgba(52,199,89,0.3)" : "rgba(255,59,48,0.3)";
              const areaColorBottom = stock.isPositive
                ? "rgba(52,199,89,0.02)"
                : "rgba(255,59,48,0.02)";

              return (
                <Group key={stock.symbol} layer={<Paint opacity={rowOpacities[i]} />}>
                  {/* Symbol */}
                  <SkiaText
                    font={interSemiBold19}
                    text={stock.symbol}
                    x={TICKER_PADDING_H}
                    y={rowY + 27}
                    color="#fff"
                  />

                  {/* Company name */}
                  <SkiaText
                    font={interRegular16}
                    text={stock.name}
                    x={TICKER_PADDING_H}
                    y={rowY + 48}
                    color="#8E8E93"
                  />

                  {/* Sparkline: dashed reference line */}
                  <Line
                    p1={vec(sparklineX, sparkPaths.refY)}
                    p2={vec(sparklineX + SPARKLINE_W, sparkPaths.refY)}
                    color={refLineColor}
                    strokeWidth={1}
                  >
                    <DashPathEffect intervals={[2, 2]} />
                  </Line>

                  {/* Sparkline: filled area */}
                  <SkiaPath path={sparkPaths.areaPath}>
                    <LinearGradient
                      start={vec(0, sparkY)}
                      end={vec(0, sparkY + SPARKLINE_H)}
                      colors={[areaColorTop, areaColorBottom]}
                    />
                  </SkiaPath>

                  {/* Sparkline: stroke line */}
                  <SkiaPath
                    path={sparkPaths.linePath}
                    color={color}
                    style="stroke"
                    strokeWidth={1.5}
                    strokeCap="round"
                    strokeJoin="round"
                  />

                  {/* Price */}
                  <SkiaNumberFlow
                    value={stock.price}
                    format={priceFormat}
                    trend={trendFn}
                    font={interSemiBold22}
                    color="#fff"
                    tabularNums
                    x={priceColX}
                    y={rowY + 27}
                    width={PRICE_COL_W}
                    textAlign="right"
                  />

                  {/* Change badge background */}
                  <RoundedRect
                    x={badgeX}
                    y={badgeY}
                    width={BADGE_W}
                    height={BADGE_H}
                    r={4}
                    color={color}
                  />

                  {/* Change badge value */}
                  <SkiaNumberFlow
                    value={stock.change}
                    format={changeFormat}
                    trend={trendFn}
                    font={interSemiBold15}
                    color="#fff"
                    tabularNums
                    x={badgeX + 4}
                    y={badgeY + 18}
                    width={BADGE_W - 8}
                    textAlign="center"
                  />

                  {/* Row separator */}
                  {!isLast && (
                    <Line
                      p1={vec(TICKER_PADDING_H, rowY + TICKER_ROW_H)}
                      p2={vec(screenWidth - TICKER_PADDING_H, rowY + TICKER_ROW_H)}
                      color="#1C1C1E"
                      strokeWidth={0.5}
                    />
                  )}
                </Group>
              );
            })}
          </Group>
        )}

        {/* ═══ Scene 5: Countdown ═══ */}
        {sceneIndex === 4 && (
          <Group layer={<Paint opacity={opacity} />}>
            {/* Full background */}
            <SkiaRect x={0} y={0} width={screenWidth} height={screenHeight} color={COUNTDOWN_BG} />

            {/* Mars image */}
            {marsImage && (
              <SkiaImage
                image={marsImage}
                x={0}
                y={0}
                width={screenWidth}
                height={screenHeight * 0.75}
                fit="cover"
              />
            )}

            {/* Gradient overlay: image to background */}
            <SkiaRect x={0} y={screenHeight * 0.5} width={screenWidth} height={screenHeight * 0.3}>
              <LinearGradient
                start={vec(0, screenHeight * 0.5)}
                end={vec(0, screenHeight * 0.8)}
                colors={["transparent", COUNTDOWN_BG]}
              />
            </SkiaRect>

            {/* Solid fill below gradient */}
            <SkiaRect
              x={0}
              y={screenHeight * 0.8}
              width={screenWidth}
              height={screenHeight * 0.2}
              color={COUNTDOWN_BG}
            />

            {/* Header */}
            <SkiaText
              font={orbitronMedium14}
              text={cdHeaderText}
              x={cdHeaderX}
              y={cdHeaderY}
              color="rgba(255,255,255,0.5)"
            />

            {/* Timer box top line */}
            <Line
              p1={vec(0, cdBoxTop)}
              p2={vec(screenWidth, cdBoxTop)}
              color="rgba(255,255,255,0.15)"
              strokeWidth={1}
            />

            {/* Timer */}
            <SkiaTimeFlow
              hours={cdHours}
              minutes={cdMinutes}
              seconds={cdSeconds}
              trend={-1}
              font={orbitronBold56}
              color="#fff"
              textAlign="center"
              width={screenWidth}
              y={cdTimeY}
            />

            {/* Timer box bottom line */}
            <Line
              p1={vec(0, cdBoxBottom)}
              p2={vec(screenWidth, cdBoxBottom)}
              color="rgba(255,255,255,0.15)"
              strokeWidth={1}
            />
          </Group>
        )}
      </Canvas>
    </>
  );
};
