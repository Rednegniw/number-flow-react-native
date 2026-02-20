"use client";

import { motion } from "motion/react";
import dynamic from "next/dynamic";
import type { ReactNode } from "react";

const NumberFlowDemo = dynamic(() => import("./feature-card-demos").then((m) => m.NumberFlowDemo), {
  ssr: false,
  loading: () => <span className="text-fd-muted-foreground text-xl">1,234</span>,
});

const TimeFlowDemo = dynamic(() => import("./feature-card-demos").then((m) => m.TimeFlowDemo), {
  ssr: false,
  loading: () => <span className="text-fd-muted-foreground text-xl">12:00</span>,
});

const ScrubbingDemo = dynamic(() => import("./feature-card-demos").then((m) => m.ScrubbingDemo), {
  ssr: false,
  loading: () => <span className="text-fd-muted-foreground text-xl">50</span>,
});

const I18nDemo = dynamic(() => import("./feature-card-demos").then((m) => m.I18nDemo), {
  ssr: false,
  loading: () => <span className="text-fd-muted-foreground text-xl">$1,234.56</span>,
});

const NumeralsDemo = dynamic(() => import("./feature-card-demos").then((m) => m.NumeralsDemo), {
  ssr: false,
  loading: () => <span className="text-fd-muted-foreground text-xl">١٬٢٣٤</span>,
});

const RenderersDemo = dynamic(() => import("./feature-card-demos").then((m) => m.RenderersDemo), {
  ssr: false,
  loading: () => <span className="text-fd-muted-foreground text-xl">1,234 1,234</span>,
});

type Feature = {
  title: string;
  description: string;
  demo: ReactNode;
};

const features: Feature[] = [
  {
    demo: <NumberFlowDemo />,
    title: "Digit-by-Digit Rolling",
    description:
      "Each digit animates independently via virtual wheels with automatic direction detection.",
  },
  {
    demo: <RenderersDemo />,
    title: "Two Renderers",
    description: "View-based for quick setup, Skia for performance. Same API, choose your backend.",
  },
  {
    demo: <I18nDemo />,
    title: "Full i18n Support",
    description:
      "Built on Intl.NumberFormat — currencies, percentages, units, 34+ numeral systems.",
  },
  {
    demo: <TimeFlowDemo />,
    title: "TimeFlow",
    description: "Dedicated animated time display with 12h/24h, timestamps, and countdown support.",
  },
  {
    demo: <ScrubbingDemo />,
    title: "120 FPS Updates",
    description:
      "Worklet-driven scrubbing for zero-latency, gesture-driven digit transitions on the UI thread.",
  },
  {
    demo: <NumeralsDemo />,
    title: "Non-Latin Numerals",
    description: "34 Unicode numeral systems — Arabic-Indic, Devanagari, Thai, CJK, and more.",
  },
];

export function FeatureCards() {
  return (
    <div className="not-prose grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 max-w-4xl">
      {features.map((feature, index) => (
        <motion.div
          key={feature.title}
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-50px" }}
          transition={{ duration: 0.5, delay: index * 0.08, ease: "easeOut" }}
          className="group relative overflow-hidden rounded-2xl border border-white/[0.06] bg-gradient-to-b from-[#fffeba]/[0.02] to-white/[0.01] p-6 transition-colors duration-300 hover:border-white/[0.12]"
        >
          {/* Top-edge highlight shimmer */}
          <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-linear-to-r from-transparent via-white/[0.08] to-transparent" />

          {/* Live demo */}
          <div className="mb-3">{feature.demo}</div>

          <h3 className="text-[15px] font-semibold tracking-tight text-fd-foreground">
            {feature.title}
          </h3>
          <p className="mt-1.5 text-[13px] leading-relaxed text-fd-muted-foreground">
            {feature.description}
          </p>
        </motion.div>
      ))}
    </div>
  );
}
