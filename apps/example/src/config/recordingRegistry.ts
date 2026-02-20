import type { ComponentType } from "react";

export interface RecordingEntry {
  key: string;
  title: string;
  SkiaComponent: ComponentType;
}

export const RECORDING_ENTRIES: RecordingEntry[] = [
  {
    key: "numbers",
    title: "NumberFlow",
    get SkiaComponent() {
      return require("../demos/recording/RecordingNumbersDemo").RecordingNumbersDemo;
    },
  },
  {
    key: "clock",
    title: "TimeFlow",
    get SkiaComponent() {
      return require("../demos/recording/RecordingClockDemo").RecordingClockDemo;
    },
  },
  {
    key: "scrubbing",
    title: "Scrubbing",
    get SkiaComponent() {
      return require("../demos/recording/RecordingScrubbingDemo").RecordingScrubbingDemo;
    },
  },
];

export function findRecordingEntry(key: string): RecordingEntry | undefined {
  return RECORDING_ENTRIES.find((entry) => entry.key === key);
}
