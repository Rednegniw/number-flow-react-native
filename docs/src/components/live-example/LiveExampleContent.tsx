"use client";

import type { SandpackTheme } from "@codesandbox/sandpack-react";
import {
  SandpackCodeEditor,
  SandpackPreview,
  SandpackProvider,
  useSandpack,
} from "@codesandbox/sandpack-react";
import { githubLight, nightOwl } from "@codesandbox/sandpack-themes";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
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

const spinnerKeyframes = `
@keyframes nf-spin {
  to { transform: rotate(360deg); }
}
`;

function PreviewWithOverlay() {
  const { listen } = useSandpack();
  const [ready, setReady] = useState(false);
  const [removed, setRemoved] = useState(false);

  useEffect(() => {
    const unsub = listen((msg) => {
      if (msg.type === "done") {
        setTimeout(() => setReady(true), 500);
      }
    });
    return unsub;
  }, [listen]);

  useEffect(() => {
    if (!ready) return;
    const timer = setTimeout(() => setRemoved(true), 300);
    return () => clearTimeout(timer);
  }, [ready]);

  return (
    <div style={{ position: "relative", height: "100%", width: "100%" }}>
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

      {!removed && (
        <>
          <style>{spinnerKeyframes}</style>
          <div
            style={{
              position: "absolute",
              inset: 0,
              backgroundColor: "#0a0a0a",
              opacity: ready ? 0 : 1,
              transition: "opacity 300ms",
              pointerEvents: ready ? "none" : "auto",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: 16,
              zIndex: 10,
            }}
          >
            {/* Spinner */}
            <div
              style={{
                width: 24,
                height: 24,
                border: "2px solid rgba(255,255,255,0.1)",
                borderTopColor: "rgba(255,255,255,0.5)",
                borderRadius: "50%",
                animation: "nf-spin 0.8s linear infinite",
              }}
            />

            <span
              style={{
                color: "#555",
                fontSize: 11,
                textAlign: "center",
                padding: "0 16px",
                lineHeight: 1.4,
              }}
            >
              Waiting for demo to load.
              <br />
              This can take around 20 seconds.
            </span>
          </div>
        </>
      )}
    </div>
  );
}

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
            <PreviewWithOverlay />
          </LiveExamplePhoneMockup>
        </div>
      </div>
    </SandpackProvider>
  );
}
