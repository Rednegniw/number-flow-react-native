"use client";

import type { SandpackTheme } from "@codesandbox/sandpack-react";
import { SandpackCodeEditor, SandpackPreview, SandpackProvider } from "@codesandbox/sandpack-react";
import { githubLight, nightOwl } from "@codesandbox/sandpack-themes";
import { useTheme } from "next-themes";
import { LiveExamplePhoneMockup } from "./LiveExamplePhoneMockup";
import {
  ENTRY_CODE,
  EXAMPLE_UI_CODE,
  INDEX_HTML_CODE,
  SANDPACK_DEPENDENCIES,
  VITE_CONFIG_CODE,
} from "./sandpack-config";

const darkTheme: SandpackTheme = {
  ...nightOwl,
  colors: {
    ...nightOwl.colors,
    surface1: "#0a0a0a",
    surface2: "#1a1a1a",
    surface3: "#111111",
  },
};

interface LiveExampleProps {
  code: string;
}

export function LiveExampleContent({ code }: LiveExampleProps) {
  const { resolvedTheme } = useTheme();
  const theme = resolvedTheme === "dark" ? darkTheme : githubLight;
  const decodedCode = decodeURIComponent(code);

  return (
    <SandpackProvider
      template="vite-react"
      theme={theme}
      customSetup={{
        dependencies: SANDPACK_DEPENDENCIES,
      }}
      options={{ bundlerTimeOut: 90000, activeFile: "/App.tsx" }}
      files={{
        "/App.tsx": decodedCode,
        "/App.jsx": {
          code: "",
          hidden: true,
        },
        "/vite.config.js": {
          code: VITE_CONFIG_CODE,
          hidden: true,
        },
        "/index.jsx": {
          code: ENTRY_CODE,
          hidden: true,
        },
        "/index.html": {
          code: INDEX_HTML_CODE,
          hidden: true,
        },
        "/styles.css": {
          code: "",
          hidden: true,
        },
        "/ExampleUI.tsx": {
          code: EXAMPLE_UI_CODE,
          hidden: true,
        },
      }}
    >
      <div className="flex flex-col lg:flex-row gap-4 my-6">
        {/* Code editor */}
        <div className="flex-1 min-w-0 overflow-hidden rounded-xl border border-fd-border">
          <SandpackCodeEditor showLineNumbers showTabs={false} style={{ height: 560 }} />
        </div>

        {/* Phone preview */}
        <div className="shrink-0 flex items-center justify-center">
          <LiveExamplePhoneMockup>
            <SandpackPreview
              showOpenInCodeSandbox={false}
              showRefreshButton={false}
              style={{
                height: "100%",
                width: "100%",
                border: "none",
                borderRadius: 0,
              }}
            />
          </LiveExamplePhoneMockup>
        </div>
      </div>
    </SandpackProvider>
  );
}
