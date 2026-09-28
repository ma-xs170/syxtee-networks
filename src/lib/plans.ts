// Formules : source unique de vérité pour les droits (quotas vérifiés côté serveur, dans les actions et le Core).
// Le champ users.plan et l'attribution par l'admin arrivent avec les formules Gratuit / Payant / Partenaire.
// En attendant, tous les comptes sont en bêta.

export type PlanId = "free" | "beta" | "paid" | "admin";

export type Plan = {
  id: PlanId;
  name: string;
  /** Relais actifs (non archivés) au plus. */
  maxRelays: number;
  /** Flux en direct en même temps. */
  maxConcurrentStreams: number;
};

export const PLANS: Record<PlanId, Plan> = {
  free: { id: "free", name: "Gratuit", maxRelays: 0, maxConcurrentStreams: 0 },
  beta: { id: "beta", name: "Bêta gratuite", maxRelays: 3, maxConcurrentStreams: 3 },
  paid: { id: "paid", name: "SYXTEE Relais", maxRelays: 3, maxConcurrentStreams: 3 },
  admin: { id: "admin", name: "Admin", maxRelays: Number.POSITIVE_INFINITY, maxConcurrentStreams: Number.POSITIVE_INFINITY },
};

/** Formule d'un compte. Tous en bêta tant que les formules ne sont pas en place. */
// eslint-disable-next-line @typescript-eslint/no-unused-vars -- la formule dépendra du compte (users.plan)
export function planOf(userId: string): Plan {
  return PLANS.beta;
}

/** Limite transmise au Core (qui recompte avant de créer). Illimité = très grand entier (JSON n'a pas d'Infinity). */
export const relayLimit = (p: Plan) => (Number.isFinite(p.maxRelays) ? p.maxRelays : 1_000_000);
