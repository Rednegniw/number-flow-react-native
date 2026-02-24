"use client";

import "@/lib/rn-web-polyfills";

import { NumberFlow } from "number-flow-react-native";

export default function GitHubStarsCount({ stars }: { stars: number }) {
  return (
    <NumberFlow
      value={stars}
      style={{ fontSize: 12, color: "inherit" }}
      format={{ useGrouping: true }}
      trend={1}
    />
  );
}
