import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Dossier de build séparé pour les tests e2e (un `next dev` peut déjà tourner sur .next).
  // Image Docker autonome (hébergement OVH, voir Dockerfile). Sans effet sur Vercel.
  output: "standalone",
  // Cache navigateur : une page déjà vue ou pré-chargée reste instantanée (retour arrière, aller-retour entre onglets).
  // Les actions serveur (revalidatePath) vident ce cache, donc les listes modifiées se rafraîchissent quand même.
  experimental: { staleTimes: { dynamic: 30, static: 180 }, serverActions: { bodySizeLimit: "20mb" } },
  distDir: process.env.NEXT_DIST_DIR || ".next",
  // Réponses compressées (gzip sur l'image Docker ; Vercel ajoute brotli) et pas d'en-tête X-Powered-By.
  compress: true,
  poweredByHeader: false,
  images: {
    // Formats modernes, plus légers que le JPEG/PNG d'origine ; une image optimisée reste 1 jour en cache.
    formats: ["image/avif", "image/webp"],
    minimumCacheTTL: 86_400,
    remotePatterns: [
      { protocol: "https", hostname: "static-cdn.jtvnw.net" }, // avatars Twitch
      { protocol: "https", hostname: "*.supabase.co", pathname: "/storage/v1/object/public/**" }, // avatars envoyés
      { protocol: "https", hostname: "cdn.discordapp.com" },
      { protocol: "https", hostname: "lh3.googleusercontent.com" },
    ],
  },
  // Fichiers de /public qui ne changent pas : gardés 1 jour par le navigateur et le CDN, puis relus en douceur pendant 7 jours.
  // (Les fichiers de _next/static sont déjà « immutable » ; sw.js et les manifestes restent toujours frais.)
  async headers() {
    const stable = "public, max-age=86400, stale-while-revalidate=604800";
    return ["images", "visuals", "devices", "glass-icons", "icons", "videos", "kit"].map((dir) => ({
      source: `/${dir}/:path*`,
      headers: [{ key: "Cache-Control", value: stable }],
    }));
  },
  async redirects() {
    // Sous-domaines : www = site, app = espace client, auth = connexion, admin = administration, remote = contrôle à distance d'OBS, docs = documentation, status = état du service. Le même projet sert les sept ; ces règles renvoient chaque page sur son hôte.
    const ROOT = "syxtee-networks.fr";
    const WWW = `https://www.${ROOT}`;
    const APP = `https://app.${ROOT}`;
    const AUTH = `https://auth.${ROOT}`;
    const ADMIN = `https://admin.${ROOT}`;
    const REMOTE = `https://remote.${ROOT}`;
    const DOCS = `https://docs.${ROOT}`;
    const STATUS = `https://status.${ROOT}`;
    const host = (value: string) => [{ type: "host" as const, value }];
    const AUTH_PAGES = ["/connexion", "/inscription", "/mot-de-passe-oublie", "/reinitialiser", "/premiere-connexion"];
    const APP_PAGES = ["/dashboard", "/bienvenue", "/cam"];
    const OTHER_HOSTS = ["www", "app", "auth", "admin", "remote", "docs", "status", "videastes"].map((h) => `${h}.${ROOT}`);
    const except = (...keep: string[]) => OTHER_HOSTS.filter((h) => !keep.includes(h.split(".")[0]));
    const to = (base: string, sources: string[], from: string[]) =>
      from.flatMap((h) => sources.flatMap((src) => [{ source: src, has: host(h), destination: `${base}${src}`, permanent: true }, ...(src === "/cam" || src === "/bienvenue" || AUTH_PAGES.includes(src) ? [] : [{ source: `${src}/:path*`, has: host(h), destination: `${base}${src}/:path*`, permanent: true }])]));
    const hostRoutes = [
      { source: "/:path*", has: host(ROOT), destination: `${WWW}/:path*`, permanent: true },
      ...[
      // Espace client : toujours sur app.
      ...to(APP, APP_PAGES, except("app")),
      // Administration : toujours sur admin.
      ...to(ADMIN, ["/admin"], except("admin")),
      // Contrôle à distance d'un poste : toujours sur remote. (La page de présentation /controle-a-distance reste sur www.)
      ...except("remote").map((h) => ({ source: "/controle-a-distance/:id([0-9a-f-]{36})", has: host(h), destination: `${REMOTE}/controle-a-distance/:id`, permanent: true })),
      // Documentation et état du service : leur propre adresse.
      ...to(DOCS, ["/docs"], except("docs")),
      ...to(STATUS, ["/statut"], except("status")),
      // Connexion, inscription, mot de passe : toujours sur auth.
      ...to(AUTH, AUTH_PAGES, except("auth")),
      { source: "/", has: host(`app.${ROOT}`), destination: "/dashboard", permanent: false },
      { source: "/", has: host(`auth.${ROOT}`), destination: "/connexion", permanent: false },
      { source: "/", has: host(`admin.${ROOT}`), destination: "/admin", permanent: false },
      { source: "/", has: host(`docs.${ROOT}`), destination: "/docs", permanent: false },
      { source: "/", has: host(`status.${ROOT}`), destination: "/statut", permanent: false },
      { source: "/", has: host(`videastes.${ROOT}`), destination: "/videastes", permanent: false },
      { source: "/", has: host(`remote.${ROOT}`), destination: `${APP}/dashboard/direct`, permanent: false },
      ],
    ];
    return [
      ...hostRoutes,
      // Menu refait (2026-10) : anciennes adresses de l'espace client → nouvelles (301).
      { source: "/dashboard/controle-a-distance", destination: "/dashboard/direct", permanent: true },
      { source: "/dashboard/relais", destination: "/dashboard/serveurs", permanent: true },
      { source: "/dashboard/relais/:id", destination: "/dashboard/serveurs/:id", permanent: true },
      { source: "/dashboard/encodeurs", destination: "/dashboard/appareils", permanent: true },
      { source: "/dashboard/backups", destination: "/dashboard/scenes", permanent: true },
      { source: "/dashboard/invitations", destination: "/dashboard/equipe", permanent: true },
      { source: "/dashboard/stats", destination: "/dashboard/statistiques", permanent: true },
      { source: "/dashboard/documentation", destination: "/dashboard/aide?onglet=documentation", permanent: true },
      { source: "/dashboard/support", destination: "/dashboard/aide", permanent: true },
      { source: "/dashboard/parametres", destination: "/dashboard/compte?onglet=preferences", permanent: true },
      { source: "/dashboard/profil", destination: "/dashboard/compte?onglet=profil", permanent: true },
      { source: "/dashboard/abonnement", destination: "/dashboard/compte?onglet=formule", permanent: true },
      { source: "/dashboard/parametres/facturation", destination: "/dashboard/compte?onglet=formule", permanent: true },
      { source: "/dashboard/parametres/usage", destination: "/dashboard/compte?onglet=formule", permanent: true },
      { source: "/dashboard/parametres/integrations", destination: "/dashboard/compte?onglet=plateformes", permanent: true },
      { source: "/compte", destination: "/dashboard/compte", permanent: true },
      { source: "/compte/profil", destination: "/dashboard/compte?onglet=profil", permanent: true },
      { source: "/compte/reseaux", destination: "/dashboard/compte?onglet=profil", permanent: true },
      { source: "/compte/supprimer", destination: "/dashboard/compte?onglet=profil", permanent: true },
      { source: "/compte/securite", destination: "/dashboard/compte?onglet=securite", permanent: true },
      { source: "/compte/comptes-relies", destination: "/dashboard/compte?onglet=plateformes", permanent: true },
      { source: "/dashboard/support/:path*", destination: "/dashboard/aide/:path*", permanent: true },
      { source: "/login", destination: "/connexion", permanent: true },
      { source: "/dashboard/encodeur", destination: "/dashboard/appareils", permanent: true },
            { source: "/signup", destination: "/inscription", permanent: true },
      { source: "/studio", destination: "/dashboard/direct", permanent: true },
      { source: "/syxtee-studio", destination: "/controle-a-distance", permanent: true },
      { source: "/dashboard/urls", destination: "/dashboard/serveurs", permanent: true },
      { source: "/docs/rist", destination: "/docs", permanent: true },
      { source: "/dashboard/apercu", destination: "/dashboard", permanent: true },
      { source: "/dashboard/dji", destination: "/dashboard", permanent: true },
      { source: "/dashboard/scanner", destination: "/dashboard", permanent: true },
      { source: "/dashboard/analyseur", destination: "/dashboard", permanent: true },
      { source: "/docs/dji", destination: "/docs", permanent: true },
      { source: "/analyseur", destination: "/", permanent: true },
      { source: "/dashboard/commutateur", destination: "/dashboard/direct", permanent: true },
      // Pages retirées : les anciens liens (signets, moteurs de recherche, e-mails) arrivent sur la page qui les remplace.
      { source: "/pro", destination: "/", permanent: true },
      // Encodeur et boutique cachés pour l'instant (temporaire : on remet en ligne en retirant ces trois lignes).
      { source: "/encodeur", destination: "/", permanent: false },
      { source: "/encodeur/:path*", destination: "/", permanent: false },
      { source: "/boutique/:path*", destination: "/", permanent: false },
      { source: "/boutique", destination: "/", permanent: false },
      { source: "/syxtee-mix", destination: "/controle-a-distance", permanent: true },
      { source: "/commutateur", destination: "/dashboard/direct", permanent: true },
      { source: "/mix", destination: "/dashboard/direct", permanent: true },
      { source: "/couverture", destination: "/", permanent: true },
      { source: "/antennes", destination: "/", permanent: true },
      { source: "/offres", destination: "/acces", permanent: true },
      { source: "/dashboard/contributions", destination: "/dashboard/statistiques", permanent: true },
      { source: "/dashboard/sante", destination: "/dashboard/serveurs", permanent: true },
      { source: "/dashboard/mire", destination: "/dashboard/serveurs", permanent: true },
      { source: "/dashboard/obs", destination: "/dashboard/direct", permanent: true },
      { source: "/dashboard/relais/:id/dji", destination: "/dashboard/serveurs", permanent: true },
    ];
  },
};

export default nextConfig;
