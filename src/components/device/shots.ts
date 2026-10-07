import type { Shot } from "./DeviceFrame";

// Vraies captures de l'interface (scripts/capture-site-screens.mjs et capture-remote-phone.mjs, données fictives). Dimensions réelles des fichiers.
export const SHOTS = {
  sante: { src: "/images/screens/sante-bureau.png", width: 1650, height: 1032, alt: "Santé du flux : quatre liens SRTLA réunis, débit reçu, latence et pertes en temps réel" },
  controleBureau: { src: "/images/remote/controle-bureau.png", width: 2160, height: 1350, alt: "Contrôle à distance sur ordinateur : aperçu du programme, scènes, sources, mixeur audio et contrôles du direct" },
  controleMobile: { src: "/images/remote/controle-mobile.png", width: 780, height: 1688, alt: "Contrôle à distance sur téléphone : aperçu du programme et scènes" },
  membres: { src: "/images/screens/membres-bureau.png", width: 1650, height: 1032, alt: "Page Membres d'un espace partagé : propriétaire, administrateur et membres avec leurs rôles, invitation en attente" },
} satisfies Record<string, Shot>;
