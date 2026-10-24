// Journal public des incidents et maintenances, affiché sur /statut. Pour ajouter une entrée : ajouter un objet EN TÊTE de la liste,
// puis commit + push. `updates` est du plus récent au plus ancien. Dates en heure de Paris (ISO avec décalage).

export type IncidentStatus = "resolved" | "monitoring" | "investigating" | "scheduled";
export type Incident = {
  id: string;
  title: string;
  kind: "incident" | "maintenance";
  status: IncidentStatus;
  /** Services touchés (ids de /lib/status.ts : site, core, relay, db). */
  services: string[];
  start: string;
  end?: string;
  updates: { at: string; text: string }[];
};

export const incidents: Incident[] = [
  {
    id: "2026-10-24-site",
    title: "Site et espace client inaccessibles",
    kind: "incident",
    status: "resolved",
    services: ["site", "core"],
    start: "2026-10-24T18:41:00+02:00",
    end: "2026-10-24T18:55:00+02:00",
    updates: [
      { at: "2026-10-24T18:55:00+02:00", text: "Configuration corrigée, le site et l'espace client répondent de nouveau. Les flux déjà en cours n'ont pas été touchés." },
      { at: "2026-10-24T18:41:00+02:00", text: "Après l'ajout des adresses admin, remote, docs et status, le serveur web frontal refusait de démarrer à cause d'une erreur dans la liste des adresses du site. Le site, le dashboard et le contrôle à distance étaient inaccessibles." },
    ],
  },
  {
    id: "2026-10-06-core",
    title: "API Core indisponible",
    kind: "incident",
    status: "resolved",
    services: ["core"],
    start: "2026-10-06T12:00:00+02:00",
    end: "2026-10-06T13:00:00+02:00",
    updates: [
      { at: "2026-10-06T13:00:00+02:00", text: "Correctif déployé, le Core répond de nouveau. Dashboard, contrôle à distance et enregistrements sont rétablis." },
      { at: "2026-10-06T12:00:00+02:00", text: "L'API Core ne répondait plus après une mise à jour : le tableau de bord et le contrôle à distance étaient inaccessibles. Les flux déjà en cours n'ont pas été touchés." },
    ],
  },
  {
    id: "2026-10-02-vps",
    title: "Migration des serveurs vers Beauharnois (OVH)",
    kind: "maintenance",
    status: "resolved",
    services: ["core", "relay"],
    start: "2026-10-02T00:00:00+02:00",
    end: "2026-10-02T23:59:00+02:00",
    updates: [
      { at: "2026-10-02T23:59:00+02:00", text: "Migration terminée. Les relais tournent sur le nouveau serveur." },
      { at: "2026-10-02T00:00:00+02:00", text: "Déplacement des relais et du Core vers un nouveau serveur à Beauharnois (Canada). De courtes coupures sont possibles pendant l'opération." },
    ],
  },
];
