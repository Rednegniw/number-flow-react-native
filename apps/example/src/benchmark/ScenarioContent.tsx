import { Canvas, type SkFont } from "@shopify/react-native-skia";
import { NumberFlow as BaselineNumberFlow } from "number-flow-baseline";
import { SkiaNumberFlow as BaselineSkiaNumberFlow } from "number-flow-baseline/skia";
import { NumberFlow } from "number-flow-react-native";
import { SkiaNumberFlow } from "number-flow-react-native/skia";
import { View } from "react-native";
import type { RunSpec } from "./types";

export const GRID_COUNT = 30;
const GRID_COLS = 3;
const CELL_WIDTH = 120;
const CELL_HEIGHT = 32;

interface ScenarioContentProps {
  spec: RunSpec;
  values: number[];
  fontLarge: SkFont | null;
  fontSmall: SkFont | null;
}

/**
 * Renders the workload for one run. The mount scenario reuses the grid
 * shape; the runner controls mounting/unmounting around it.
 */
export const ScenarioContent = ({ spec, values, fontLarge, fontSmall }: ScenarioContentProps) => {
  const isBaseline = spec.variant === "baseline";
  const NF = isBaseline ? BaselineNumberFlow : NumberFlow;
  const SNF = isBaseline ? BaselineSkiaNumberFlow : SkiaNumberFlow;
  const isSingle = spec.scenario === "tick-single";

  if (spec.renderer === "native") {
    if (isSingle) {
      return <NF style={{ fontSize: 32 }} value={values[0]} />;
    }

    return (
      <View style={{ flexDirection: "row", flexWrap: "wrap", width: GRID_COLS * CELL_WIDTH }}>
        {values.map((v, i) => (
          <View key={i} style={{ width: CELL_WIDTH, height: CELL_HEIGHT }}>
            <NF style={{ fontSize: 16 }} value={v} />
          </View>
        ))}
      </View>
    );
  }

  if (!fontLarge || !fontSmall) return null;

  if (isSingle) {
    return (
      <Canvas style={{ width: 240, height: 48 }}>
        <SNF font={fontLarge} value={values[0]} x={0} y={36} />
      </Canvas>
    );
  }

  const cells = values.map((v, i) => ({
    value: v,
    x: (i % GRID_COLS) * CELL_WIDTH,
    y: 20 + Math.floor(i / GRID_COLS) * CELL_HEIGHT,
  }));
  const canvasHeight = Math.ceil(values.length / GRID_COLS) * CELL_HEIGHT + 8;

  return (
    <Canvas style={{ width: GRID_COLS * CELL_WIDTH, height: canvasHeight }}>
      {cells.map((cell, i) => (
        <SNF font={fontSmall} key={i} value={cell.value} x={cell.x} y={cell.y} />
      ))}
    </Canvas>
  );
};
