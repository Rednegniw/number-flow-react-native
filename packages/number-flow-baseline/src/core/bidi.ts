import type { KeyedPart } from "./types";

/**
 * Returns true for Unicode bidi control characters that are invisible
 * and zero-width. These can appear in Intl.NumberFormat output for RTL
 * locales and would get incorrect fallback widths in layout computation.
 */
export function isBidiControlChar(code: number): boolean {
  "worklet";
  return (
    code === 0x200e || // LRM (Left-to-Right Mark)
    code === 0x200f || // RLM (Right-to-Left Mark)
    code === 0x061c || // ALM (Arabic Letter Mark)
    (code >= 0x202a && code <= 0x202e) || // Bidi embeddings/overrides/pop
    (code >= 0x2066 && code <= 0x2069) // Bidi isolates/pop
  );
}

/**
 * Simplified Unicode Bidi types relevant to formatted number content.
 * See UAX#9 for the full specification.
 */
const L = 0; // Left-to-Right (Latin letters, LRM)
const R = 1; // Right-to-Left (Hebrew, RLM)
const AL = 2; // Arabic Letter (Arabic script, ALM)
const EN = 3; // European Number (0-9)
const AN = 4; // Arabic-Indic Number (٠-٩, Arabic separators)
const ET = 5; // European Number Terminator (currency symbols, %, ‰)
const ES = 6; // European Number Separator (+, -)
const CS = 7; // Common Number Separator (., ,, NBSP)
const WS = 8; // Whitespace
const ON = 9; // Other Neutral

type BidiType =
  | typeof L
  | typeof R
  | typeof AL
  | typeof EN
  | typeof AN
  | typeof ET
  | typeof ES
  | typeof CS
  | typeof WS
  | typeof ON;

/**
 * Classifies a Unicode codepoint into its bidi type.
 * Covers ranges relevant to formatted numbers: digits, currency,
 * separators, Arabic/Hebrew script, and bidi control marks.
 */
function classifyBidiType(code: number): BidiType {
  "worklet";

  // Bidi marks (must check before broad script ranges)
  if (code === 0x200e) return L; // LRM (Left-to-Right Mark)
  if (code === 0x200f) return R; // RLM (Right-to-Left Mark)
  // ALM (U+061C) falls into Arabic range below → AL ✓

  // Latin digits
  if (code >= 0x0030 && code <= 0x0039) return EN;

  // Arabic-Indic digits and separators (AN per Unicode bidi spec)
  if (code >= 0x0660 && code <= 0x0669) return AN;
  if (code === 0x066b || code === 0x066c) return AN;

  // Extended Arabic-Indic digits (Persian/Urdu)
  if (code >= 0x06f0 && code <= 0x06f9) return EN;

  // Arabic script (excluding digits and separators handled above)
  if (
    (code >= 0x0600 && code <= 0x065f) ||
    code === 0x066a ||
    (code >= 0x066d && code <= 0x06ef) ||
    (code >= 0x06fa && code <= 0x06ff)
  )
    return AL;
  if (code >= 0x0750 && code <= 0x077f) return AL;
  if (code >= 0xfb50 && code <= 0xfdff) return AL;
  if (code >= 0xfe70 && code <= 0xfeff) return AL;

  // Hebrew script
  if (code >= 0x0590 && code <= 0x05ff) return R;
  if (code >= 0xfb1d && code <= 0xfb4f) return R;

  // European separators
  if (code === 0x002b || code === 0x002d || code === 0x2212) return ES; // +, -, −

  // Common separators
  if (code === 0x002e || code === 0x002c || code === 0x003a) return CS; // . , :
  if (code === 0x00a0) return CS; // Non-breaking space

  // Whitespace
  if (code === 0x0020 || code === 0x0009 || code === 0x000a || code === 0x000d) return WS;

  // Currency symbols and number terminators
  if (code >= 0x20a0 && code <= 0x20cf) return ET; // Currency symbols block
  if (code === 0x0024 || code === 0x00a2 || code === 0x00a3 || code === 0x00a5) return ET; // $ ¢ £ ¥
  if (code === 0x0025 || code === 0x2030 || code === 0x2031) return ET; // %, ‰, ‱

  // Default to Left-to-Right
  return L;
}

