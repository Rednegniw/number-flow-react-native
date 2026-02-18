import { Analytics } from "@vercel/analytics/react";
import { RootProvider } from "fumadocs-ui/provider/next";
import Script from "next/script";
import "./global.css";
import { Inter } from "next/font/google";

const inter = Inter({
  subsets: ["latin"],
});

export default function Layout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={inter.className} suppressHydrationWarning>
      <body className="flex flex-col min-h-screen">
        <RootProvider>{children}</RootProvider>
        <Analytics />
        <Script src="https://snack.expo.dev/embed.js" strategy="lazyOnload" />
      </body>
    </html>
  );
}
