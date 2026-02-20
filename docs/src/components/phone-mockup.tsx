import type { ReactNode } from "react";

interface PhoneMockupProps {
  children: ReactNode;
}

export function PhoneMockup({ children }: PhoneMockupProps) {
  return (
    <div className="relative mx-auto" style={{ maxWidth: 280 }}>
      {/* Frame image — establishes dimensions, sits on top */}
      <img
        src="/iphone-mockup.png"
        alt=""
        className="relative z-10 w-full h-auto pointer-events-none select-none"
        draggable={false}
      />

      {/* Screen content — positioned behind the frame */}
      <div
        className="absolute z-0 overflow-hidden bg-black"
        style={{
          top: "1.9%",
          left: "4%",
          right: "4%",
          bottom: "1.9%",
          borderRadius: "7% / 3.4%",
        }}
      >
        {children}
      </div>
    </div>
  );
}
