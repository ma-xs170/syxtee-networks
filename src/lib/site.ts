// Configuration centrale du site — modifie ici les liens, textes clés et relais.
export const site = {
  name: "SYXTEE NETWORKS",
  url: "https://syxtee-networks.vercel.app", // ← remplace par ton domaine final
  description:
    "Streaming en direct : bonding 4G, 5G et satellite, santé du flux. Des serveurs dans le monde entier.",
  discord: "https://discord.gg/CD68F8yZuZ",
  year: new Date().getFullYear(),
};

import type { GlassName } from "@/components/ui/GlassIconView";

export type ToolIcon = "rack" | "phone" | "dish" | "esim" | "route" | "services" | "docs" | "faq" | "tower" | "studio" | "map";
export type NavLink = { label: string; href: string; badge?: string; /** Flèche ↗ à droite : page à part (documentation). */ arrow?: boolean };
/** `soon` : produit pas encore sorti, affiché grisé dans les menus (le lien reste cliquable). */
export type NavTool = NavLink & { desc: string; icon: ToolIcon; /** Miniature verre 3D (menus de la navigation). */ glass?: GlassName; soon?: boolean; /** Produit SYXTEE : affiché « (S) SYXTEE <fonction> » avec le logo. */ wordmark?: string; /** Sous-section du menu (titre de colonne). */ group?: string };
/** Menu déroulant : `dot` = point rouge de nouveauté à côté du libellé, `note` = ligne en pied de panneau. */
export type NavMenu = { label: string; children: NavTool[]; dot?: boolean; note?: string };
export type NavItem = NavLink | NavMenu;

// Menu du site : les quatre arguments de l'accueil. « Demander l'accès » est le bouton d'action à droite (Nav.tsx), pas une entrée du menu.
// L'encodeur et la documentation vivent dans le pied de page.
export const nav: NavItem[] = [
  {
    label: "Contrôle à distance",
    children: [
      { label: "OBS CLOUD", href: "/controle-a-distance", desc: "Pilote ton OBS depuis ton téléphone ou ton navigateur.", icon: "docs", glass: "obs-cloud" },
      { label: "Espaces partagés", href: "/espaces-partages", desc: "Invite ton équipe à piloter avec toi.", icon: "services", glass: "shared" },
      { label: "Pairing d'appareil", href: "/controle-a-distance#pairing", desc: "Relie ton PC ou ton Mac avec un code.", icon: "route", glass: "docs" },
    ],
  },
  {
    label: "Relais",
    children: [
      { label: "Serveur relais", href: "/relais", desc: "Un relais au Canada qui garde ton flux stable.", icon: "rack", glass: "relay" },
      { label: "Bonding", href: "/fonctionnement", desc: "Plusieurs connexions réunies en un seul flux.", icon: "route", glass: "health" },
      { label: "Où capter", href: "/couverture", desc: "La carte de couverture 4G et 5G.", icon: "map", glass: "map", badge: "BIENTÔT", soon: true },
    ],
  },
  {
    label: "Encodeur",
    children: [{ label: "SYXTEE Encodeur", href: "/encodeur", desc: "Le futur boîtier qui encode et envoie ton direct.", icon: "studio", glass: "encoder", badge: "EN DÉVELOPPEMENT", soon: true }],
  },
  { label: "Tarifs", href: "/tarifs" },
  {
    label: "Docs",
    children: [
      { label: "Démarrage rapide", href: "/docs#demarrage", desc: "Ton premier direct en quelques minutes.", icon: "docs", glass: "docs" },
      { label: "Documentation", href: "/docs", desc: "Relais, OBS CLOUD, espaces partagés.", icon: "docs", glass: "docs" },
      { label: "FAQ", href: "/faq", desc: "Les questions fréquentes.", icon: "faq", glass: "community" },
    ],
  },
  {
    label: "Communauté",
    children: [{ label: "Discord", href: "https://discord.gg/CD68F8yZuZ", desc: "Support et échanges avec la communauté.", icon: "faq", glass: "community", arrow: true }],
  },
];

export const isMenu = (item: NavItem): item is NavMenu => "children" in item;

// SYXTEE PRO : sac encodeur IRL (en pause, FEATURE_PRO). Prix gardés pour la fiche produit, non affichés tant que le produit est « À venir ».
export const pro = {
  launchPrice: "999 €",
  publicPrice: "1 290 €",
};

/** Toutes les pages du menu, à plat (sitemap…). */
export const navLinks: NavLink[] = nav.flatMap((item) => (isMenu(item) ? item.children : [item]));

export type Relay = {
  city: string;
  region: string;
  status: "online" | "soon" | "maintenance";
  protocols: string[];
};

export const relays: Relay[] = [
  { city: "Beauharnois", region: "Canada · Québec", status: "online", protocols: ["SRTLA", "SRT", "RTMP"] },
  { city: "New York", region: "USA · Côte Est", status: "maintenance", protocols: ["SRTLA", "SRT"] },
];

export const compat = ["Twitch", "Kick", "YouTube"];

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