/**
 * Computes the visual display order for a character array given a base direction.
 * Implements a simplified version of the Unicode Bidi Algorithm (UAX#9)
 * scoped to formatted number content.
 *
 * Returns an array of indices into the original array, representing
 * left-to-right visual (pixel) order.
 */
export function computeVisualOrder(chars: string[], baseDir: "ltr" | "rtl"): number[] {
  "worklet";
  const len = chars.length;
  if (len === 0) return [];

  if (baseDir === "ltr") {
    const order: number[] = new Array(len);
    for (let i = 0; i < len; i++) order[i] = i;
    return order;
  }

  // Step 1: Classify bidi types
  const types: BidiType[] = new Array(len);
  for (let i = 0; i < len; i++) {
    types[i] = classifyBidiType(chars[i].charCodeAt(0));
  }

  // Step 2: Weak-type resolution (W rules from UAX#9)

  // W1: NSM → preceding type. Skipped: Intl.NumberFormat output has no combining marks.

  // W2: EN after AL → AN
  let lastStrong: BidiType = R; // RTL base direction acts as initial strong R
  for (let i = 0; i < len; i++) {
    if (types[i] === AL || types[i] === R || types[i] === L) {
      lastStrong = types[i];
    } else if (types[i] === EN && lastStrong === AL) {
      types[i] = AN;
    }
  }

  // W3: AL → R
  for (let i = 0; i < len; i++) {
    if (types[i] === AL) types[i] = R;
  }

  // W4: ES between EN+EN → EN; CS between EN+EN → EN; CS between AN+AN → AN
  for (let i = 1; i < len - 1; i++) {
    if (types[i] === ES && types[i - 1] === EN && types[i + 1] === EN) {
      types[i] = EN;
    } else if (types[i] === CS) {
      if (types[i - 1] === EN && types[i + 1] === EN) types[i] = EN;
      else if (types[i - 1] === AN && types[i + 1] === AN) types[i] = AN;
    }
  }

  // W5: ET adjacent to EN → EN (single forward pass over ET/EN runs)
  {
    let runStart = -1;
    let runHasEN = false;

    for (let i = 0; i <= len; i++) {
      const t = i < len ? types[i] : undefined;
      const inRun = t === ET || t === EN;

      if (inRun && runStart < 0) {
        runStart = i;
        runHasEN = t === EN;
      } else if (inRun) {
        if (t === EN) runHasEN = true;
      } else if (runStart >= 0) {
        if (runHasEN) {
          for (let j = runStart; j < i; j++) {
            if (types[j] === ET) types[j] = EN;
          }
        }
        runStart = -1;
        runHasEN = false;
      }
    }
  }

  // W6: Remaining ES, ET, CS → ON
  for (let i = 0; i < len; i++) {
    if (types[i] === ES || types[i] === ET || types[i] === CS) types[i] = ON;
  }

  // W7: EN preceded by L (strong context) → L
  lastStrong = R; // RTL base
  for (let i = 0; i < len; i++) {
    if (types[i] === L || types[i] === R) {
      lastStrong = types[i];
    } else if (types[i] === EN && lastStrong === L) {
      types[i] = L;
    }
  }

  // Step 3: Resolve neutrals (N1, N2) - O(n) two-pass precomputation
  const toStrongDir = (t: BidiType): BidiType => {
    if (t === EN) return L;
    if (t === AN) return R;
    return t;
  };

  const prevStrongArr: BidiType[] = new Array(len);
  {
    let last: BidiType = R; // base RTL
    for (let i = 0; i < len; i++) {
      if (types[i] === L || types[i] === R || types[i] === EN || types[i] === AN) {
        last = toStrongDir(types[i]);
      }
      prevStrongArr[i] = last;
    }
  }

  const nextStrongArr: BidiType[] = new Array(len);
  {
    let last: BidiType = R; // base RTL
    for (let i = len - 1; i >= 0; i--) {
      if (types[i] === L || types[i] === R || types[i] === EN || types[i] === AN) {
        last = toStrongDir(types[i]);
      }
      nextStrongArr[i] = last;
    }
  }

  for (let i = 0; i < len; i++) {
    if (types[i] !== ON && types[i] !== WS) continue;
    types[i] = prevStrongArr[i] === nextStrongArr[i] ? prevStrongArr[i] : R;
  }

  // Step 4: Assign embedding levels (Rules I1, I2 from UAX#9)
  // Base RTL = level 1 (odd)
  // I2: at odd level, L/EN/AN → level 2; R stays at level 1
  const levels: number[] = new Array(len);
  for (let i = 0; i < len; i++) {
    if (types[i] === L || types[i] === EN || types[i] === AN) {
      levels[i] = 2;
    } else {
      levels[i] = 1;
    }
  }

  // Step 5: Rule L2 - reverse from highest level down to lowest odd
  let maxLevel = 1;
  for (let i = 0; i < len; i++) {
    if (levels[i] > maxLevel) maxLevel = levels[i];
  }

  const order: number[] = new Array(len);
  for (let i = 0; i < len; i++) order[i] = i;

  for (let level = maxLevel; level >= 1; level--) {
    let i = 0;
    while (i < len) {
      if (levels[order[i]] >= level) {
        let j = i + 1;
        while (j < len && levels[order[j]] >= level) j++;

        let lo = i;
        let hi = j - 1;
        while (lo < hi) {
          const tmp = order[lo];
          order[lo] = order[hi];
          order[hi] = tmp;
          lo++;
          hi--;
        }

        i = j;
      } else {
        i++;
      }
    }
  }

  return order;
}

