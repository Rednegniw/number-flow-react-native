import { createFileSystemGeneratorCache, createGenerator } from "fumadocs-typescript";
import { AutoTypeTable } from "fumadocs-typescript/ui";
import { Callout } from "fumadocs-ui/components/callout";
import { Step, Steps } from "fumadocs-ui/components/steps";
import defaultMdxComponents from "fumadocs-ui/mdx";
import type { MDXComponents } from "mdx/types";
import { AnimatedCodeBlock } from "@/components/animated-copy-button";
import { AnimatedTab, AnimatedTabs } from "@/components/animated-tabs";
import { FeatureCards } from "@/components/feature-cards";
import { LiveExample } from "@/components/live-example/LiveExample";
import { VideoDemo } from "@/components/video-demo";
import { VideoExample } from "@/components/video-example/VideoExample";

const generator = createGenerator({
  cache: createFileSystemGeneratorCache(".next/fumadocs-typescript"),
});

export function getMDXComponents(components?: MDXComponents): MDXComponents {
  return {
    ...defaultMdxComponents,
    Tabs: AnimatedTabs,
    Tab: AnimatedTab,
    Steps,
    Step,
    Callout,
    AutoTypeTable: (props) => <AutoTypeTable {...props} generator={generator} />,
    FeatureCards,
    VideoDemo,
    VideoExample,
    LiveExample,
    pre: AnimatedCodeBlock,
    ...components,
  };
}
