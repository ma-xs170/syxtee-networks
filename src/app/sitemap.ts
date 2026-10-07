import type { MetadataRoute } from "next";
import { navLinks, site } from "@/lib/site";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: site.url, changeFrequency: "weekly", priority: 1 },
    ...navLinks.map((item) => ({ url: `${site.url}${item.href}`, changeFrequency: "monthly" as const, priority: 0.8 })),
    // Pages rangées dans la documentation (plus dans le menu) : toujours publiques.
    ...["/fonctionnement", "/services", "/moblin", "/starlink", "/saily", "/faq", "/application", "/controle-a-distance"].map((href) => ({
      url: `${site.url}${href}`,
      changeFrequency: "monthly" as const,
      priority: 0.7,
    })),
    { url: `${site.url}/mentions-legales`, changeFrequency: "yearly", priority: 0.2 },
    { url: `${site.url}/credits`, changeFrequency: "yearly", priority: 0.2 },
    { url: `${site.url}/cgu`, changeFrequency: "yearly", priority: 0.2 },
    { url: `${site.url}/confidentialite`, changeFrequency: "yearly", priority: 0.2 },
    { url: `${site.url}/connexion`, changeFrequency: "yearly", priority: 0.3 },
  ];
}
