import type { ReactNode } from "react";

interface LiveExamplePhoneMockupProps {
  children: ReactNode;
}

export function LiveExamplePhoneMockup({ children }: LiveExamplePhoneMockupProps) {
  return (
    <div className="relative mx-auto" style={{ height: 560, aspectRatio: "9 / 19.5" }}>
      <div className="relative flex flex-col h-full rounded-[36px] border-[3px] border-fd-border bg-fd-card shadow-xl overflow-hidden">
        {/* Camera pill */}
        <div
          className="flex items-center justify-center shrink-0"
          style={{ height: 28, paddingTop: 8 }}
        >
          <div
            className="rounded-full bg-fd-muted-foreground/20"
            style={{ width: 36, height: 10 }}
          />
        </div>

        {/* Screen content */}
        <div className="flex-1 overflow-hidden bg-white">{children}</div>

        {/* Home indicator */}
        <div className="flex items-center justify-center shrink-0" style={{ height: 24 }}>
          <div
            className="rounded-full bg-fd-muted-foreground/30"
            style={{ width: 96, height: 4 }}
          />
        </div>
      </div>
    </div>
  );
}
