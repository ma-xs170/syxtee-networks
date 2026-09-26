// Configuration centrale du site — modifie ici les liens, textes clés et relais.
export const site = {
  name: "SYXTEE NETWORKS",
  url: "https://syxtee-networks.vercel.app", // ← remplace par ton domaine final
  description:
    "Relais IRL SRTLA low-cost : streame en extérieur avec ton téléphone, connexions 4G/5G combinées, compatible Moblin, IRL Pro et OBS.",
  discord: "https://discord.gg/CD68F8yZuZ",
  year: new Date().getFullYear(),
};

export type ToolIcon = "phone" | "dish" | "esim";
export type NavLink = { label: string; href: string };
export type NavTool = NavLink & { desc: string; icon: ToolIcon; badge?: string };
export type NavItem = NavLink | { label: string; children: NavTool[] };

export const nav: NavItem[] = [
  { label: "Services", href: "/services" },
  { label: "Fonctionnement", href: "/fonctionnement" },
  {
    label: "Outils",
    children: [
      { label: "Moblin", href: "/moblin", desc: "L'app IRL qu'on recommande", icon: "phone" },
      { label: "Starlink", href: "/starlink", desc: "Le live là où la 4G abandonne", icon: "dish" },
      { label: "Saily", href: "/saily", desc: "Une 4G de plus en eSIM", icon: "esim", badge: "Partenaire" },
    ],
  },
  { label: "Relais", href: "/relais" },
  { label: "Offres", href: "/offres" },
  { label: "FAQ", href: "/faq" },
];

/** Toutes les pages du menu, à plat (sitemap…). */
export const navLinks: NavLink[] = nav.flatMap((item) => ("children" in item ? item.children : [item]));

export type Relay = {
  city: string;
  region: string;
  status: "online" | "soon";
  protocols: string[];
};

export const relays: Relay[] = [
  { city: "New York", region: "USA · Côte Est", status: "online", protocols: ["SRTLA", "SRT"] },
];

export const compat = ["Moblin", "IRL Pro", "BELABOX", "OBS Studio", "Twitch", "Kick", "YouTube", "TikTok Live"];

export type Streamer = {
  handle: string;
  platform: "twitch" | "kick" | "youtube" | "tiktok";
  url: string;
  avatar?: string; // ex. "/streamers/imsyxtee.jpg" (fichier dans public/streamers/)
};

// Uniquement de vrais utilisateurs qui ont donné leur accord.
export const streamers: Streamer[] = [
  { handle: "imsyxtee", platform: "twitch", url: "https://twitch.tv/imsyxtee" },
];

// Partenaires. Tous les liens partenaires passent par ici (rel="sponsored noopener", nouvel onglet).
// `code` est optionnel : il ne s'affiche que s'il est rempli (et plus un placeholder <…>).
export const partners = {
  saily: {
    name: "Saily",
    url: "<LIEN_AFFILIÉ_SAILY>", // ← remplace par ton lien partenaire
    code: "SYXTEE26",
    logo: "/images/partners/saily/saily-logo-white.svg", // kit officiel partenaire
    devicesUrl: "https://saily.com/esim-supported-devices/",
  },
};

/** Vrai si la valeur est remplie (pas vide, pas un placeholder <…>). */
export const isFilled = (v: string) => v.trim() !== "" && !/^<.*>$/.test(v.trim());
