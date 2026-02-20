import { useMemo } from "react";
import { digitPart, type KeyedPart, symbolPart } from "./types";

/**
 * Converts 24h hours (0-23) to 12h display value (1-12).
 * 0 → 12 (12 AM), 1-12 → as-is, 13-23 → subtract 12.
 */
export function to12Hour(h: number): number {
  if (h === 0) return 12;
  if (h > 12) return h - 12;
  return h;
}

/**
 * Builds a time display into stably-keyed character parts.
 *
 * Each digit position gets a fixed semantic key (h10, h1, m10, m1, s10, s1)
 * regardless of the actual value. This ensures correct enter/exit animation
 * behavior — e.g. when hours go from 9→10, the h10 key *enters* (fades in)
 * rather than shifting all existing positions.
 */
export function formatTimeToKeyedParts(
  hours: number | undefined,
  minutes: number,
  seconds: number | undefined,
  is24Hour: boolean,
  padHours: boolean,
  centiseconds?: number | undefined,
): KeyedPart[] {
  const parts: KeyedPart[] = [];

  const hasHours = hours !== undefined;
  const hasSeconds = seconds !== undefined;
  const hasCentiseconds = centiseconds !== undefined;

  if (hasHours) {
    const displayHours = is24Hour ? hours : to12Hour(hours);

    const h10 = Math.floor(displayHours / 10);
    const h1 = displayHours % 10;

    // Hours tens digit — only shown if >= 10 or padding is on
    if (h10 > 0 || padHours) {
      parts.push(digitPart("h10", h10));
    }

    parts.push(digitPart("h1", h1));

    parts.push(symbolPart("sep", ":"));
  }

  const m10 = Math.floor(minutes / 10);
  const m1 = minutes % 10;
  parts.push(digitPart("m10", m10));
  parts.push(digitPart("m1", m1));

  if (hasSeconds) {
    parts.push(symbolPart("sep2", ":"));

    const s10 = Math.floor(seconds / 10);
    const s1 = seconds % 10;
    parts.push(digitPart("s10", s10));
    parts.push(digitPart("s1", s1));
  }

  if (hasCentiseconds) {
    parts.push(symbolPart("csep", "."));

    const c10 = Math.floor(centiseconds / 10);
    const c1 = centiseconds % 10;
    parts.push(digitPart("c10", c10));
    parts.push(digitPart("c1", c1));
  }

  /**
   * Each character gets a value-dependent key so AM→PM triggers exit/enter crossfade.
   * Characters are emitted individually for correct glyph width measurement.
   */
  if (hasHours && !is24Hour) {
    const label = hours < 12 ? "AM" : "PM";
    parts.push(symbolPart("ampm-sp", " "));
    for (let i = 0; i < label.length; i++) {
      parts.push(symbolPart(`ampm:${label}:${i}`, label[i]));
    }
  }

  return parts;
}

/**
 * Hook that formats time values into stably-keyed character parts.
 * Uses fixed positional keys (h10, h1, sep, m10, m1, etc.) instead of
 * NumberFlow's RTL integer keying.
 */
export function useTimeFormatting(
  hours: number | undefined,
  minutes: number,
  seconds: number | undefined,
  is24Hour: boolean,
  padHours: boolean,
  centiseconds?: number | undefined,
): KeyedPart[] {
  return useMemo(
    () => formatTimeToKeyedParts(hours, minutes, seconds, is24Hour, padHours, centiseconds),
    [hours, minutes, seconds, is24Hour, padHours, centiseconds],
  );
}
