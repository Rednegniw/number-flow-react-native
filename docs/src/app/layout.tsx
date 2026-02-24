import { Analytics } from "@vercel/analytics/react";
import { RootProvider } from "fumadocs-ui/provider/next";
import type { Metadata } from "next";
import "./global.css";
import { Inter } from "next/font/google";

export const metadata: Metadata = {
  metadataBase: new URL("https://number-flow-react-native.awingender.com"),
  title: {
    default: "Number Flow React Native",
    template: "%s | Number Flow React Native",
  },
  description:
    "The best animated number component for React Native: digit-by-digit rolling, Intl.NumberFormat, View and Skia renderers.",
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    siteName: "Number Flow React Native",
    locale: "en_US",
    url: "/",
    images: "/og",
  },
  twitter: {
    card: "summary_large_image",
    creator: "@WingederA",
  },
};

const inter = Inter({
  subsets: ["latin"],
  fallback: ["Noto Sans Sinhala"],
});

export default function Layout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={inter.className} suppressHydrationWarning>
      <body className="flex flex-col min-h-screen">
        <RootProvider
          theme={{
            defaultTheme: "dark",
            forcedTheme: "dark",
            enableSystem: false,
          }}
        >
          {children}
        </RootProvider>
        <Analytics />
      </body>
    </html>
  );
}
