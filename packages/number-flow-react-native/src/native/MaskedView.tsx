import type { ReactElement } from "react";
import type { ViewProps } from "react-native";

interface MaskedViewProps extends ViewProps {
  maskElement: ReactElement;
}

/**
 * Resolves the best available MaskedView implementation:
 * 1. `@rednegniw/masked-view` — Fabric-ready fork (dev builds)
 * 2. `@react-native-masked-view/masked-view` — bundled in Expo Go / Snack
 * 3. `null` — neither available, masking degrades gracefully
 */
let Resolved: React.ComponentType<MaskedViewProps> | null = null;
try {
  Resolved = require("@rednegniw/masked-view").default;
} catch {
  try {
    Resolved = require("@react-native-masked-view/masked-view").default;
  } catch {
    // Neither available — mask prop will be ignored
  }
}

export default Resolved;
