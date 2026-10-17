import type { MetadataRoute } from "next";
import { site } from "@/lib/site";

export default function robots(): MetadataRoute.Robots {
  return { rules: { userAgent: "*", allow: "/", disallow: ["/dashboard", "/admin", "/api/", "/dev", "/compte", "/bienvenue", "/auth/", "/invitation/", "/rejoindre/", "/encodeur", "/boutique"] }, sitemap: `${site.url}/sitemap.xml` };
}
