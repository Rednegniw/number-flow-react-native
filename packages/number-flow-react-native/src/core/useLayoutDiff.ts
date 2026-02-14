import { useCallback, useReducer, useRef } from "react";
import type { CharLayout } from "./layout";

interface LayoutDiffResult {
  prevMap: Map<string, CharLayout>;
  isInitialRender: boolean;
  exitingEntries: Map<string, CharLayout>;
  onExitComplete: (key: string) => void;
}

/**
 * Manages enter/exit tracking for layout transitions. Diffs the current
 * layout against the previous one and tracks exiting entries until their
 * animations complete.
 *
 * The diff logic runs during render (not in useEffect) using a ref-based
 * idempotent pattern for StrictMode safety.
 *
 * Must be called before any early returns (Rules of Hooks). Handles
 * empty layouts gracefully.
 */
export function useLayoutDiff(layout: CharLayout[]): LayoutDiffResult {
  const prevLayoutRef = useRef<CharLayout[]>([]);
  const exitingRef = useRef<Map<string, CharLayout>>(new Map());
  const [, forceUpdate] = useReducer((n: number) => n + 1, 0);
  const isFirstLayoutRef = useRef(true);

  // StrictMode-safe: only process diff once per layout change.
  const lastDiffIdRef = useRef("");
  const diffResultRef = useRef<{
    prevMap: Map<string, CharLayout>;
    isInitialRender: boolean;
  }>({ prevMap: new Map(), isInitialRender: true });

  const onExitComplete = useCallback((key: string) => {
    exitingRef.current.delete(key);
    forceUpdate();
  }, []);

  // Stable layout identity — fast string concat instead of map+join
  let layoutId = "";
  for (const s of layout) {
    layoutId += s.key + ":" + s.digitValue + "|";
  }

  // Only run diff logic once per layout change (idempotent under StrictMode)
  if (layoutId !== lastDiffIdRef.current) {
    lastDiffIdRef.current = layoutId;

    const currentKeys = new Set(layout.map((s) => s.key));
    const prevMap = new Map(prevLayoutRef.current.map((s) => [s.key, s]));

    for (const prev of prevLayoutRef.current) {
      if (!currentKeys.has(prev.key) && !exitingRef.current.has(prev.key)) {
        exitingRef.current.set(prev.key, prev);
      }
    }

    for (const key of currentKeys) {
      exitingRef.current.delete(key);
    }

    const isInitialRender = isFirstLayoutRef.current;
    if (layout.length > 0) isFirstLayoutRef.current = false;

    diffResultRef.current = { prevMap, isInitialRender };
    prevLayoutRef.current = layout;
  }

  return {
    prevMap: diffResultRef.current.prevMap,
    isInitialRender: diffResultRef.current.isInitialRender,
    exitingEntries: exitingRef.current,
    onExitComplete,
  };
}
