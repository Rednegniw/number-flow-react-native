interface VideoDemoProps {
  src?: string;
  poster?: string;
  title: string;
  height?: number;
}

export function VideoDemo({ src, poster, title, height = 300 }: VideoDemoProps) {
  if (!src) {
    return (
      <div
        className="rounded-lg border border-fd-border bg-fd-muted/50 flex items-center justify-center"
        style={{ height }}
      >
        <p className="text-sm text-fd-muted-foreground">{title} — video demo coming soon</p>
      </div>
    );
  }

  return (
    <video
      autoPlay
      loop
      muted
      playsInline
      poster={poster}
      className="rounded-lg w-full"
      style={{ height }}
    >
      <source src={src} />
    </video>
  );
}
