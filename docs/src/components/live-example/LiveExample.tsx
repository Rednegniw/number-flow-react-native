"use client";

import dynamic from "next/dynamic";

const LiveExampleContent = dynamic(
  () => import("./LiveExampleContent").then((m) => m.LiveExampleContent),
  {
    ssr: false,
    loading: () => <div className="h-[560px] rounded-xl bg-fd-muted animate-pulse my-6" />,
  },
);

interface LiveExampleProps {
  code: string;
}

export function LiveExample({ code }: LiveExampleProps) {
  return <LiveExampleContent code={code} />;
}
