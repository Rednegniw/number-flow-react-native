import { HomeLayout } from "fumadocs-ui/layouts/home";
import { baseOptions } from "@/lib/layout.shared";

export default function Layout({ children }: LayoutProps<"/">) {
  return (
    <HomeLayout {...baseOptions()} nav={{ ...baseOptions().nav, enabled: false }}>
      {children}
    </HomeLayout>
  );
}
