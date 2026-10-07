// Formules : source unique de vérité pour les droits (vérifiés côté serveur : actions, pages, API et Core).
// Copie côté Core : core/src/plans.ts (mêmes limites), qui revérifie formule, échéance et suspension à chaque connexion.

// Formules vendues (Stripe) : basic (Basique), paid (Premium, identifiant historique gardé), extra (Extra).
export type PlanId = "free" | "basic" | "beta" | "paid" | "extra" | "partner" | "admin";

/** Fonctions verrouillées en Gratuit. Scanner et Analyseur restent actifs pour tous (hors liste). */
export type Feature = "relais" | "sante" | "apercu" | "controle" | "stats" | "lives" | "carte" | "mire" | "cam" | "dji" | "cles";

export const FEATURES: Record<Feature, string> = {
  relais: "Relais et URLs",
  sante: "Santé du flux",
  apercu: "Aperçu",
  controle: "Contrôle caméra",
  stats: "Statistiques détaillées",
  lives: "Historique des lives",
  carte: "Carte du débit",
  mire: "Mire de coupure",
  cam: "SYXTEE Cam",
  dji: "Caméras externes",
  cles: "Clés de stream",
};

const ALL = Object.keys(FEATURES) as Feature[];

export type Plan = {
  id: PlanId;
  name: string;
  /** Relais actifs (non archivés) au plus. */
  maxRelays: number;
  /** Flux en direct en même temps. */
  maxConcurrentStreams: number;
  /** Relais actifs au plus par protocole (SRTLA, RTMP), en plus du total. Absent : pas de limite. */
  maxPerProtocol?: number;
  /** Invités actifs au contrôle à distance (liens d'invitation) au plus. 0 : pas d'invités. */
  maxInvites: number;
  /** Espaces partagés que ce compte peut créer au plus. 0 : pas d'espaces partagés. */
  maxWorkspaces: number;
  features: Feature[];
};

export const PLANS: Record<PlanId, Plan> = {
  free: { id: "free", name: "Gratuit", maxRelays: 0, maxConcurrentStreams: 0, maxInvites: 0, maxWorkspaces: 0, features: [] },
  beta: { id: "beta", name: "Bêta", maxRelays: 3, maxConcurrentStreams: 3, maxInvites: 3, maxWorkspaces: 3, features: ALL },
  basic: { id: "basic", name: "Basique", maxRelays: 1, maxConcurrentStreams: 1, maxInvites: 0, maxWorkspaces: 0, features: ["relais", "sante", "mire", "cles"] },
  paid: { id: "paid", name: "Premium", maxRelays: 10, maxConcurrentStreams: 3, maxPerProtocol: 5, maxInvites: 3, maxWorkspaces: 1, features: ALL },
  extra: { id: "extra", name: "Extra", maxRelays: Number.POSITIVE_INFINITY, maxConcurrentStreams: 10, maxInvites: 5, maxWorkspaces: 5, features: ALL },
  partner: { id: "partner", name: "Partenaire", maxRelays: Number.POSITIVE_INFINITY, maxConcurrentStreams: Number.POSITIVE_INFINITY, maxInvites: 3, maxWorkspaces: 3, features: ALL },
  admin: { id: "admin", name: "Admin", maxRelays: Number.POSITIVE_INFINITY, maxConcurrentStreams: Number.POSITIVE_INFINITY, maxInvites: Number.POSITIVE_INFINITY, maxWorkspaces: Number.POSITIVE_INFINITY, features: ALL },
};

/** Formules que l'admin peut attribuer (Admin vient d'ADMIN_EMAILS, Bêta des comptes d'avant les formules). */
export const ASSIGNABLE: PlanId[] = ["free", "basic", "paid", "extra", "partner", "beta"];

export type PlanRow = { plan?: string | null; plan_until?: string | null; suspended_at?: string | null };

/** Formule effective : inconnue → Gratuit ; échéance passée → Gratuit (même avant la tâche quotidienne). */
export function effectivePlan(row: PlanRow | null | undefined, now = Date.now()): Plan {
  const p = PLANS[(row?.plan ?? "") as PlanId] ?? PLANS.free;
  if (p.id !== "admin" && row?.plan_until && Date.parse(row.plan_until) <= now) return PLANS.free;
  return p;
}

/** Limite d'invités transmise au Core (qui recompte avant de créer). Illimité = très grand entier. */
export const inviteLimit = (p: Plan) => (Number.isFinite(p.maxInvites) ? p.maxInvites : 1_000_000);

export const can = (plan: Plan, feature: Feature) => plan.features.includes(feature);

/** Limite transmise au Core (qui recompte avant de créer). Illimité = très grand entier (JSON n'a pas d'Infinity). */
export const relayLimit = (p: Plan) => (Number.isFinite(p.maxRelays) ? p.maxRelays : 1_000_000);
