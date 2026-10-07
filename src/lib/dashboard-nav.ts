// Menus de la barre de navigation sur /dashboard/* (même composant que la nav du site, autres entrées).
// `feature` : entrée verrouillée (cadenas) en formule Gratuit.

import type { Feature } from "./plans";

export type DashIcon = "relays" | "urls" | "health" | "preview" | "control" | "stats" | "lives" | "map" | "mire" | "scan" | "cam" | "security" | "profile" | "plan" | "settings";
export type DashLink = { label: string; href: string; badge?: string };
/** `locked` : posé par la nav selon la formule du compte (affiche le cadenas). */
export type DashTool = DashLink & { desc: string; icon: DashIcon; feature?: Feature; locked?: boolean; group?: string; wordmark?: string };
export type DashMenu = { label: string; children: DashTool[]; note?: string; dot?: boolean };
export type DashItem = DashLink | DashMenu;

// 4 entrées : un seul menu déroulant (Direct). Statistiques et Scanner regroupent leurs pages en onglets (SectionTabs).
// Le compte (profil, formule, paramètres, admin, aide) vit dans le panneau de l'avatar, à droite.
export const dashboardNav: DashItem[] = [
  { label: "Vue d'ensemble", href: "/dashboard" },
  {
    label: "Direct",
    children: [
      { label: "Flux", href: "/dashboard/relais", desc: "SRTLA, RTMP, RIST, tes adresses et clés", icon: "relays", feature: "relais" },
      { label: "Contrôle à distance", href: "/dashboard/controle-a-distance", desc: "Pilote ton OBS depuis un onglet", icon: "control", feature: "relais" },
    ],
  },
  {
    label: "Contenu",
    children: [{ label: "Sauvegardes de scènes", href: "/dashboard/backups", desc: "Tes collections de scènes sauvegardées", icon: "plan", feature: "relais" }],
  },
  { label: "Statistiques", href: "/dashboard/stats" },
];

export type SectionTab = { label: string; href: string };

/** Onglets de la section Statistiques. */
export const statsTabs: SectionTab[] = [
  { label: "Vue globale", href: "/dashboard/stats" },
  { label: "Lives", href: "/dashboard/lives" },
  { label: "Couverture", href: "/dashboard/contributions" },
];

/** Un lien de la barre reste actif sur toutes les pages de sa section. */
export const activeAlso: Record<string, string[]> = {
  "/dashboard/stats": statsTabs.map((t) => t.href),
};

/** Entrées verrouillées (cadenas) pour la formule donnée. */
export function withLocks(items: DashItem[], features: readonly Feature[]): DashItem[] {
  return items.map((i) => (isDashMenu(i) ? { ...i, children: i.children.map((t) => ({ ...t, locked: !!t.feature && !features.includes(t.feature) })) } : i));
}

export const isDashMenu = (item: DashItem): item is DashMenu => "children" in item;
