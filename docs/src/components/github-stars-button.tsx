"use client";

import { Star } from "lucide-react";
import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { gitConfig } from "@/lib/layout.shared";

const POLL_INTERVAL = 60_000;
const GITHUB_URL = `https://github.com/${gitConfig.user}/${gitConfig.repo}`;

const AnimatedCount = dynamic(() => import("./github-stars-count"), {
  ssr: false,
});

export function GitHubStarsButton() {
  const [stars, setStars] = useState<number | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    async function fetchStars() {
      try {
        const res = await fetch("/api/github-stars", { signal: controller.signal });
        if (!res.ok) return;
        const data = await res.json();
        if (typeof data.stars === "number") setStars(data.stars);
      } catch {
        // Silently ignore aborts and network errors
      }
    }

    fetchStars();
    const id = setInterval(fetchStars, POLL_INTERVAL);

    return () => {
      controller.abort();
      clearInterval(id);
    };
  }, []);

  const label = stars !== null ? `Star on GitHub (${stars} stars)` : "Star on GitHub";

  return (
    <a
      href={GITHUB_URL}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={label}
      className="group ms-auto inline-flex items-center gap-1.5 rounded-md border mt-1 border-white/[0.08] bg-white/[0.03] px-2 py-1.5 text-xs text-fd-muted-foreground transition-colors hover:border-[var(--brand-accent)]/30 hover:bg-[var(--brand-accent)]/[0.04] hover:text-fd-foreground"
    >
      <Star className="size-3.5 fill-[var(--brand-accent)] text-[var(--brand-accent)] transition-transform group-hover:scale-110" />

      {stars !== null && (
        <span className="tabular-nums">
          <AnimatedCount stars={stars} />
        </span>
      )}
    </a>
  );
}
