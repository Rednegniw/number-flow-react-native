/**
 * Lookup tables for numeral system support.
 *
 * Most Unicode decimal digit systems use 10 contiguous codepoints (0-9),
 * enabling digit detection via: digitValue = charCode - zeroCodePoint.
 *
 * Exception: hanidec (〇一二三四五六七八九) uses non-contiguous ideographs.
 * Functions that accept a zeroCodePoint use 0x3007 as a sentinel to trigger
 * the hanidec lookup path.
 *
 * Only BMP (Basic Multilingual Plane, U+0000-U+FFFF) systems are supported
 * because the codebase uses charCodeAt-based indexing in worklets.
 * Supplementary plane systems (adlm) fall back to Latin digits.
 */

export const LATIN_ZERO = 0x0030; // 48
export const HANIDEC_ZERO = 0x3007;

export const HANIDEC_DIGITS = ["〇", "一", "二", "三", "四", "五", "六", "七", "八", "九"];

/**
 * Map of CLDR numbering system name → Unicode codepoint of digit zero.
 * Only includes BMP systems (codepoint <= 0xFFFF).
 * hanidec uses 0x3007 as a sentinel — the remaining digits are non-contiguous.
 */
export const ZERO_CODEPOINTS: Record<string, number> = {
  latn: 0x0030,
  arab: 0x0660,
  arabext: 0x06f0,
  bali: 0x1b50,
  beng: 0x09e6,
  cham: 0xaa50,
  deva: 0x0966,
  fullwide: 0xff10,
  gujr: 0x0ae6,
  guru: 0x0a66,
  hanidec: 0x3007,
  java: 0xa9d0,
  kali: 0xa900,
  khmr: 0x17e0,
  knda: 0x0ce6,
  lana: 0x1a80,
  lanatham: 0x1a90,
  laoo: 0x0ed0,
  lepc: 0x1c40,
  limb: 0x1946,
  mlym: 0x0d66,
  mong: 0x1810,
  mtei: 0xabf0,
  mymr: 0x1040,
  mymrshan: 0x1090,
  nkoo: 0x07c0,
  olck: 0x1c50,
  orya: 0x0b66,
  saur: 0xa8d0,
  sinh: 0x0de6,
  sund: 0x1bb0,
  talu: 0x19d0,
  tamldec: 0x0be6,
  telu: 0x0c66,
  thai: 0x0e50,
  tibt: 0x0f20,
  vaii: 0xa620,
};

/**
 * CLDR default numbering systems for locales where the platform (Hermes)
 * may fall back to "latn" despite the locale specifying a different system.
 *
 * Only includes locales whose CLDR default differs from "latn".
 * Key format: language subtag or language-region (e.g. "ar", "ar-EG").
 */
export const CLDR_DEFAULT_NUMBERING: Record<string, string> = {
  ar: "arab",
  "ar-AE": "arab",
  "ar-BH": "arab",
  "ar-EG": "arab",
  "ar-IQ": "arab",
  "ar-JO": "arab",
  "ar-KW": "arab",
  "ar-LB": "arab",
  "ar-OM": "arab",
  "ar-QA": "arab",
  "ar-SA": "arab",
  "ar-SD": "arab",
  "ar-SY": "arab",
  "ar-YE": "arab",
  as: "beng",
  "as-IN": "beng",
  bn: "beng",
  "bn-BD": "beng",
  "bn-IN": "beng",
  ckb: "arab",
  "ckb-IQ": "arab",
  dz: "tibt",
  "dz-BT": "tibt",
  fa: "arabext",
  "fa-IR": "arabext",
  ks: "arabext",
  "ks-IN": "arabext",
  mr: "deva",
  "mr-IN": "deva",
  my: "mymr",
  "my-MM": "mymr",
  ne: "deva",
  "ne-NP": "deva",
  ps: "arabext",
  "ps-AF": "arabext",
  sat: "olck",
  "sat-IN": "olck",
  "ur-IN": "arabext",
};
