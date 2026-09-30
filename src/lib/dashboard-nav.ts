// Menus de la barre de navigation sur /dashboard/* (même composant que la nav du site, autres entrées).
// `feature` : entrée verrouillée (cadenas) en formule Gratuit.

import type { Feature } from "./plans";

export type DashIcon = "relays" | "urls" | "health" | "preview" | "control" | "stats" | "lives" | "map" | "mire" | "scan" | "cam" | "security" | "profile" | "plan" | "settings";
export type DashLink = { label: string; href: string; badge?: string };
/** `locked` : posé par la nav selon la formule du compte (affiche le cadenas). */
export type DashTool = DashLink & { desc: string; icon: DashIcon; feature?: Feature; locked?: boolean };
export type DashMenu = { label: string; children: DashTool[]; note?: string; dot?: boolean };
export type DashItem = DashLink | DashMenu;

const SOON = "Bientôt";

export const dashboardNav: DashItem[] = [
  { label: "Vue d'ensemble", href: "/dashboard" },
  {
    label: "Direct",
    children: [
      { label: "Mes relais", href: "/dashboard/relais", desc: "SRTLA, RTMP, tes URLs", icon: "relays", feature: "relais" },
      { label: "Santé du flux", href: "/dashboard/sante", desc: "Débit, RTT, pertes en temps réel", icon: "health", feature: "sante" },
      { label: "Aperçu", href: "/dashboard/apercu", desc: "Ton flux en direct", icon: "preview", feature: "apercu" },
      { label: "Contrôle caméra", href: "/dashboard/controle", desc: "Piloter ton téléphone", icon: "control", badge: SOON },
    ],
  },
  {
    label: "Statistiques",
    children: [
      { label: "Vue globale", href: "/dashboard/stats", desc: "Tes chiffres sur 7 / 30 jours", icon: "stats", feature: "stats" },
      { label: "Historique des lives", href: "/dashboard/lives", desc: "Chaque direct en détail", icon: "lives", feature: "lives" },
      { label: "Carte du débit", href: "/dashboard/carte", desc: "Où ton signal a faibli", icon: "map", badge: SOON },
      { label: "Où capter", href: "/couverture", desc: "La carte 4G / 5G communautaire", icon: "health" },
    ],
  },
  {
    label: "Outils",
    children: [
      { label: "Scanner réseau", href: "/dashboard/scanner", desc: "Scanne la 4G / 5G autour de toi", icon: "scan" },
      { label: "Mire de coupure", href: "/dashboard/mire", desc: "L'écran affiché si tu coupes", icon: "mire", feature: "mire" },
      { label: "SYXTEE Cam", href: "/dashboard/cam", desc: "Ton téléphone en caméra", icon: "cam", badge: SOON },
      { label: "Analyseur réseau", href: "/dashboard/analyseur", desc: "Débit, RTT et opérateur ici", icon: "health" },
      { label: "Mes contributions", href: "/dashboard/contributions", desc: "Tes mesures sur la carte 4G / 5G", icon: "map" },
      { label: "Sécurité & clés", href: "/dashboard/securite", desc: "Mode stream, clés", icon: "security", feature: "cles" },
    ],
  },
  {
    label: "Compte",
    children: [
      { label: "Profil & réseaux", href: "/dashboard/profil", desc: "Twitch, TikTok…", icon: "profile" },
      { label: "Abonnement", href: "/dashboard/abonnement", desc: "Ta formule", icon: "plan" },
      { label: "Paramètres", href: "/dashboard/parametres", desc: "Session, mode stream, compte", icon: "settings" },
    ],
  },
];

/** Entrées verrouillées (cadenas) pour la formule donnée. */
export function withLocks(items: DashItem[], features: readonly Feature[]): DashItem[] {
  return items.map((i) => (isDashMenu(i) ? { ...i, children: i.children.map((t) => ({ ...t, locked: !!t.feature && !features.includes(t.feature) })) } : i));
}

export const isDashMenu = (item: DashItem): item is DashMenu => "children" in item;
