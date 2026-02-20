import Link from "next/link";
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
          <h1 className="text-2xl sm:text-4xl font-bold tracking-tight text-center max-w-lg">
            The best number animation library for React Native
          </h1>
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
    </main>
  );
}
