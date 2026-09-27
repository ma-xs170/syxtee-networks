// Menus de la barre de navigation sur /dashboard/* (même composant que la nav du site, autres entrées).

export type DashIcon = "urls" | "health" | "preview" | "control" | "stats" | "lives" | "map" | "mire" | "cam" | "security" | "profile" | "plan" | "settings";
export type DashLink = { label: string; href: string; badge?: string };
export type DashTool = DashLink & { desc: string; icon: DashIcon };
export type DashMenu = { label: string; children: DashTool[]; note?: string; dot?: boolean };
export type DashItem = DashLink | DashMenu;

const SOON = "Bientôt";

export const dashboardNav: DashItem[] = [
  { label: "Vue d'ensemble", href: "/dashboard" },
  {
    label: "Direct",
    children: [
      { label: "Mes URLs", href: "/dashboard/urls", desc: "Moblin, SRT, OBS", icon: "urls" },
      { label: "Santé du flux", href: "/dashboard/sante", desc: "Débit, RTT, pertes en temps réel", icon: "health" },
      { label: "Aperçu", href: "/dashboard/apercu", desc: "Ton flux en direct", icon: "preview" },
      { label: "Contrôle caméra", href: "/dashboard/controle", desc: "Piloter ton téléphone", icon: "control", badge: SOON },
    ],
  },
  {
    label: "Statistiques",
    children: [
      { label: "Vue globale", href: "/dashboard/stats", desc: "Tes chiffres sur 7 / 30 jours", icon: "stats" },
      { label: "Historique des lives", href: "/dashboard/lives", desc: "Chaque direct en détail", icon: "lives" },
      { label: "Carte du débit", href: "/dashboard/carte", desc: "Où ton signal a faibli", icon: "map", badge: SOON },
    ],
  },
  {
    label: "Outils",
    children: [
      { label: "Mire de coupure", href: "/dashboard/mire", desc: "L'écran affiché si tu coupes", icon: "mire" },
      { label: "SYXTEE Cam", href: "/dashboard/cam", desc: "Ton téléphone en caméra", icon: "cam" },
      { label: "Sécurité & clés", href: "/dashboard/securite", desc: "Régénérer, révoquer", icon: "security" },
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

export const isDashMenu = (item: DashItem): item is DashMenu => "children" in item;
