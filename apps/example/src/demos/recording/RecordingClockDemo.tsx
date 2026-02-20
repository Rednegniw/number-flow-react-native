import { Canvas } from "@shopify/react-native-skia";
import { SkiaTimeFlow, useSkiaFont } from "number-flow-react-native/skia";
import { useCallback, useState } from "react";
import { View } from "react-native";
import { randomInt } from "../utils";
import {
  REC_CANVAS_HEIGHT,
  REC_CANVAS_WIDTH,
  REC_FONT_ASSET,
  REC_FONT_SIZE,
  REC_TEXT_COLOR,
} from "./constants";
import { RecordingButton } from "./RecordingButton";

export const RecordingClockDemo = () => {
  const skiaFont = useSkiaFont(REC_FONT_ASSET, REC_FONT_SIZE);
  const [hours, setHours] = useState(14);
  const [minutes, setMinutes] = useState(30);
  const [is24Hour, setIs24Hour] = useState(true);

  const increment = useCallback(() => {
    setMinutes((prev) => {
      if (prev === 59) {
        setHours((h) => (h + 1) % 24);
        return 0;
      }
      return prev + 1;
    });
  }, []);

  const randomize = useCallback(() => {
    setHours(randomInt(0, 23));
    setMinutes(randomInt(0, 59));
  }, []);

  const toggle24h = useCallback(() => {
    setIs24Hour((v) => !v);
  }, []);

  return (
    <View style={{ alignItems: "center", gap: 24, padding: 32 }}>
      {/* Time display */}
      <Canvas style={{ width: REC_CANVAS_WIDTH, height: REC_CANVAS_HEIGHT }}>
        <SkiaTimeFlow
          color={REC_TEXT_COLOR}
          font={skiaFont}
          hours={hours}
          is24Hour={is24Hour}
          minutes={minutes}
          padHours={false}
          textAlign="center"
          width={REC_CANVAS_WIDTH}
          y={REC_FONT_SIZE}
        />
      </Canvas>

      {/* Action buttons */}
      <View style={{ flexDirection: "row", gap: 10 }}>
        <RecordingButton label="+1 Min" onPress={increment} />
        <RecordingButton label="Random" onPress={randomize} />
        <RecordingButton label={is24Hour ? "12h" : "24h"} onPress={toggle24h} />
      </View>
    </View>
  );
};
