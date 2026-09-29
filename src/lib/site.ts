// Configuration centrale du site — modifie ici les liens, textes clés et relais.
export const site = {
  name: "SYXTEE NETWORKS",
  url: "https://syxtee-networks.vercel.app", // ← remplace par ton domaine final
  description:
    "Relais IRL SRTLA low-cost : streame en extérieur avec ton téléphone, connexions 4G/5G combinées, compatible Moblin, IRL Pro et OBS.",
  discord: "https://discord.gg/CD68F8yZuZ",
  year: new Date().getFullYear(),
};

export type ToolIcon = "bag" | "rack" | "phone" | "dish" | "esim" | "route" | "services" | "docs" | "faq" | "tower";
export type NavLink = { label: string; href: string; badge?: string };
export type NavTool = NavLink & { desc: string; icon: ToolIcon };
/** Menu déroulant : `dot` = point rouge de nouveauté à côté du libellé, `note` = ligne en pied de panneau. */
export type NavMenu = { label: string; children: NavTool[]; dot?: boolean; note?: string };
export type NavItem = NavLink | NavMenu;

export const nav: NavItem[] = [
  {
    label: "Produits",
    dot: true,
    children: [
      { label: "SYXTEE PRO", href: "/pro", desc: "Le sac encodeur IRL", icon: "bag", badge: "Nouveau" },
      { label: "Relais SYXTEE", href: "/relais", desc: "Nos serveurs SRTLA", icon: "rack" },
    ],
  },
  {
    label: "Outils",
    note: "Tous nos outils fonctionnent avec le relais SYXTEE",
    children: [
      { label: "Moblin", href: "/moblin", desc: "L'app IRL qu'on recommande", icon: "phone" },
      { label: "Starlink", href: "/starlink", desc: "Le live là où la 4G abandonne", icon: "dish" },
      { label: "Saily", href: "/saily", desc: "Une 4G de plus en eSIM", icon: "esim", badge: "Partenaire" },
      { label: "Analyseur réseau", href: "/analyseur", desc: "Teste ta 4G / 5G là où tu es", icon: "tower" },
    ],
  },
  {
    label: "Ressources",
    children: [
      { label: "Fonctionnement", href: "/fonctionnement", desc: "Le trajet d'un live de A à Z", icon: "route" },
      { label: "Services", href: "/services", desc: "Tout ce que fait le relais", icon: "services" },
      { label: "Documentation", href: "/docs", desc: "Les guides pour bien démarrer", icon: "docs" },
      { label: "Où capter", href: "/couverture", desc: "La carte du réseau 4G / 5G", icon: "tower" },
      { label: "FAQ", href: "/faq", desc: "Les questions qu'on nous pose", icon: "faq" },
    ],
  },
  { label: "Offres", href: "/offres" },
];

export const isMenu = (item: NavItem): item is NavMenu => "children" in item;

// SYXTEE PRO : sac encodeur IRL (en développement). Prix affichés sur l'accueil et /pro.
export const pro = {
  launchPrice: "999 €",
  publicPrice: "1 290 €",
};

/** Toutes les pages du menu, à plat (sitemap…). */
export const navLinks: NavLink[] = nav.flatMap((item) => (isMenu(item) ? item.children : [item]));

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
