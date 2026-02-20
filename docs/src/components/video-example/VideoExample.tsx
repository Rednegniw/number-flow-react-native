"use client";

import dynamic from "next/dynamic";

const VideoExampleContent = dynamic(
  () => import("./VideoExampleContent").then((m) => m.VideoExampleContent),
  {
    ssr: false,
    loading: () => <div className="h-[560px] rounded-xl bg-fd-muted animate-pulse my-6" />,
  },
);

interface VideoExampleProps {
  code: string;
  src: string;
}

export function VideoExample({ code, src }: VideoExampleProps) {
  return <VideoExampleContent code={code} src={src} />;
}
