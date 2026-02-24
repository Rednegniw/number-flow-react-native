"use client";

import "@/lib/rn-web-polyfills";

import { Star } from "lucide-react";
import { NumberFlow } from "number-flow-react-native";
import { useEffect, useState } from "react";
import { gitConfig } from "@/lib/layout.shared";

const POLL_INTERVAL = 60_000;
const GITHUB_URL = `https://github.com/${gitConfig.user}/${gitConfig.repo}`;

export function GitHubStarsButton() {
  const [stars, setStars] = useState(0);
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    const controller = new AbortController();

    async function fetchStars() {
      try {
        const res = await fetch("/api/github-stars", { signal: controller.signal });
        if (!res.ok) return;
        const data = await res.json();
        if (data.stars > 0) setStars(data.stars);
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

  const label = stars > 0 ? `Star on GitHub (${stars} stars)` : "Star on GitHub";

  return (
    <a
      href={GITHUB_URL}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={label}
      className="group ms-auto inline-flex items-center gap-1.5 rounded-md border mt-1 border-white/8 bg-white/3 px-2 py-1.5 text-xs text-fd-muted-foreground transition-colors hover:border-(--brand-accent)/30 hover:bg-(--brand-accent)/4 hover:text-fd-foreground"
    >
      <Star className="size-3.5 fill-(--brand-accent) text-(--brand-accent) transition-transform group-hover:scale-110" />

      <span className="tabular-nums">
        {mounted ? (
          <NumberFlow
            value={stars}
            style={{ fontSize: 12, color: "inherit" }}
            format={{ useGrouping: true }}
            trend={1}
          />
        ) : (
          <span style={{ fontSize: 12 }}>0</span>
        )}
      </span>
    </a>
  );
}
