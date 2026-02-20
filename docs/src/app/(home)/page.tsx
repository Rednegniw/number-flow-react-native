import Link from "next/link";
import { Logo } from "@/components/logo";
import { PhoneMockup } from "@/components/phone-mockup";

export default function HomePage() {
  return (
    <main className="flex flex-col items-center justify-center flex-1 px-4 py-16 gap-12">
      {/* Hero */}
      <section className="flex flex-col items-center gap-8 max-w-2xl text-center">
        <PhoneMockup>
          <video autoPlay loop muted playsInline className="w-full h-full object-cover">
            <source src="/videos/hero-demo.mp4" type="video/mp4" />
          </video>

          {/* Placeholder overlay — remove once video exists */}
          <div className="absolute inset-0 flex items-center justify-center bg-fd-muted/80">
            <p className="text-sm text-fd-muted-foreground">Demo video coming soon</p>
          </div>
        </PhoneMockup>

        {/* Title */}
        <div className="flex flex-col items-center gap-3">
          <div className="flex items-center gap-2 sm:gap-3">
            <Logo className="size-8 sm:size-12 text-fd-primary" />
            <h1 className="text-2xl sm:text-5xl font-bold tracking-tight">
              Number Flow React Native
            </h1>
          </div>
          <p className="text-lg text-fd-muted-foreground max-w-md mx-auto">
            Smooth, digit-by-digit animated number transitions for React Native. Inspired by{" "}
            <a
              href="https://number-flow.barvian.me/"
              target="_blank"
              rel="noopener noreferrer"
              className="underline hover:text-fd-foreground"
            >
              NumberFlow
            </a>
            .
          </p>
        </div>

        {/* CTA buttons */}
        <div className="flex flex-row gap-3">
          <Link
            href="/docs"
            className="inline-flex items-center gap-2 rounded-lg bg-fd-primary px-5 py-2.5 text-sm font-medium text-fd-primary-foreground hover:bg-fd-primary/90 transition-colors"
          >
            Documentation
          </Link>
          <a
            href="https://github.com/Rednegniw/number-flow-react-native"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-lg border border-fd-border px-5 py-2.5 text-sm font-medium hover:bg-fd-accent transition-colors"
          >
            GitHub
          </a>
        </div>
      </section>

      {/* Feature cards */}
      <section className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-3xl w-full">
        <div className="rounded-lg border border-fd-border p-5">
          <h3 className="font-semibold mb-1">Two Renderers</h3>
          <p className="text-sm text-fd-muted-foreground">
            View-based for simplicity, Skia for performance. Same API, choose your backend.
          </p>
        </div>
        <div className="rounded-lg border border-fd-border p-5">
          <h3 className="font-semibold mb-1">120 FPS Animations</h3>
          <p className="text-sm text-fd-muted-foreground">
            Worklet-driven digit wheels on the UI thread. Zero bridge latency with Skia scrubbing.
          </p>
        </div>
        <div className="rounded-lg border border-fd-border p-5">
          <h3 className="font-semibold mb-1">Full i18n</h3>
          <p className="text-sm text-fd-muted-foreground">
            Built on Intl.NumberFormat. Currencies, percentages, 34 numeral systems, all locales.
          </p>
        </div>
      </section>
    </main>
  );
}
