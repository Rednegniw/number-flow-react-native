"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";

declare global {
  interface Window {
    ExpoSnack?: {
      initialize: () => void;
      append: (container: Element) => void;
      remove: (container: Element) => void;
    };
  }
}

export function SnackInitializer() {
  const pathname = usePathname();

  // biome-ignore lint/correctness/useExhaustiveDependencies: pathname triggers reinit on navigation
  useEffect(() => {
    window.ExpoSnack?.initialize();
  }, [pathname]);

  // Safety net: MutationObserver catches async MDX rendering
  useEffect(() => {
    const target = document.querySelector("main") ?? document.body;

    const observer = new MutationObserver(() => {
      const hasUninitializedSnack = document.querySelector(".snack-player:not(:has(iframe))");
      if (hasUninitializedSnack) {
        window.ExpoSnack?.initialize();
      }
    });

    observer.observe(target, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, []);

  return null;
}
