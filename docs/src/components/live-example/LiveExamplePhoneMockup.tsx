import Image from "next/image";
import type { ReactNode } from "react";

interface LiveExamplePhoneMockupProps {
  children: ReactNode;
  screenClassName?: string;
}

export function LiveExamplePhoneMockup({
  children,
  screenClassName = "bg-white",
}: LiveExamplePhoneMockupProps) {
  return (
    <div className="relative w-fit h-full">
      {/* Frame image: establishes dimensions, sits on top */}
      <Image
        src="/iphone-mockup.png"
        alt=""
        width={390}
        height={844}
        className="relative z-10 h-full w-auto pointer-events-none select-none"
        style={{ margin: 0 }}
        draggable={false}
        priority
      />

      {/* Screen content, positioned behind the frame */}
      <div
        className={`absolute z-0 overflow-hidden ${screenClassName}`}
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
