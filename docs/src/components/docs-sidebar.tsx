"use client";

import { usePathname } from "fumadocs-core/framework";
import type * as PageTree from "fumadocs-core/page-tree";
import { SidebarItem } from "fumadocs-ui/components/sidebar/base";
import { AnimatePresence, motion } from "motion/react";
import { createContext, type ReactNode, use, useState } from "react";
import { SectionIconBadge } from "./sidebar-separator";

// Shared hover context so layoutId animations work across all items
const HoverContext = createContext<{
  hoveredItem: string | null;
  setHoveredItem: (id: string | null) => void;
}>({ hoveredItem: null, setHoveredItem: () => {} });

export function SidebarHoverProvider({ children }: { children: React.ReactNode }) {
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);

  return <HoverContext value={{ hoveredItem, setHoveredItem }}>{children}</HoverContext>;
}

// Spring configs
const springSnappy = { type: "spring" as const, stiffness: 500, damping: 35 };
const springSoft = { type: "spring" as const, stiffness: 200, damping: 20 };

function checkActive(href: string, pathname: string): boolean {
  const norm = (s: string) => (s.length > 1 && s.endsWith("/") ? s.slice(0, -1) : s);
  return norm(href) === norm(pathname);
}

const itemClassName =
  "relative flex flex-row items-center gap-2 rounded-lg p-2 text-start !bg-transparent hover:!bg-transparent data-[active=true]:!bg-transparent ml-2 !pl-4";

export function AnimatedSidebarItem({ item }: { item: PageTree.Item }) {
  const pathname = usePathname();
  const { hoveredItem, setHoveredItem } = use(HoverContext);

  const active = checkActive(item.url, pathname);
  const hovered = hoveredItem === item.url;
  const highlighted = active || hovered;
  const textColorClass = highlighted ? "text-fd-foreground" : "text-fd-muted-foreground";

  return (
    <SidebarItem
      href={item.url}
      external={item.external}
      className={itemClassName}
      onMouseEnter={() => setHoveredItem(item.url)}
      onMouseLeave={() => setHoveredItem(null)}
    >
      {/* Vertical connector line */}
      <span className="h-full w-px bg-fd-border absolute left-[9px] inset-y-0" />

      {/* Active indicator pill */}
      <AnimatePresence initial={false} mode="wait">
        {active && (
          <motion.span
            layoutId="sidebar-active"
            className="pointer-events-none absolute z-[11] left-[8px] top-1/2 h-[56%] w-[3px] -translate-y-1/2 rounded-full bg-fd-primary"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={springSnappy}
          />
        )}
      </AnimatePresence>

      {/* Hover indicator pill (hidden when active — active pill takes priority) */}
      <AnimatePresence initial={false} mode="wait">
        {hovered && !active && (
          <motion.span
            layoutId="sidebar-hover"
            className="pointer-events-none absolute z-10 left-[8px] top-1/2 h-[56%] w-[3px] -translate-y-1/2 rounded-full bg-neutral-300 dark:bg-neutral-600"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={springSnappy}
          />
        )}
      </AnimatePresence>

      {/* Text with spring nudge */}
      <motion.span
        className={`text-sm w-full pl-[12px] ${textColorClass}`}
        animate={{ x: highlighted ? 3 : 0 }}
        transition={springSoft}
      >
        {item.name}
      </motion.span>
    </SidebarItem>
  );
}

export function AnimatedSidebarSeparator({ item }: { item: PageTree.Separator }) {
  return <SectionIconBadge name={item.name} />;
}

export function AnimatedSidebarFolder({
  item,
  children,
}: {
  item: PageTree.Folder;
  children: ReactNode;
}) {
  /**
   * Since our separators already label each section with icon badges,
   * we skip the folder trigger entirely and just render children expanded.
   * The folder's own index page (if any) is rendered as a regular item.
   */
  return (
    <div>
      {item.index && <AnimatedSidebarItem item={item.index} />}
      {children}
    </div>
  );
}
