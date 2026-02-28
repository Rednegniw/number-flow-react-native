"use client";

import * as TabsPrimitive from "@radix-ui/react-tabs";
import { motion } from "motion/react";
import {
  Children,
  type ComponentProps,
  type ReactElement,
  type ReactNode,
  useId,
  useState,
} from "react";
import { cn } from "@/lib/cn";

// Matches the spring used in docs-sidebar.tsx for consistent feel across the site
const springSnappy = { type: "spring" as const, stiffness: 500, damping: 35 };

// Match Fumadocs' value normalization so MDX `value="bun"` works the same way
function escapeValue(v: string): string {
  return v.toLowerCase().replace(/\s+/g, "-");
}

interface AnimatedTabsProps {
  items: string[];
  children: ReactNode;
  groupId?: string;
  defaultIndex?: number;
}

/**
 * Animated replacement for Fumadocs' Tabs component.
 * Uses Radix primitives directly (instead of wrapping Fumadocs Tabs) so we can
 * inject a motion.div with layoutId into each trigger for the sliding underline.
 */
export function AnimatedTabs({ items, children, defaultIndex = 0 }: AnimatedTabsProps) {
  // Scoped layoutId so multiple <Tabs> on the same page animate independently
  const instanceId = useId();
  const escapedItems = items.map(escapeValue);
  const [value, setValue] = useState(escapedItems[defaultIndex] ?? escapedItems[0]);

  return (
    <TabsPrimitive.Root
      value={value}
      onValueChange={setValue}
      className="my-4 overflow-hidden rounded-xl border border-fd-border"
    >
      {/* Trigger bar */}
      <TabsPrimitive.List className="flex flex-row bg-fd-muted/50 overflow-x-auto">
        {items.map((item, i) => {
          const escapedValue = escapedItems[i];
          const isActive = value === escapedValue;

          return (
            <TabsPrimitive.Trigger
              key={escapedValue}
              value={escapedValue}
              className={cn(
                "relative px-4 py-2 text-sm font-medium whitespace-nowrap transition-colors",
                isActive
                  ? "text-fd-foreground"
                  : "text-fd-muted-foreground hover:text-fd-foreground",
              )}
            >
              {item}

              {/* Sliding underline: motion animates position between triggers via shared layoutId */}
              {isActive && (
                <motion.span
                  layoutId={`tab-underline-${instanceId}`}
                  className="absolute inset-x-0 bottom-0 h-0.5 bg-fd-primary"
                  transition={springSnappy}
                />
              )}
            </TabsPrimitive.Trigger>
          );
        })}
      </TabsPrimitive.List>

      {/* Content panels, force-mounted so CSS animation replays on each activation */}
      {Children.map(children, (child) => {
        const element = child as ReactElement<ComponentProps<typeof AnimatedTab>>;
        if (!element?.props) return null;

        const childValue = element.props.value ? escapeValue(element.props.value) : undefined;

        return (
          <TabsPrimitive.Content
            key={childValue}
            value={childValue ?? ""}
            forceMount
            className={cn(
              "data-[state=inactive]:hidden",
              "data-[state=active]:animate-tab-slide-in",
              "[&>figure]:my-0 [&>figure]:rounded-none [&>figure]:border-0 [&>figure]:border-t",
            )}
          >
            {element.props.children}
          </TabsPrimitive.Content>
        );
      })}
    </TabsPrimitive.Root>
  );
}

interface AnimatedTabProps {
  value?: string;
  children: ReactNode;
}

/**
 * Data-only component, never renders on its own.
 * AnimatedTabs reads its props (value, children) to build Radix TabsContent panels.
 */
export function AnimatedTab(_props: AnimatedTabProps) {
  return null;
}
