import { useRef } from "react";

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * Value equality one level deep: covers TextStyle members that are arrays
 * (fontVariant) or plain objects (textShadowOffset) supplied as inline
 * literals, in addition to primitives.
 */
function styleValueEqual(a: unknown, b: unknown): boolean {
  if (Object.is(a, b)) return true;

  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) {
      if (!Object.is(a[i], b[i])) return false;
    }
    return true;
  }

  if (isPlainObject(a) && isPlainObject(b)) {
    const aKeys = Object.keys(a);
    if (aKeys.length !== Object.keys(b).length) return false;
    for (const key of aKeys) {
      if (!Object.is(a[key], b[key])) return false;
    }
    return true;
  }

  return false;
}

export function shallowStyleEqual(a: Record<string, unknown>, b: Record<string, unknown>): boolean {
  if (a === b) return true;

  const aKeys = Object.keys(a);
  if (aKeys.length !== Object.keys(b).length) return false;

  for (const key of aKeys) {
    if (!styleValueEqual(a[key], b[key])) return false;
  }
  return true;
}

/**
 * Returns a referentially stable version of `style`: the previously seen
 * object is reused as long as the incoming one is content-equal. Inline
 * style literals (`style={{ fontSize: 32 }}`) otherwise change identity on
 * every parent render, busting every downstream useMemo/React.memo that
 * derives from them (textStyle -> DigitSlot -> the whole slot tree).
 */
export function useShallowStableStyle<T extends object>(style: T): T {
  const ref = useRef(style);

  if (
    ref.current !== style &&
    !shallowStyleEqual(ref.current as Record<string, unknown>, style as Record<string, unknown>)
  ) {
    ref.current = style;
  }
  return ref.current;
}
