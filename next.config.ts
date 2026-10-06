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
      { source: "/studio", destination: "/mix", permanent: true },
      { source: "/syxtee-studio", destination: "/syxtee-mix", permanent: true },
      { source: "/dashboard/urls", destination: "/dashboard/relais", permanent: true },
      { source: "/dashboard/commutateur", destination: "/commutateur", permanent: true },
    ];
  },
};

export default nextConfig;
