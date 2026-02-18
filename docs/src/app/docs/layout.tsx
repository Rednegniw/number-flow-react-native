import { DocsLayout } from "fumadocs-ui/layouts/docs";
import {
  AnimatedSidebarFolder,
  AnimatedSidebarItem,
  AnimatedSidebarSeparator,
  SidebarHoverProvider,
} from "@/components/docs-sidebar";
import { baseOptions } from "@/lib/layout.shared";
import { source } from "@/lib/source";

export default function Layout({ children }: LayoutProps<"/docs">) {
  return (
    <SidebarHoverProvider>
      <DocsLayout
        tree={source.getPageTree()}
        {...baseOptions()}
        sidebar={{
          components: {
            Item: AnimatedSidebarItem,
            Separator: AnimatedSidebarSeparator,
            Folder: AnimatedSidebarFolder,
          },
        }}
      >
        {children}
      </DocsLayout>
    </SidebarHoverProvider>
  );
}
