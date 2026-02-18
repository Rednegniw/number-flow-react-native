import type { ReactElement } from "react";
import { UIManager, type ViewProps } from "react-native";

interface MaskedViewProps extends ViewProps {
  maskElement: ReactElement;
}

/**
 * Resolves the best available MaskedView implementation:
 * 1. `@rednegniw/masked-view` — Fabric-ready fork (dev builds)
 * 2. `@react-native-masked-view/masked-view` — bundled in Expo Go / Snack
 * 3. `null` — neither available, masking degrades gracefully
 *
 * A module may bundle successfully but its native component might not be
 * registered (e.g. in Expo Go where only pre-bundled native modules exist).
 * We verify via UIManager before accepting a resolved module.
 */
function hasNativeView(name: string): boolean {
  return UIManager.getViewManagerConfig?.(name) != null;
}

let Resolved: React.ComponentType<MaskedViewProps> | null = null;
try {
  const mod = require("@rednegniw/masked-view");
  if (hasNativeView("NFMaskedView")) {
    Resolved = mod.default;
  }
} catch {
  // Module not available
}

if (!Resolved) {
  try {
    const mod = require("@react-native-masked-view/masked-view");
    if (hasNativeView("RNCMaskedView")) {
      Resolved = mod.default;
    }
  } catch {
    // Module not available
  }
}

export default Resolved;
