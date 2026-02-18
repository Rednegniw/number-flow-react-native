import type { ReactNode } from "react";

interface PhoneMockupProps {
  children: ReactNode;
}

export function PhoneMockup({ children }: PhoneMockupProps) {
  return (
    <div className="relative mx-auto" style={{ maxWidth: 280 }}>
      {/* Device frame */}
      <div
        className="relative rounded-[40px] border-[6px] border-fd-foreground/90 bg-black shadow-2xl overflow-hidden"
        style={{ aspectRatio: "9 / 19.5" }}
      >
        {/* Notch */}
        <div
          className="absolute top-0 left-1/2 -translate-x-1/2 z-10 bg-fd-foreground/90 rounded-b-2xl"
          style={{ width: 120, height: 28 }}
        />

        {/* Screen content */}
        <div className="w-full h-full overflow-hidden">{children}</div>
      </div>
    </div>
  );
}
