import { useMemo } from "react";
import type { KeyedPart } from "./types";

// ─── Module-level formatter cache ────────────────────────────────────────────
// Avoids expensive new Intl.NumberFormat() on every render when callers pass
// inline format objects (which create new references each render).
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

// ─── formatToParts fallback for Hermes ───────────────────────────────────────
// Hermes has Intl.NumberFormat but may lack formatToParts(). This fallback
// uses format() and parses the resulting string into typed parts.

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

function fallbackFormatToParts(
  formatter: Intl.NumberFormat,
  value: number,
  locales?: Intl.LocalesArgument,
): Intl.NumberFormatPart[] {
  const formatted = formatter.format(value);
  const decimalSep = detectDecimalSeparator(locales);

  const parts: Intl.NumberFormatPart[] = [];

  // Find the decimal separator position (search from right, since in
  // some locales the decimal sep char is also used as a group separator)
  let decimalPos = -1;
  for (let i = formatted.length - 1; i >= 0; i--) {
    if (formatted[i] === decimalSep) {
      let hasDigitAfter = false;
      for (let j = i + 1; j < formatted.length; j++) {
        if (formatted[j] >= "0" && formatted[j] <= "9") {
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

  for (let i = 0; i < formatted.length; i++) {
    const ch = formatted[i];

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
        i > 0 && formatted[i - 1] >= "0" && formatted[i - 1] <= "9";
      const nextDigit =
        i < formatted.length - 1 &&
        formatted[i + 1] >= "0" &&
        formatted[i + 1] <= "9";
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

  return parts;
}

function safeFormatToParts(
  formatter: Intl.NumberFormat,
  value: number,
  locales?: Intl.LocalesArgument,
): Intl.NumberFormatPart[] {
  if (typeof formatter.formatToParts === "function") {
    return formatter.formatToParts(value);
  }
  return fallbackFormatToParts(formatter, value, locales);
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
function formatToKeyedParts(
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

  // Add prefix characters
  for (const char of prefix) {
    flatChars.push({ sourceType: "prefix", char });
  }

  // Add formatted number characters
  for (const part of rawParts) {
    // Merge minusSign and plusSign into a unified "sign" type
    const type =
      part.type === "minusSign" || part.type === "plusSign"
        ? "sign"
        : part.type;

    if (type === "integer" || type === "fraction") {
      // Split multi-character digit strings into individual characters
      for (const char of part.value) {
        flatChars.push({ sourceType: type, char });
      }
    } else {
      flatChars.push({ sourceType: type, char: part.value });
    }
  }

  // Add suffix characters
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

  // Key integer digits and group separators RTL
  // Rightmost integer digit gets "integer:0" (ones place), next gets "integer:1" (tens), etc.
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

  // Key everything else LTR (fraction digits, decimal, prefix, suffix, currency, etc.)
  for (let i = 0; i < flatChars.length; i++) {
    if (result[i]) continue; // already keyed (integer or group)
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
  // Serialize format/locales to a stable string for memo deps.
  // This ensures useMemo doesn't re-run when callers pass structurally-equal
  // inline objects (e.g., format={{ minimumFractionDigits: 2 }}).
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
