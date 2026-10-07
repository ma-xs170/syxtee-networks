import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Dossier de build séparé pour les tests e2e (un `next dev` peut déjà tourner sur .next).
  // Image Docker autonome (hébergement OVH, voir Dockerfile). Sans effet sur Vercel.
  output: "standalone",
  // Cache navigateur : une page déjà vue ou pré-chargée reste instantanée (retour arrière, aller-retour entre onglets).
  // Les actions serveur (revalidatePath) vident ce cache, donc les listes modifiées se rafraîchissent quand même.
  experimental: { staleTimes: { dynamic: 30, static: 180 }, serverActions: { bodySizeLimit: "20mb" } },
  distDir: process.env.NEXT_DIST_DIR || ".next",
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "static-cdn.jtvnw.net" }, // avatars Twitch
      { protocol: "https", hostname: "*.supabase.co", pathname: "/storage/v1/object/public/**" }, // avatars envoyés
      { protocol: "https", hostname: "cdn.discordapp.com" },
      { protocol: "https", hostname: "lh3.googleusercontent.com" },
    ],
  },
  async redirects() {
    return [
      { source: "/login", destination: "/connexion", permanent: true },
      { source: "/signup", destination: "/inscription", permanent: true },
      { source: "/studio", destination: "/dashboard/controle-a-distance", permanent: true },
      { source: "/syxtee-studio", destination: "/controle-a-distance", permanent: true },
      { source: "/dashboard/urls", destination: "/dashboard/relais", permanent: true },
      { source: "/docs/rist", destination: "/docs", permanent: true },
      { source: "/dashboard/apercu", destination: "/dashboard", permanent: true },
      { source: "/dashboard/enregistrements", destination: "/dashboard", permanent: true },
      { source: "/dashboard/dji", destination: "/dashboard", permanent: true },
      { source: "/dashboard/scanner", destination: "/dashboard", permanent: true },
      { source: "/dashboard/analyseur", destination: "/dashboard", permanent: true },
      { source: "/docs/dji", destination: "/docs", permanent: true },
      { source: "/analyseur", destination: "/", permanent: true },
      { source: "/dashboard/commutateur", destination: "/dashboard/controle-a-distance", permanent: true },
      // Pages retirées : les anciens liens (signets, moteurs de recherche, e-mails) arrivent sur la page qui les remplace.
      { source: "/pro", destination: "/encodeur", permanent: true },
      { source: "/syxtee-mix", destination: "/controle-a-distance", permanent: true },
      { source: "/commutateur", destination: "/dashboard/controle-a-distance", permanent: true },
      { source: "/mix", destination: "/dashboard/controle-a-distance", permanent: true },
      { source: "/couverture", destination: "/", permanent: true },
      { source: "/antennes", destination: "/", permanent: true },
      { source: "/offres", destination: "/acces", permanent: true },
      { source: "/dashboard/contributions", destination: "/dashboard/stats", permanent: true },
      { source: "/dashboard/sante", destination: "/dashboard/relais", permanent: true },
      { source: "/dashboard/mire", destination: "/dashboard/relais", permanent: true },
      { source: "/dashboard/obs", destination: "/dashboard/controle-a-distance", permanent: true },
      { source: "/dashboard/relais/:id/dji", destination: "/dashboard/relais", permanent: true },
      { source: "/dashboard/relais/:id", destination: "/dashboard/relais", permanent: true },
    ];
  },
};

export default nextConfig;
