import type { MetadataRoute } from "next";
import { docs } from "@/lib/docs";
import { navLinks, site } from "@/lib/site";

export default function sitemap(): MetadataRoute.Sitemap {
  const entries: MetadataRoute.Sitemap = [
    { url: site.url, changeFrequency: "weekly", priority: 1 },
    ...navLinks.filter((item) => item.href.startsWith("/")).map((item) => ({ url: `${site.url}${item.href}`, changeFrequency: "monthly" as const, priority: 0.8 })),
    // Pages rangées dans la documentation (plus dans le menu) : toujours publiques.
    ...["/fonctionnement", "/services", "/moblin", "/starlink", "/saily", "/faq", "/application", "/controle-a-distance", "/regie-ia", "/guide-live-irl", "/multistream", "/espaces-partages", "/contact", "/soutenir"].map((href) => ({
      url: `${site.url}${href}`,
      changeFrequency: "monthly" as const,
      priority: 0.7,
    })),
    // Documentation et état du service : sur leur propre sous-domaine.
    { url: `${site.docsUrl}/docs`, changeFrequency: "monthly", priority: 0.7 },
    ...docs.map((d) => ({ url: `${site.docsUrl}/docs/${d.slug}`, changeFrequency: "monthly" as const, priority: 0.6 })),
    { url: `${site.statusUrl}/statut`, changeFrequency: "monthly", priority: 0.7 },
    { url: `${site.url}/cgv`, changeFrequency: "yearly", priority: 0.2 },
    { url: `${site.url}/mentions-legales`, changeFrequency: "yearly", priority: 0.2 },
    { url: `${site.url}/credits`, changeFrequency: "yearly", priority: 0.2 },
    { url: `${site.url}/cgu`, changeFrequency: "yearly", priority: 0.2 },
    { url: `${site.url}/confidentialite`, changeFrequency: "yearly", priority: 0.2 },
  ];
  // Une page peut venir du menu et de la liste « documentation » : une seule entrée par URL.
  return [...new Map(entries.map((e) => [e.url, e])).values()];
}
