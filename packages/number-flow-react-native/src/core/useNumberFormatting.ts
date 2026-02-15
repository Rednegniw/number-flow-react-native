import { useMemo } from "react";
import { MEASURABLE_CHARS } from "./constants";
import type { KeyedPart } from "./types";

/**
 * Avoids expensive new Intl.NumberFormat() on every render when callers pass
 * inline format objects (which create new references each render).
 */
const formatterCache = new Map<string, Intl.NumberFormat>();

export function getOrCreateFormatter(
  locales?: Intl.LocalesArgument,
  format?: Intl.NumberFormatOptions,
): Intl.NumberFormat {
  const key = JSON.stringify([locales, format]);
  let cached = formatterCache.get(key);
  if (!cached) {
    cached = new Intl.NumberFormat(locales ?? undefined, format);
    formatterCache.set(key, cached);
  }
  return cached;
}

/**
 * Probes the formatter with a sample number that exercises group separators,
 * decimal separator, and currency/percent symbols. Returns only characters NOT
 * already in MEASURABLE_CHARS — this keeps the result stable across different
 * prefix/suffix combinations and prevents native measurement cache invalidation.
 */
const formatCharsCache = new Map<string, string>();

export function getFormatCharacters(
  locales?: Intl.LocalesArgument,
  format?: Intl.NumberFormatOptions,
  prefix = "",
  suffix = "",
): string {
  const key = JSON.stringify([locales, format, prefix, suffix]);
  const cached = formatCharsCache.get(key);
  if (cached !== undefined) return cached;

  const formatter = getOrCreateFormatter(locales, format);
  // Sample that exercises: group separators, decimal, sign, large integers
  const probes = [1234567.89, -1234567.89];
  const chars = new Set<string>();

  for (const probe of probes) {
    for (const ch of formatter.format(probe)) {
      if (ch < "0" || ch > "9") chars.add(ch);
    }
  }
  // Scientific/engineering notation replaces E with ×10 in our display
  if (format?.notation === "scientific" || format?.notation === "engineering") {
    chars.add("\u00D7"); // × (multiplication sign)
  }

  for (const ch of prefix) chars.add(ch);
  for (const ch of suffix) chars.add(ch);

  /**
   * Only return chars NOT already in MEASURABLE_CHARS — this keeps the result
   * stable across prefix/suffix changes and avoids native measurement cache misses.
   */
  const result = Array.from(chars)
    .filter((c) => !MEASURABLE_CHARS.includes(c))
    .join("");
  formatCharsCache.set(key, result);
  return result;
}

/**
 * Hermes has Intl.NumberFormat but may lack formatToParts(). This fallback
 * uses format() and parses the resulting string into typed parts.
 */
const decimalSepCache = new Map<string, string>();

function detectDecimalSeparator(locales?: Intl.LocalesArgument): string {
  const key = JSON.stringify(locales);
  const cached = decimalSepCache.get(key);
  if (cached) return cached;

  let sep = ".";
  try {
    const str = new Intl.NumberFormat(locales ?? undefined, {
      minimumFractionDigits: 1,
      maximumFractionDigits: 1,
      useGrouping: false,
    }).format(1.5);
    for (const ch of str) {
      if (ch < "0" || ch > "9") {
        sep = ch;
        break;
      }
    }
  } catch {}

  decimalSepCache.set(key, sep);
  return sep;
}

/**
 * Parses a formatted number string (with optional E exponent) into typed parts.
 * Separated from fallbackFormatToParts so it can be reused for polyfill strings.
 */
