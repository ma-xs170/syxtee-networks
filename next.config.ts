import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Dossier de build séparé pour les tests e2e (un `next dev` peut déjà tourner sur .next).
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
    ];
  },
};

export default nextConfig;
