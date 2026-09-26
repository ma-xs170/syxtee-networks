import type { MetadataRoute } from "next";
import { nav, site } from "@/lib/site";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: site.url, changeFrequency: "weekly", priority: 1 },
    ...nav.map((item) => ({ url: `${site.url}${item.href}`, changeFrequency: "monthly" as const, priority: 0.8 })),
    { url: `${site.url}/mentions-legales`, changeFrequency: "yearly", priority: 0.2 },
  ];
}