/**
 * Detects the content's base direction from the first bidi mark or
 * strong directional character in the raw format output.
 *
 * Intl.NumberFormat embeds bidi marks that indicate intended rendering:
 * - Arabic/Hebrew formats start with RLM (U+200F) → RTL
 * - Persian/Urdu formats start with LRM (U+200E) → LTR
 * - English/Latin formats have no marks → LTR (first strong char is L)
 */
export function detectContentDirection(rawChars: string[]): "ltr" | "rtl" {
  "worklet";
  for (let i = 0; i < rawChars.length; i++) {
    const code = rawChars[i].charCodeAt(0);

    // Explicit bidi marks are the strongest signal
    if (code === 0x200e) return "ltr"; // LRM
    if (code === 0x200f) return "rtl"; // RLM
    if (code === 0x061c) return "rtl"; // ALM

    // Fall back to first strong character
    const type = classifyBidiType(code);
    if (type === L) return "ltr";
    if (type === R || type === AL) return "rtl";
  }

  return "ltr";
}

/**
 * Reorders keyed parts from logical to visual order for RTL rendering.
 *
 * Auto-detects the content's bidi direction from the raw format string
 * (including bidi control chars that Intl.NumberFormat embeds). This means:
 * - Arabic (RLM at start): currency moves to left of digits
 * - Hebrew (RLM at start): ₪ moves to left of digits
 * - Persian (LRM at start): no reordering (content is designed for LTR)
 * - English (no marks): no reordering
 *
 * The component's `direction` prop controls alignment (textAlign default),
 * while this function controls character visual ordering.
 *
 * Keys are preserved so animation reconciliation continues to work.
 */
export function reorderKeyedParts(
  keyedParts: KeyedPart[],
  rawCharsWithBidi: string[],
  componentDirection: "ltr" | "rtl",
): KeyedPart[] {
  // Only reorder when the component is in RTL mode
  if (componentDirection === "ltr" || keyedParts.length === 0) return keyedParts;

  // Check if the content itself is RTL (Arabic/Hebrew formats start with RLM).
  // Persian formats start with LRM, signaling the content is designed for LTR
  // rendering even in an RTL context, so we skip reordering.
  const contentDir = detectContentDirection(rawCharsWithBidi);
  if (contentDir === "ltr") return keyedParts;

  // Compute visual order on the full array (including bidi marks)
  const visualOrder = computeVisualOrder(rawCharsWithBidi, "rtl");

  // Build mapping from raw indices to stripped indices
  const rawToStripped: number[] = new Array(rawCharsWithBidi.length).fill(-1);
  let strippedIdx = 0;
  for (let i = 0; i < rawCharsWithBidi.length; i++) {
    if (!isBidiControlChar(rawCharsWithBidi[i].charCodeAt(0))) {
      rawToStripped[i] = strippedIdx++;
    }
  }

  // Reorder: follow visual order, skipping bidi char positions
  const reordered: KeyedPart[] = [];
  for (const rawIdx of visualOrder) {
    const stripped = rawToStripped[rawIdx];
    if (stripped >= 0) {
      reordered.push(keyedParts[stripped]);
    }
  }

  return reordered;
}
