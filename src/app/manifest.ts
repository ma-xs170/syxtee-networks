import type { MetadataRoute } from "next";

// Application installable (Ajouter à l'écran d'accueil) : s'ouvre sur le dashboard, plein écran, aux couleurs du thème sombre.
// Appui long sur l'icône : raccourcis directs vers le Contrôle à distance et les relais.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "SYXTEE NETWORKS",
    short_name: "SYXTEE",
    description: "Streame en direct, où que tu sois : flux stable et contrôle à distance d'OBS.",
    id: "/",
    start_url: "/dashboard",
    scope: "/",
    display: "standalone",
    orientation: "any",
    categories: ["utilities", "productivity"],
    background_color: "#050505",
    theme_color: "#050505",
    lang: "fr",
    shortcuts: [
      { name: "Contrôle à distance", short_name: "OBS", description: "Pilote ton OBS depuis ton téléphone", url: "/dashboard/controle-a-distance", icons: [{ src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" }] },
      { name: "Mes relais", short_name: "Relais", description: "Tes URLs et clés de relais", url: "/dashboard/relais", icons: [{ src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" }] },
    ],
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
