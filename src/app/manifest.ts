import type { MetadataRoute } from "next";

// Application installable (Ajouter à l'écran d'accueil) : s'ouvre sur le dashboard, plein écran, aux couleurs du thème sombre.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "SYXTEE NETWORKS",
    short_name: "SYXTEE",
    description: "Relais IRL low-cost : SRTLA, RTMP, RIST, dashboard et outils pour streamer en direct.",
    start_url: "/dashboard",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#15171c",
    theme_color: "#15171c",
    lang: "fr",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
