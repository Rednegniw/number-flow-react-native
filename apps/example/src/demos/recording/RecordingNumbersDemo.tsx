import { Canvas } from "@shopify/react-native-skia";
import { SkiaNumberFlow, useSkiaFont } from "number-flow-react-native/skia";
import { useCallback, useState } from "react";
import { View } from "react-native";
import { pick, pickSuffix, randomInt } from "../utils";
import {
  REC_CANVAS_HEIGHT,
  REC_CANVAS_WIDTH,
  REC_FONT_ASSET,
  REC_FONT_SIZE,
  REC_TEXT_COLOR,
} from "./constants";
import { RecordingButton } from "./RecordingButton";

const INTEGER_PREFIXES = ["", "$", "~", "+", "-"];

export const RecordingNumbersDemo = () => {
  const skiaFont = useSkiaFont(REC_FONT_ASSET, REC_FONT_SIZE);
  const [value, setValue] = useState(314159);
  const [prefix, setPrefix] = useState("$");
  const [suffix, setSuffix] = useState("");

  const randomize = useCallback(() => {
    setValue(randomInt(0, 10 ** randomInt(1, 7) - 1));
    setPrefix(pick(INTEGER_PREFIXES));
    setSuffix(pickSuffix());
  }, []);

  return (
    <View style={{ alignItems: "center", gap: 8, padding: 32 }}>
      {/* Number display */}
      <Canvas style={{ width: REC_CANVAS_WIDTH, height: REC_CANVAS_HEIGHT }}>
        <SkiaNumberFlow
          color={REC_TEXT_COLOR}
          font={skiaFont}
          prefix={prefix}
          suffix={suffix}
          textAlign="center"
          value={value}
          width={REC_CANVAS_WIDTH}
          y={REC_FONT_SIZE}
        />
      </Canvas>

      {/* Action */}
      <RecordingButton label="Randomize" onPress={randomize} />
    </View>
  );
};
