import type { MetadataRoute } from "next";
import { source } from "@/lib/source";

const BASE_URL = "https://number-flow-react-native.awingender.com";

export default function sitemap(): MetadataRoute.Sitemap {
  const docPages = source.getPages().map((page) => ({
    url: `${BASE_URL}${page.url}`,
    lastModified: page.data.lastModified ?? new Date(),
    changeFrequency: "weekly" as const,
    priority: 0.7,
  }));

  return [
    {
      url: BASE_URL,
      lastModified: new Date(),
      changeFrequency: "monthly" as const,
      priority: 1.0,
    },
    ...docPages,
  ];
}
