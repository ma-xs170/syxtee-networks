// Menus de la barre de navigation sur /dashboard/* (même composant que la nav du site, autres entrées).
// `feature` : entrée verrouillée (cadenas) en formule Gratuit.

import type { Feature } from "./plans";

export type DashIcon = "relays" | "urls" | "health" | "preview" | "control" | "stats" | "lives" | "map" | "mire" | "scan" | "cam" | "security" | "profile" | "plan" | "settings";
export type DashLink = { label: string; href: string; badge?: string };
/** `locked` : posé par la nav selon la formule du compte (affiche le cadenas). */
export type DashTool = DashLink & { desc: string; icon: DashIcon; feature?: Feature; locked?: boolean };
export type DashMenu = { label: string; children: DashTool[]; note?: string; dot?: boolean };
export type DashItem = DashLink | DashMenu;

// 4 entrées : un seul menu déroulant (Direct). Statistiques et Scanner regroupent leurs pages en onglets (SectionTabs).
// Le compte (profil, formule, paramètres, admin, aide) vit dans le panneau de l'avatar, à droite.
export const dashboardNav: DashItem[] = [
  { label: "Vue d'ensemble", href: "/dashboard" },
  {
    label: "Direct",
    children: [
      { label: "Mes relais", href: "/dashboard/relais", desc: "SRTLA, RTMP, tes URLs et clés", icon: "relays", feature: "relais" },
      { label: "Santé du flux", href: "/dashboard/sante", desc: "Débit, RTT, pertes en temps réel", icon: "health", feature: "sante" },
      { label: "Aperçu", href: "/dashboard/apercu", desc: "Ton flux en direct", icon: "preview", feature: "apercu" },
      { label: "Caméras DJI", href: "/dashboard/dji", desc: "Osmo en Bluetooth vers ton relais", icon: "cam", feature: "dji" },
    ],
  },
  { label: "Statistiques", href: "/dashboard/stats" },
  { label: "Scanner", href: "/dashboard/scanner" },
];

export type SectionTab = { label: string; href: string };

/** Onglets de la section Statistiques. */
export const statsTabs: SectionTab[] = [
  { label: "Vue globale", href: "/dashboard/stats" },
  { label: "Lives", href: "/dashboard/lives" },
  { label: "Couverture", href: "/dashboard/contributions" },
];

/** Onglets de la section Scanner. */
export const scanTabs: SectionTab[] = [
  { label: "Scan de zone", href: "/dashboard/scanner" },
  { label: "Test ponctuel", href: "/dashboard/analyseur" },
];

/** Un lien de la barre reste actif sur toutes les pages de sa section. */
export const activeAlso: Record<string, string[]> = {
  "/dashboard/stats": statsTabs.map((t) => t.href),
  "/dashboard/scanner": scanTabs.map((t) => t.href),
};

/** Entrées verrouillées (cadenas) pour la formule donnée. */
export function withLocks(items: DashItem[], features: readonly Feature[]): DashItem[] {
  return items.map((i) => (isDashMenu(i) ? { ...i, children: i.children.map((t) => ({ ...t, locked: !!t.feature && !features.includes(t.feature) })) } : i));
}

export const isDashMenu = (item: DashItem): item is DashMenu => "children" in item;
