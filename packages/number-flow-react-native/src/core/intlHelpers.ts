import { MEASURABLE_CHARS } from "./constants";
import {
  detectNumberingSystem,
  detectOutputZeroCodePoint,
  getDigitStrings,
  getZeroCodePoint,
  isLocaleDigit,
} from "./numerals";

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
    cached = new Intl.NumberFormat(locales, format);
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
  const numberingSystem = detectNumberingSystem(locales, format);
  const zeroCP = getZeroCodePoint(numberingSystem);

  // Sample that exercises: group separators, decimal, sign, large integers
  const probes = [1234567.89, -1234567.89];
  const chars = new Set<string>();

  for (const probe of probes) {
    for (const ch of formatter.format(probe)) {
      const code = ch.charCodeAt(0);
      // Skip digits in both Latin and the locale's numbering system
      const isLatinDigit = code >= 48 && code <= 57;
      const isLocale = isLocaleDigit(code, zeroCP);
      if (!isLatinDigit && !isLocale) chars.add(ch);
    }
  }
  // Scientific/engineering notation replaces E with ×10 in our display
  if (format?.notation === "scientific" || format?.notation === "engineering") {
    chars.add("\u00D7"); // × (multiplication sign)
  }

  // Add locale digit strings so they get measured
  const digitStrings = getDigitStrings(numberingSystem);
  for (const ds of digitStrings) chars.add(ds);

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

const decimalSepCache = new Map<string, string>();

function detectDecimalSeparator(locales?: Intl.LocalesArgument): string {
  const key = JSON.stringify(locales);
  const cached = decimalSepCache.get(key);
  if (cached) return cached;

  let sep = ".";
  try {
    const fmt = new Intl.NumberFormat(locales, {
      minimumFractionDigits: 1,
      maximumFractionDigits: 1,
      useGrouping: false,
    });
    const str = fmt.format(1.5);
    const zeroCP = detectOutputZeroCodePoint(str);
    for (const ch of str) {
      const code = ch.charCodeAt(0);
      if (!isLocaleDigit(code, zeroCP) && !(code >= 48 && code <= 57)) {
        sep = ch;
        break;
      }
    }
  } catch {}

  decimalSepCache.set(key, sep);
  return sep;
}

/**
 * Parses the mantissa portion of a formatted number string into typed parts.
 * Handles integer digits, fraction digits, decimal separators, signs, and group separators.
 */
function parseMantissa(
  mantissa: string,
  decimalSep: string,
  parts: Intl.NumberFormatPart[],
  zeroCodePoint = 48,
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
        if (isLocaleDigit(mantissa[j].charCodeAt(0), zeroCodePoint)) {
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

    if (isLocaleDigit(ch.charCodeAt(0), zeroCodePoint)) {
      buf += ch;
    } else if (ch === "-") {
      flush();
      parts.push({ type: "minusSign", value: ch });
    } else if (ch === "+") {
      flush();
      parts.push({ type: "plusSign", value: ch });
    } else if (!inFraction) {
      flush();
      const prevDigit = i > 0 && isLocaleDigit(mantissa[i - 1].charCodeAt(0), zeroCodePoint);
      const nextDigit =
        i < mantissa.length - 1 && isLocaleDigit(mantissa[i + 1].charCodeAt(0), zeroCodePoint);
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

/**
 * Parses a formatted number string (with optional E exponent) into typed parts.
 * Separated from fallbackFormatToParts so it can be reused for polyfill strings.
 */
function parseNumberString(
  formatted: string,
  decimalSep: string,
  zeroCodePoint = 48,
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

  parseMantissa(mantissa, decimalSep, parts, zeroCodePoint);

  if (exponentPos >= 0) {
    parts.push({
      type: "exponentSeparator" as string,
      value: formatted[exponentPos],
    } as Intl.NumberFormatPart);

    let expBuf = "";
    for (let i = exponentPos + 1; i < formatted.length; i++) {
      const ch = formatted[i];

      if (ch === "-") {
        parts.push({ type: "exponentMinusSign" as string, value: ch } as Intl.NumberFormatPart);
      } else if (ch === "+") {
        parts.push({ type: "exponentPlusSign" as string, value: ch } as Intl.NumberFormatPart);
      } else if (isLocaleDigit(ch.charCodeAt(0), zeroCodePoint)) {
        expBuf += ch;
      }
    }

    if (expBuf) {
      parts.push({ type: "exponentInteger" as string, value: expBuf } as Intl.NumberFormatPart);
    }
  }

  return parts;
}

/**
 * Hermes has Intl.NumberFormat but may lack formatToParts(). This fallback
 * uses format() and parses the resulting string into typed parts.
 */
export function fallbackFormatToParts(
  formatter: Intl.NumberFormat,
  value: number,
  locales?: Intl.LocalesArgument,
): Intl.NumberFormatPart[] {
  const formatted = formatter.format(value);
  const zeroCp = detectOutputZeroCodePoint(formatted);
  return parseNumberString(formatted, detectDecimalSeparator(locales), zeroCp);
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
  const mantissa = abs / 10 ** exp;

  const maxFrac = resolved.maximumFractionDigits ?? 0;
  const minFrac = resolved.minimumFractionDigits ?? 0;

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
 * Safe wrapper around formatToParts that handles:
 * 1. Missing formatToParts (Hermes fallback)
 * 2. Broken formatToParts that returns all "literal" parts (non-Latin locales on Hermes)
 * 3. Missing engineering notation support (iOS Hermes)
 */
export function safeFormatToParts(
  formatter: Intl.NumberFormat,
  value: number,
  locales?: Intl.LocalesArgument,
): Intl.NumberFormatPart[] {
  let parts: Intl.NumberFormatPart[];

  if (typeof formatter.formatToParts === "function") {
    parts = formatter.formatToParts(value);

    /**
     * Hermes may return formatToParts with all parts as "literal" for
     * non-Latin locales, or misclassify digit characters. Validate that
     * at least one "integer" or "fraction" part exists for non-zero values.
     * If not, fall back to our manual parser which detects digits by codepoint.
     */
    if (value !== 0) {
      const hasDigitParts = parts.some((p) => p.type === "integer" || p.type === "fraction");
      if (!hasDigitParts) {
        parts = fallbackFormatToParts(formatter, value, locales);
      }
    }
  } else {
    parts = fallbackFormatToParts(formatter, value, locales);
  }

  // iOS Hermes uses NSNumberFormatter which doesn't support engineering notation.
  // It silently falls back to decimal formatting, producing no exponent parts.
  // Detect this and manually compute the engineering representation.
  const hasExponent = parts.some((p) => (p.type as string) === "exponentSeparator");

  if (!hasExponent && Number.isFinite(value)) {
    const notation = (formatter.resolvedOptions() as unknown as Record<string, unknown>).notation;

    if (notation === "engineering") {
      const str = computeEngineeringString(value, formatter.resolvedOptions());
      return parseNumberString(str, ".");
    }
  }

  return parts;
}
