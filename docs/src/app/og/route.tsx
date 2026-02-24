import { generate as DefaultImage } from "fumadocs-ui/og";
import { ImageResponse } from "next/og";

export const revalidate = false;

export async function GET() {
  return new ImageResponse(
    <DefaultImage
      title="Number Flow React Native"
      description="Beautiful number animations for React Native. Digit-by-digit rolling, Intl.NumberFormat, View and Skia renderers."
      site="Number Flow React Native"
    />,
    {
      width: 1200,
      height: 630,
    },
  );
}
