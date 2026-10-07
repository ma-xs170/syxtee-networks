// Équipe SYXTEE : rôles, permissions et couleurs. Pur (aucun accès base) : utilisable côté client comme côté serveur.
// Le propriétaire a toutes les permissions et gère l'équipe ; les autres rôles reçoivent un préréglage que le propriétaire
// peut modifier permission par permission (stockées sur le membre, voir 0047_staff.sql).

export const PERMISSIONS = {
  support: { label: "Support", text: "Répondre aux demandes des clients" },
  accounts: { label: "Comptes clients", text: "Voir et modifier les comptes" },
  access: { label: "Demandes d'accès", text: "Approuver ou refuser les demandes" },
  partners: { label: "Partenaires", text: "Attribuer des formules" },
  notifications: { label: "Notifications", text: "Envoyer des notifications aux clients" },
  discord: { label: "Discord", text: "Gérer le bot et les annonces" },
  versions: { label: "Versions", text: "Publier les versions du plugin" },
  relays: { label: "Relais et carte", text: "Voir les relais, les serveurs et la carte" },
  revenue: { label: "Revenus", text: "Voir les revenus et abonnements" },
  security: { label: "Alertes de sécurité", text: "Voir et traiter les alertes" },
  journal: { label: "Journal", text: "Lire le journal des actions" },
} as const;
export type Permission = keyof typeof PERMISSIONS;
export const PERMISSION_KEYS = Object.keys(PERMISSIONS) as Permission[];
export const isPermission = (v: unknown): v is Permission => typeof v === "string" && v in PERMISSIONS;

export const ROLES = ["admin", "developer", "debugger", "security", "support"] as const;
export type StaffRole = (typeof ROLES)[number];
export type AnyRole = StaffRole | "owner";
export const isRole = (v: unknown): v is StaffRole => typeof v === "string" && (ROLES as readonly string[]).includes(v);

type RoleMeta = { label: string; short: string; text: string; color: string; presets: readonly Permission[] };

/** `color` : teinte du rôle (pastille, bordure, texte de l'étiquette). Contrastes vérifiés sur fond sombre et clair. */
export const ROLE_META: Record<AnyRole, RoleMeta> = {
  owner: { label: "Propriétaire", short: "PROPRIÉTAIRE", text: "Contrôle total, gère l'équipe.", color: "#e5a50a", presets: PERMISSION_KEYS },
  admin: { label: "Administrateur", short: "ADMIN", text: "Accès complet à l'espace admin.", color: "#ef4444", presets: PERMISSION_KEYS },
  developer: {
    label: "Développeur",
    short: "DÉV",
    text: "Gros accès technique : relais, versions, comptes, sécurité.",
    color: "#3b82f6",
    presets: ["support", "accounts", "notifications", "discord", "versions", "relays", "security", "journal"],
  },
  debugger: { label: "Debugger", short: "DEBUG", text: "Cherche et reproduit les bugs : relais, versions, journal.", color: "#f97316", presets: ["support", "versions", "relays", "journal"] },
  security: { label: "Cybersécurité", short: "SÉCU", text: "Trouve les failles : alertes, journal, comptes.", color: "#10b981", presets: ["security", "journal", "accounts", "access"] },
  support: { label: "Support", short: "SUPPORT", text: "S'occupe uniquement du chat avec les clients.", color: "#06b6d4", presets: ["support"] },
};

/** Style en ligne d'une étiquette de rôle (la même couleur partout : liste, fiche, fil du support). */
export function roleStyle(role: AnyRole) {
  const c = ROLE_META[role].color;
  return { color: c, borderColor: `color-mix(in srgb, ${c} 55%, transparent)`, backgroundColor: `color-mix(in srgb, ${c} 14%, transparent)` };
}

/** Texte de signature d'un agent : « Mathis - Équipe Support ». */
export function signatureOf(firstName: string | null | undefined, role: AnyRole) {
  const name = (firstName ?? "").trim() || "L'équipe";
  const team = role === "support" ? "Équipe Support" : role === "owner" || role === "admin" ? "Équipe SYXTEE" : `Équipe ${ROLE_META[role].label}`;
  return `${name} - ${team}`;
}

/** Normalise une liste de permissions reçue d'un formulaire : valeurs connues seulement, sans doublon. */
export function cleanPermissions(raw: unknown): Permission[] {
  const list = Array.isArray(raw) ? raw : [];
  return [...new Set(list.filter(isPermission))];
}

/** Présence d'un membre : en ligne (battement < 2 min), absent (< 30 min), hors ligne. Couleur et libellé pour la pastille. */
export type Presence = { state: "online" | "away" | "offline"; label: string; color: string };
export function staffPresence(lastSeen: string | null | undefined, now = Date.now()): Presence {
  if (!lastSeen) return { state: "offline", label: "Jamais connecté", color: "#71717a" };
  const min = Math.floor((now - Date.parse(lastSeen)) / 60_000);
  if (min < 2) return { state: "online", label: "En ligne", color: "#22c55e" };
  const ago = min < 60 ? `${Math.max(1, min)} min` : min < 1440 ? `${Math.round(min / 60)} h` : `${Math.round(min / 1440)} j`;
  if (min < 30) return { state: "away", label: `Absent depuis ${ago}`, color: "#f59e0b" };
  return { state: "offline", label: `Hors ligne depuis ${ago}`, color: "#71717a" };
}

/** Première page de l'espace admin que ces permissions ouvrent (un membre sans accès complet n'a pas de « Vue d'ensemble »). */
const LANDING: [Permission, string][] = [
  ["support", "/admin/support"],
  ["accounts", "/admin/comptes"],
  ["access", "/admin/acces"],
  ["security", "/admin/securite"],
  ["relays", "/admin/relais"],
  ["versions", "/admin/versions"],
  ["journal", "/admin/journal"],
  ["notifications", "/admin/notifications"],
  ["discord", "/admin/discord"],
  ["partners", "/admin/partenaires"],
  ["revenue", "/admin/revenus"],
];
export function firstAllowedHref(perms: ReadonlySet<Permission>) {
  return LANDING.find(([p]) => perms.has(p))?.[1] ?? "/admin/equipe";
}
