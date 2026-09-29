// Droits par formule, vérifiés par le Core à chaque connexion au relais (copie de src/lib/plans.ts du dashboard :
// les deux tables doivent rester identiques). La formule vient de profiles.plan (migration 0010).

export type PlanId = "free" | "beta" | "paid" | "partner" | "admin";

export const PLAN_LIMITS: Record<PlanId, { maxRelays: number; maxConcurrentStreams: number }> = {
  free: { maxRelays: 0, maxConcurrentStreams: 0 },
  beta: { maxRelays: 3, maxConcurrentStreams: 3 },
  paid: { maxRelays: 3, maxConcurrentStreams: 3 },
  partner: { maxRelays: Number.POSITIVE_INFINITY, maxConcurrentStreams: Number.POSITIVE_INFINITY },
  admin: { maxRelays: Number.POSITIVE_INFINITY, maxConcurrentStreams: Number.POSITIVE_INFINITY },
};

/** Formule inconnue ou absente : aucun droit (refus par défaut). */
export const limitsOf = (plan: string | null | undefined) => PLAN_LIMITS[(plan ?? "") as PlanId] ?? PLAN_LIMITS.free;

export type Account = { plan: string | null; suspended: boolean };

/**
 * Relais d'un compte autorisés à diffuser : compte actif, formule payante ou bêta, relais non archivé,
 * et dans la limite de relais de la formule (les plus anciens d'abord).
 */
export function allowedRelayIds<R extends { id: string; archived: boolean; created_at: string }>(account: Account | null, relays: R[]): Set<string> {
  if (!account || account.suspended) return new Set();
  const { maxRelays } = limitsOf(account.plan);
  const active = relays.filter((r) => !r.archived).sort((a, b) => a.created_at.localeCompare(b.created_at));
  return new Set(active.slice(0, Number.isFinite(maxRelays) ? maxRelays : active.length).map((r) => r.id));
}

/**
 * Un publieur vient d'être accepté par le SLS : a-t-il le droit de diffuser ? null = oui, sinon la raison.
 * `liveOthers` = autres relais du compte déjà en direct (flux simultanés).
 */
export function publisherVerdict<R extends { id: string; archived: boolean; created_at: string }>(
  account: Account | null,
  relays: R[],
  relayId: string,
  liveOthers: number,
): "account" | "suspended" | "plan" | "quota" | "streams" | null {
  if (!account) return "account";
  if (account.suspended) return "suspended";
  const limits = limitsOf(account.plan);
  if (!allowedRelayIds(account, relays).has(relayId)) return limits.maxRelays <= 0 ? "plan" : "quota";
  if (liveOthers + 1 > limits.maxConcurrentStreams) return "streams";
  return null;
}
