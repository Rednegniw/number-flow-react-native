"use client";

import type { SandpackTheme } from "@codesandbox/sandpack-react";
import { SandpackCodeViewer, SandpackProvider } from "@codesandbox/sandpack-react";
import { githubLight, nightOwl } from "@codesandbox/sandpack-themes";
import { useTheme } from "next-themes";
import { LiveExamplePhoneMockup } from "../live-example/LiveExamplePhoneMockup";
import {
  ENTRY_CODE,
  INDEX_HTML_CODE,
  SANDPACK_DEPENDENCIES,
  VITE_CONFIG_CODE,
} from "../live-example/sandpack-config";

const darkTheme: SandpackTheme = {
  ...nightOwl,
  colors: {
    ...nightOwl.colors,
    surface1: "#0a0a0a",
    surface2: "#1a1a1a",
    surface3: "#111111",
  },
};

const DISCLAIMER =
  "Skia components require native rendering and can\u2019t run in browser sandboxes. This recording was captured from the example app running on a device.";

interface VideoExampleContentProps {
  code: string;
  src: string;
}

export function VideoExampleContent({ code, src }: VideoExampleContentProps) {
  const { resolvedTheme } = useTheme();
  const theme = resolvedTheme === "dark" ? darkTheme : githubLight;
  const decodedCode = decodeURIComponent(code);

  return (
    <div className="my-6">
      <SandpackProvider
        template="vite-react"
        theme={theme}
        customSetup={{
          dependencies: SANDPACK_DEPENDENCIES,
        }}
        files={{
          "/App.tsx": decodedCode,
          "/App.jsx": { code: "", hidden: true },
          "/vite.config.js": { code: VITE_CONFIG_CODE, hidden: true },
          "/index.jsx": { code: ENTRY_CODE, hidden: true },
          "/index.html": { code: INDEX_HTML_CODE, hidden: true },
          "/styles.css": { code: "", hidden: true },
        }}
        options={{ bundlerTimeOut: 90000, activeFile: "/App.tsx" }}
      >
        <div className="flex flex-col lg:flex-row gap-4">
          {/* Code editor (read-only) */}
          <div
            className="flex-1 min-w-0 overflow-hidden rounded-xl border border-fd-border [&>div]:h-full"
            style={{ height: 560 }}
          >
            <SandpackCodeViewer showLineNumbers decorators={[{ line: 1, className: "" }]} />
          </div>

          {/* Phone preview with video */}
          <div className="shrink-0 flex justify-center" style={{ height: 560 }}>
            <LiveExamplePhoneMockup screenClassName="bg-[#0a0a0a]">
              <video
                autoPlay
                loop
                muted
                playsInline
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "contain",
                }}
              >
                <source src={src} type="video/mp4" />
              </video>
            </LiveExamplePhoneMockup>
          </div>
        </div>
      </SandpackProvider>

      <p className="text-xs text-fd-muted-foreground mt-3 text-center italic">{DISCLAIMER}</p>
    </div>
  );
}
