// Configuration centrale du site — modifie ici les liens, textes clés et relais.
export const site = {
  name: "SYXTEE NETWORKS",
  url: "https://syxtee-networks.vercel.app", // ← remplace par ton domaine final
  description:
    "Relais SRTLA et RTMP pour streamer en IRL : bonding 4G, 5G, Wi-Fi et Starlink, santé du flux. Aux Antilles et partout.",
  discord: "https://discord.gg/CD68F8yZuZ",
  year: new Date().getFullYear(),
};

export type ToolIcon = "bag" | "rack" | "phone" | "dish" | "esim" | "route" | "services" | "docs" | "faq" | "tower" | "studio" | "map";
export type NavLink = { label: string; href: string; badge?: string };
/** `soon` : produit pas encore sorti, affiché grisé dans les menus (le lien reste cliquable). */
export type NavTool = NavLink & { desc: string; icon: ToolIcon; soon?: boolean; /** Produit SYXTEE : affiché « (S) SYXTEE <fonction> » avec le logo. */ wordmark?: string; /** Sous-section du menu (titre de colonne). */ group?: string };
/** Menu déroulant : `dot` = point rouge de nouveauté à côté du libellé, `note` = ligne en pied de panneau. */
export type NavMenu = { label: string; children: NavTool[]; dot?: boolean; note?: string };
export type NavItem = NavLink | NavMenu;

export const nav: NavItem[] = [
  {
    label: "Produits",
    children: [
      { label: "Relais SYXTEE", href: "/relais", desc: "Nos serveurs SRTLA et RTMP", icon: "rack", wordmark: "RELAIS" },
      { label: "SYXTEE STUDIO", href: "/syxtee-studio", desc: "Ta régie dans le navigateur", icon: "studio", badge: "Nouveau", wordmark: "STUDIO" },
      { label: "SYXTEE PRO", href: "/pro", desc: "Le sac encodeur IRL", icon: "bag", badge: "À venir", soon: true, wordmark: "PRO" },
    ],
  },
  {
    label: "Outils",
    note: "Tous nos outils fonctionnent avec le relais SYXTEE",
    children: [
      { label: "Moblin", href: "/moblin", desc: "L'app IRL qu'on recommande", icon: "phone", group: "Streamer" },
      { label: "Saily", href: "/saily", desc: "Une 4G de plus en eSIM", icon: "esim", badge: "Partenaire", group: "Streamer" },
      { label: "Starlink", href: "/starlink", desc: "Le live là où la 4G abandonne", icon: "dish", group: "Réseau" },
      { label: "Analyseur réseau", href: "/analyseur", desc: "Teste ta 4G / 5G là où tu es", icon: "tower", group: "Réseau" },
    ],
  },
  {
    label: "Ressources",
    children: [
      { label: "Fonctionnement", href: "/fonctionnement", desc: "Le trajet d'un live de A à Z", icon: "route", group: "Comprendre" },
      { label: "Services", href: "/services", desc: "Tout ce que fait le relais", icon: "services", group: "Comprendre" },
      { label: "Où capter", href: "/couverture", desc: "La carte du réseau 4G / 5G", icon: "map", group: "Comprendre" },
      { label: "Documentation", href: "/docs", desc: "Les guides pour bien démarrer", icon: "docs", group: "Aide" },
      { label: "FAQ", href: "/faq", desc: "Les questions qu'on nous pose", icon: "faq", group: "Aide" },
    ],
  },
  { label: "Offres", href: "/offres" },
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

export const compat = ["Moblin", "IRL Pro", "BELABOX", "OBS Studio", "Twitch", "Kick", "YouTube", "TikTok Live"];

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
