"use client";

import { CodeBlock, Pre } from "fumadocs-ui/components/codeblock";
import { useCopyButton } from "fumadocs-ui/utils/use-copy-button";
import { Check, Clipboard } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { type ComponentProps, useCallback, useRef } from "react";
import { cn } from "@/lib/cn";

/**
 * Animated copy-to-clipboard button that crossfades between clipboard and check icons.
 * Mirrors Fumadocs' built-in CopyButton DOM traversal (figure → pre → textContent)
 * but adds motion-based icon transitions and press feedback.
 */
export function AnimatedCopyButton() {
  const buttonRef = useRef<HTMLButtonElement>(null);

  // Walk up to the <figure> wrapper that CodeBlock renders, then find the <pre> inside it
  const onCopy = useCallback(() => {
    const figure = buttonRef.current?.closest("figure");
    const pre = figure?.querySelector("pre");
    if (!pre) return;

    // Clone and strip elements Fumadocs marks as non-copyable (e.g. line numbers)
    const clone = pre.cloneNode(true) as HTMLElement;
    for (const el of clone.querySelectorAll(".nd-copy-ignore")) {
      el.remove();
    }

    const text = clone.textContent ?? "";
    return navigator.clipboard.writeText(text);
  }, []);

  const [checked, onClick] = useCopyButton(onCopy);

  return (
    <motion.button
      ref={buttonRef}
      type="button"
      aria-label={checked ? "Copied" : "Copy to clipboard"}
      onClick={onClick}
      whileTap={{ scale: 0.9 }}
      className="inline-flex items-center justify-center rounded-md p-1.5 text-fd-muted-foreground transition-colors hover:bg-fd-accent hover:text-fd-accent-foreground"
    >
      {/* mode="wait" ensures the exiting icon fully leaves before the entering one appears */}
      <AnimatePresence mode="wait" initial={false}>
        {checked ? (
          <motion.span
            key="check"
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.5, opacity: 0 }}
            transition={{ duration: 0.15 }}
          >
            <Check className="size-3.5" />
          </motion.span>
        ) : (
          <motion.span
            key="clipboard"
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.5, opacity: 0 }}
            transition={{ duration: 0.15 }}
          >
            <Clipboard className="size-3.5" />
          </motion.span>
        )}
      </AnimatePresence>
    </motion.button>
  );
}

/**
 * Client-side wrapper around Fumadocs CodeBlock that bakes in the AnimatedCopyButton.
 * This exists because the Actions render prop is a function; it can't be passed
 * across the server→client boundary in Next.js App Router.
 */
export function AnimatedCodeBlock(props: ComponentProps<"pre">) {
  return (
    <CodeBlock
      {...props}
      allowCopy={false}
      Actions={({ className }) => (
        <div className={cn("empty:hidden", className)}>
          <AnimatedCopyButton />
        </div>
      )}
    >
      <Pre>{props.children}</Pre>
    </CodeBlock>
  );
}
