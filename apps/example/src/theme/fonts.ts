// Font family names (must match keys in useFonts)
export const FONT_REGULAR = "Inter-Regular";
export const FONT_SEMIBOLD = "Inter-SemiBold";

// Font assets for expo-font
export const FONT_ASSETS = {
  [FONT_REGULAR]: require("../../assets/fonts/Inter-Regular.ttf"),
  [FONT_SEMIBOLD]: require("../../assets/fonts/Inter-SemiBold.ttf"),
};

// Skia font assets (require() for useFont / useSkiaFont)
export const INTER_FONT_ASSET = require("../../assets/fonts/Inter-Regular.ttf");
export const INTER_SEMIBOLD_FONT_ASSET = require("../../assets/fonts/Inter-SemiBold.ttf");
