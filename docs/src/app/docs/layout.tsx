import { source } from '@/lib/source';
import { DocsLayout } from 'fumadocs-ui/layouts/docs';
import { baseOptions } from '@/lib/layout.shared';
import {
  SidebarHoverProvider,
  AnimatedSidebarItem,
  AnimatedSidebarSeparator,
  AnimatedSidebarFolder,
} from '@/components/docs-sidebar';

export default function Layout({ children }: LayoutProps<'/docs'>) {
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
