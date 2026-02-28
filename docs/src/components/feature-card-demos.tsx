"use client";

import "@/lib/rn-web-polyfills";

import { NumberFlow, TimeFlow } from "number-flow-react-native";
import { useCallback, useEffect, useRef, useState } from "react";

const INITIAL_DELAY = 500;
const CYCLE_INTERVAL = 3000;

const randomValue = () => Math.floor(Math.random() * 9999) + 1;

const numberStyle = { fontSize: 18, color: "var(--brand-accent)" };
const timeStyle = { fontSize: 18, color: "var(--brand-accent)" };

export function NumberFlowDemo() {
  const [value, setValue] = useState(0);

  useEffect(() => {
    const initialId = setTimeout(() => {
      setValue(randomValue());
      const id = setInterval(() => setValue(randomValue()), CYCLE_INTERVAL);
      cleanupInterval = () => clearInterval(id);
    }, INITIAL_DELAY);

    let cleanupInterval = () => {};
    return () => {
      clearTimeout(initialId);
      cleanupInterval();
    };
  }, []);

  return <NumberFlow value={value} style={numberStyle} format={{ useGrouping: true }} />;
}

function useLocalTime() {
  const getTime = useCallback(() => {
    const d = new Date();
    return { hours: d.getHours(), minutes: d.getMinutes(), seconds: d.getSeconds() };
  }, []);

  const [time, setTime] = useState(getTime);

  useEffect(() => {
    const id = setInterval(() => setTime(getTime()), 1000);
    return () => clearInterval(id);
  }, [getTime]);

  return time;
}

const localeUses24Hour = !new Intl.DateTimeFormat(undefined, { hour: "numeric" }).resolvedOptions()
  .hour12;

export function TimeFlowDemo() {
  const { hours, minutes, seconds } = useLocalTime();

  return (
    <TimeFlow
      hours={hours}
      minutes={minutes}
      seconds={seconds}
      is24Hour={localeUses24Hour}
      style={timeStyle}
    />
  );
}

// ---------------------------------------------------------------------------
// ScrubbingDemo: auto-oscillating slider driving a NumberFlow
// ---------------------------------------------------------------------------

export function ScrubbingDemo() {
  const [value, setValue] = useState(50);
  const rafId = useRef<number>(0);
  const startTime = useRef(0);
  const interacting = useRef(false);

  const animate = useCallback((time: number) => {
    if (!startTime.current) startTime.current = time;
    const elapsed = (time - startTime.current) / 1000;
    const next = Math.round(50 + 50 * Math.sin(elapsed * 0.8));
    setValue(next);
    rafId.current = requestAnimationFrame(animate);
  }, []);

  const startOscillation = useCallback(() => {
    startTime.current = 0;
    rafId.current = requestAnimationFrame(animate);
  }, [animate]);

  useEffect(() => {
    const id = setTimeout(startOscillation, INITIAL_DELAY);
    return () => {
      clearTimeout(id);
      cancelAnimationFrame(rafId.current);
    };
  }, [startOscillation]);

  const handlePointerDown = useCallback(() => {
    interacting.current = true;
    cancelAnimationFrame(rafId.current);
  }, []);

  const handlePointerUp = useCallback(() => {
    interacting.current = false;
    startOscillation();
  }, [startOscillation]);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setValue(Number(e.target.value));
  }, []);

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
      <NumberFlow value={value} style={numberStyle} />
      <input
        type="range"
        min={0}
        max={100}
        value={value}
        onChange={handleChange}
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
        style={{ flex: 1, opacity: 0.4, height: 4, accentColor: "#e5e7eb" }}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// I18nDemo: cycles through Intl.NumberFormat configurations
// ---------------------------------------------------------------------------

const i18nPresets: { value: number; format: Intl.NumberFormatOptions; locales?: string }[] = [
  { value: 1234.56, format: { style: "currency", currency: "USD" } },
  { value: 0.89, format: { style: "percent" } },
  { value: 1234, format: { notation: "compact" } },
  { value: 9876.54, format: { style: "currency", currency: "EUR" }, locales: "de-DE" },
];

export function I18nDemo() {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const initialId = setTimeout(() => {
      setIndex(1);
      const id = setInterval(() => setIndex((i) => (i + 1) % i18nPresets.length), CYCLE_INTERVAL);
      cleanupInterval = () => clearInterval(id);
    }, INITIAL_DELAY);

    let cleanupInterval = () => {};
    return () => {
      clearTimeout(initialId);
      cleanupInterval();
    };
  }, []);

  const preset = i18nPresets[index];

  return (
    <NumberFlow
      value={preset.value}
      format={preset.format}
      locales={preset.locales}
      style={numberStyle}
    />
  );
}

// ---------------------------------------------------------------------------
// RenderersDemo: twin NumberFlows showing Native + Skia backends
// ---------------------------------------------------------------------------

const labelStyle = { fontSize: 10, color: "#6b7280", lineHeight: 1 } as const;

export function RenderersDemo() {
  const [value, setValue] = useState(0);

  useEffect(() => {
    const initialId = setTimeout(() => {
      setValue(randomValue());
      const id = setInterval(() => setValue(randomValue()), CYCLE_INTERVAL);
      cleanupInterval = () => clearInterval(id);
    }, INITIAL_DELAY);

    let cleanupInterval = () => {};
    return () => {
      clearTimeout(initialId);
      cleanupInterval();
    };
  }, []);

  return (
    <div
      style={{
        display: "flex",
        alignItems: "flex-end",
        overflow: "hidden",
        height: 27,
        marginTop: -1.88,
        marginBottom: -4.2,
      }}
    >
      <NumberFlow value={value} style={numberStyle} format={{ useGrouping: true }} />
      <span style={{ ...labelStyle, marginLeft: 3, marginRight: 12 }}>Native</span>
      <NumberFlow value={value} style={numberStyle} format={{ useGrouping: true }} />
      <span style={{ ...labelStyle, marginLeft: 3 }}>Skia</span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// NumeralsDemo: cycles through non-Latin numeral systems
// ---------------------------------------------------------------------------

const numeralSystems = [
  { locales: "ar-u-nu-arab", label: "Arabic-Indic" },
  { locales: "hi-u-nu-deva", label: "Devanagari" },
  { locales: "th-u-nu-thai", label: "Thai" },
  { locales: "zh-u-nu-hanidec", label: "CJK" },
];

export function NumeralsDemo() {
  const [index, setIndex] = useState(0);
  const [value, setValue] = useState(() => randomValue());

  useEffect(() => {
    const initialId = setTimeout(() => {
      setIndex(1);
      setValue(randomValue());
      const id = setInterval(() => {
        setIndex((i) => (i + 1) % numeralSystems.length);
        setValue(randomValue());
      }, CYCLE_INTERVAL);
      cleanupInterval = () => clearInterval(id);
    }, INITIAL_DELAY);

    let cleanupInterval = () => {};
    return () => {
      clearTimeout(initialId);
      cleanupInterval();
    };
  }, []);

  const system = numeralSystems[index];

  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
      <div style={{ height: 24, overflow: "hidden" }}>
        <NumberFlow
          value={value}
          locales={system.locales}
          format={{ useGrouping: true }}
          style={numberStyle}
        />
      </div>
      <span
        key={index}
        style={{
          fontSize: 11,
          color: "#9ca3af",
          animation: "fadeIn 0.4s ease-out",
        }}
      >
        {system.label}
      </span>
    </div>
  );
}