function parseNumberString(
  formatted: string,
  decimalSep: string,
): Intl.NumberFormatPart[] {
  // Detect exponent separator (E or e) — split into mantissa + exponent
  let exponentPos = -1;
  for (let i = 0; i < formatted.length; i++) {
    if (formatted[i] === "E" || formatted[i] === "e") {
      exponentPos = i;
      break;
    }
  }

  const mantissa = exponentPos >= 0 ? formatted.slice(0, exponentPos) : formatted;
  const parts: Intl.NumberFormatPart[] = [];

  parseMantissa(mantissa, decimalSep, parts);

  if (exponentPos >= 0) {
    parts.push({ type: "exponentSeparator" as string, value: formatted[exponentPos] } as Intl.NumberFormatPart);

    let expBuf = "";
    for (let i = exponentPos + 1; i < formatted.length; i++) {
      const ch = formatted[i];

      if (ch === "-") {
        parts.push({ type: "exponentMinusSign" as string, value: ch } as Intl.NumberFormatPart);
      } else if (ch === "+") {
        parts.push({ type: "exponentPlusSign" as string, value: ch } as Intl.NumberFormatPart);
      } else if (ch >= "0" && ch <= "9") {
        expBuf += ch;
      }
    }

    if (expBuf) {
      parts.push({ type: "exponentInteger" as string, value: expBuf } as Intl.NumberFormatPart);
    }
  }

  return parts;
}

export function fallbackFormatToParts(
  formatter: Intl.NumberFormat,
  value: number,
  locales?: Intl.LocalesArgument,
): Intl.NumberFormatPart[] {
  return parseNumberString(formatter.format(value), detectDecimalSeparator(locales));
}

/**
 * Manually computes an engineering notation string for values where the
 * platform's Intl.NumberFormat doesn't support notation: "engineering"
 * (notably iOS Hermes, which uses NSNumberFormatter under the hood).
 *
 * Engineering notation: exponent is always a multiple of 3, mantissa has 1-3 integer digits.
 */
function computeEngineeringString(
  value: number,
  resolved: Intl.ResolvedNumberFormatOptions,
): string {
  if (value === 0) return "0E0";

  const negative = value < 0;
  const abs = Math.abs(value);
  const logFloor = Math.floor(Math.log10(abs));
  const exp = 3 * Math.floor(logFloor / 3);
  const mantissa = abs / Math.pow(10, exp);

  const maxFrac = resolved.maximumFractionDigits;
  const minFrac = resolved.minimumFractionDigits;

  let mantissaStr = mantissa.toFixed(maxFrac);

  // Trim trailing zeros beyond minFrac
  const dotIdx = mantissaStr.indexOf(".");
  if (dotIdx >= 0) {
    let end = mantissaStr.length;
    const minEnd = dotIdx + 1 + minFrac;

    while (end > minEnd && mantissaStr[end - 1] === "0") {
      end--;
    }

    // Remove the dot if no fraction digits remain
    if (end <= dotIdx + 1 && minFrac === 0) {
      end = dotIdx;
    }

    mantissaStr = mantissaStr.slice(0, end);
  }

  const sign = negative ? "-" : "";
  return `${sign}${mantissaStr}E${exp}`;
}

/**
 * Parses the mantissa portion of a formatted number string into typed parts.
 * Handles integer digits, fraction digits, decimal separators, signs, and group separators.
 */
