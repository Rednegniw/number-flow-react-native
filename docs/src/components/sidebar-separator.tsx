import { Anchor, BookOpen, Boxes, ChefHat, Component, type LucideIcon, Play } from "lucide-react";
import type { ReactNode } from "react";

const sectionIcons: Record<string, LucideIcon> = {
  Components: Component,
  Hooks: Anchor,
  Examples: Play,
  Recipes: ChefHat,
  Guides: BookOpen,
  Architecture: Boxes,
};

export function SectionIconBadge({ name }: { name: ReactNode }) {
  const nameStr = typeof name === "string" ? name : "";
  const Icon = sectionIcons[nameStr];

  return (
    <span className="flex items-center gap-2 px-2 pt-4 pb-1.5">
      {/* Icon badge */}
      {Icon && (
        <span className="relative flex size-5 items-center justify-center rounded-[5px] bg-fd-border text-fd-muted-foreground [&_svg]:size-[12px]">
          <Icon />
          <span className="absolute left-1/2 top-full w-px h-[8px] -translate-x-[calc(50%+0.5px)] bg-fd-border" />
        </span>
      )}

      {/* Section title */}
      <span className="text-sm font-medium text-fd-muted-foreground">{name}</span>
    </span>
  );
}