function parseMantissa(
  mantissa: string,
  decimalSep: string,
  parts: Intl.NumberFormatPart[],
): void {
  /**
   * Search from right — in some locales the decimal sep char is also
   * used as a group separator, so leftmost match could be wrong.
   */
  let decimalPos = -1;
  for (let i = mantissa.length - 1; i >= 0; i--) {
    if (mantissa[i] === decimalSep) {
      let hasDigitAfter = false;
      for (let j = i + 1; j < mantissa.length; j++) {
        if (mantissa[j] >= "0" && mantissa[j] <= "9") {
          hasDigitAfter = true;
          break;
        }
      }
      if (hasDigitAfter) {
        decimalPos = i;
        break;
      }
    }
  }

  let buf = "";
  let inFraction = false;

  const flush = () => {
    if (buf) {
      parts.push({ type: inFraction ? "fraction" : "integer", value: buf });
      buf = "";
    }
  };

  for (let i = 0; i < mantissa.length; i++) {
    const ch = mantissa[i];

    if (i === decimalPos) {
      flush();
      parts.push({ type: "decimal", value: ch });
      inFraction = true;
      continue;
    }

    if (ch >= "0" && ch <= "9") {
      buf += ch;
    } else if (ch === "-") {
      flush();
      parts.push({ type: "minusSign", value: ch });
    } else if (ch === "+") {
      flush();
      parts.push({ type: "plusSign", value: ch });
    } else if (!inFraction) {
      flush();
      const prevDigit =
        i > 0 && mantissa[i - 1] >= "0" && mantissa[i - 1] <= "9";
      const nextDigit =
        i < mantissa.length - 1 &&
        mantissa[i + 1] >= "0" &&
        mantissa[i + 1] <= "9";
      parts.push({
        type: prevDigit && nextDigit ? "group" : "literal",
        value: ch,
      });
    } else {
      flush();
      parts.push({ type: "literal", value: ch });
    }
  }

  flush();
}

function safeFormatToParts(
  formatter: Intl.NumberFormat,
  value: number,
  locales?: Intl.LocalesArgument,
): Intl.NumberFormatPart[] {
  let parts: Intl.NumberFormatPart[];

  if (typeof formatter.formatToParts === "function") {
    parts = formatter.formatToParts(value);
  } else {
    parts = fallbackFormatToParts(formatter, value, locales);
  }

  // iOS Hermes uses NSNumberFormatter which doesn't support engineering notation.
  // It silently falls back to decimal formatting, producing no exponent parts.
  // Detect this and manually compute the engineering representation.
  const hasExponent = parts.some((p) => (p.type as string) === "exponentSeparator");

  if (!hasExponent && isFinite(value)) {
    const notation = (formatter.resolvedOptions() as unknown as Record<string, unknown>).notation;

    if (notation === "engineering") {
      const str = computeEngineeringString(value, formatter.resolvedOptions());
      return parseNumberString(str, ".");
    }
  }

  return parts;
}

/**
 * Transforms `Intl.NumberFormat.formatToParts()` output into a flat array of
 * stably-keyed single-character parts. Integer digits are keyed right-to-left
 * (ones = `integer:0`, tens = `integer:1`, etc.) so that the ones place always
 * maps to the same React key regardless of digit count. Fraction digits are
 * keyed left-to-right from the decimal point (`fraction:0` = tenths, etc.).
 *
 * This keying ensures correct animation behavior when digits are added/removed
 * (e.g., 9→10: ones place spins 9→0, tens place enters as new digit).
 */
export function formatToKeyedParts(
  value: number,
  formatter: Intl.NumberFormat,
  locales: Intl.LocalesArgument | undefined,
  prefix = "",
  suffix = "",
): KeyedPart[] {
  const rawParts = safeFormatToParts(formatter, value, locales);

  // Step 1: Flatten all parts into single characters with their source type
  interface FlatChar {
    sourceType: string;
    char: string;
  }

  const flatChars: FlatChar[] = [];

  for (const char of prefix) {
    flatChars.push({ sourceType: "prefix", char });
  }

  for (const part of rawParts) {
    // Merge signs into unified types.
    // The fallback parser emits extended types (exponentMinusSign, etc.)
    // that aren't in Intl.NumberFormatPart["type"], so we widen to string.
    const partType = part.type as string;
    const type =
      partType === "minusSign" || partType === "plusSign"
        ? "sign"
        : partType === "exponentMinusSign" || partType === "exponentPlusSign"
          ? "exponentSign"
          : partType;

    // Replace exponentSeparator "E" with ×10 display
    if (type === "exponentSeparator") {
      flatChars.push({ sourceType: "exponentSeparator", char: "\u00D7" });
      flatChars.push({ sourceType: "exponentSeparator", char: "1" });
      flatChars.push({ sourceType: "exponentSeparator", char: "0" });
      continue;
    }

    // Flatten digit sequences into individual characters
    if (type === "integer" || type === "fraction" || type === "exponentInteger") {
      for (const char of part.value) {
        flatChars.push({ sourceType: type, char });
      }
    } else {
      flatChars.push({ sourceType: type, char: part.value });
    }
  }

  for (const char of suffix) {
    flatChars.push({ sourceType: "suffix", char });
  }

  // Step 2: Key characters — integers+groups RTL, everything else LTR
  const result: KeyedPart[] = new Array(flatChars.length);
  const counts: Record<string, number> = {};

  const nextKey = (type: string) =>
    `${type}:${(counts[type] = (counts[type] ?? -1) + 1)}`;

  // Find all integer + group indices (they form one contiguous block to key RTL)
  const integerGroupIndices: number[] = [];
  for (let i = 0; i < flatChars.length; i++) {
    if (
      flatChars[i].sourceType === "integer" ||
      flatChars[i].sourceType === "group"
    ) {
      integerGroupIndices.push(i);
    }
  }

  /**
   * Key integer digits and group separators RTL — rightmost integer digit
   * gets "integer:0" (ones place), next gets "integer:1" (tens), etc.
   */
  for (let i = integerGroupIndices.length - 1; i >= 0; i--) {
    const idx = integerGroupIndices[i];
    const fc = flatChars[idx];
    const isDigit = fc.sourceType === "integer";
    result[idx] = {
      key: nextKey(fc.sourceType),
      type: isDigit ? "digit" : "symbol",
      char: fc.char,
      digitValue: isDigit ? fc.char.charCodeAt(0) - 48 : -1,
    };
  }

  // Find all exponent integer indices (key RTL, same logic as mantissa integers)
  const exponentIntegerIndices: number[] = [];
  for (let i = 0; i < flatChars.length; i++) {
    if (flatChars[i].sourceType === "exponentInteger") {
      exponentIntegerIndices.push(i);
    }
  }

  for (let i = exponentIntegerIndices.length - 1; i >= 0; i--) {
    const idx = exponentIntegerIndices[i];
    const fc = flatChars[idx];
    result[idx] = {
      key: nextKey("exponentInteger"),
      type: "digit",
      char: fc.char,
      digitValue: fc.char.charCodeAt(0) - 48,
    };
  }

  // Key everything else LTR (fraction, decimal, prefix, suffix, exponentSeparator, exponentSign, etc.)
  for (let i = 0; i < flatChars.length; i++) {
    if (result[i]) continue; // already keyed (integer, group, or exponentInteger)
    const fc = flatChars[i];
    const isDigit = fc.sourceType === "fraction";
    result[i] = {
      key: nextKey(fc.sourceType),
      type: isDigit ? "digit" : "symbol",
      char: fc.char,
      digitValue: isDigit ? fc.char.charCodeAt(0) - 48 : -1,
    };
  }

  return result;
}

/**
 * Hook that formats a numeric value into stably-keyed character parts.
 * Uses Intl.NumberFormat.formatToParts() with RTL integer keying.
 */
export function useNumberFormatting(
  value: number | undefined,
  format: Intl.NumberFormatOptions | undefined,
  locales: Intl.LocalesArgument | undefined,
  prefix: string,
  suffix: string,
): KeyedPart[] {
  /**
   * Serialize format/locales to a stable string for memo deps — ensures
   * useMemo doesn't re-run when callers pass structurally-equal inline objects.
   */
  const formatKey = useMemo(
    () => JSON.stringify([locales, format]),
    [locales, format],
  );

  return useMemo(() => {
    if (value === undefined) return [];
    const formatter = getOrCreateFormatter(locales, format);
    return formatToKeyedParts(value, formatter, locales, prefix, suffix);
  }, [value, formatKey, prefix, suffix]);
}
