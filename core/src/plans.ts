// Droits par formule, vérifiés par le Core à chaque connexion au relais (copie de src/lib/plans.ts du dashboard :
// les deux tables doivent rester identiques). La formule vient de profiles.plan (migration 0010).

// Formules vendues (Stripe) : basic (Basique), paid (Premium), extra (Extra).
export type PlanId = "free" | "basic" | "beta" | "paid" | "extra" | "partner" | "admin";

/** `maxPerProtocol` : relais actifs au plus par protocole (SRTLA, RTMP, RIST), en plus du total. Absent = pas de limite. */
export type Limits = { maxRelays: number; maxConcurrentStreams: number; maxPerProtocol?: number };

/** Régie automatique du contrôle à distance : prises (drone et autres sources) et caméras de la régie IA. Le secours et la garde audio sont pour toutes les formules payantes. */
export type RegieRights = { prises: boolean; cams: number };
export const REGIE_RIGHTS: Record<PlanId, RegieRights> = {
  free: { prises: false, cams: 0 },
  basic: { prises: false, cams: 0 },
  beta: { prises: true, cams: 3 },
  paid: { prises: true, cams: 3 },
  extra: { prises: true, cams: 6 },
  partner: { prises: true, cams: 6 },
  admin: { prises: true, cams: 6 },
};
export const regieOf = (plan: string | null | undefined): RegieRights => REGIE_RIGHTS[(plan ?? "") as PlanId] ?? REGIE_RIGHTS.free;

/**
 * Réglages de régie envoyés par un navigateur (link.setBackup) : ce que la formule ne couvre pas est retiré avant d'arriver à l'agent.
 * Sans « prises » : ni auto-gérance du drone ni prises supplémentaires. Les caméras de la régie IA sont limitées, et elle s'éteint sans caméra permise.
 */
export function gateRegie(plan: string | null | undefined, params: unknown): Record<string, unknown> {
  const p = { ...((params && typeof params === "object" ? params : {}) as Record<string, unknown>) };
  const r = regieOf(plan);
  if (!r.prises) {
    if ("autoEnabled" in p) p.autoEnabled = false;
    delete p.autoRules;
  }
  if (r.cams === 0) {
    if ("directorEnabled" in p) p.directorEnabled = false;
    delete p.directorCams;
    delete p.directorKey;
    delete p.directorRules;
  } else if (Array.isArray(p.directorCams)) {
    p.directorCams = p.directorCams.slice(0, r.cams);
  }
  return p;
}

export const PLAN_LIMITS: Record<PlanId, Limits> = {
  free: { maxRelays: 0, maxConcurrentStreams: 0 },
  basic: { maxRelays: 1, maxConcurrentStreams: 1 },
  beta: { maxRelays: 3, maxConcurrentStreams: 3 },
  paid: { maxRelays: 10, maxConcurrentStreams: 3, maxPerProtocol: 5 },
  extra: { maxRelays: Number.POSITIVE_INFINITY, maxConcurrentStreams: 10 },
  partner: { maxRelays: Number.POSITIVE_INFINITY, maxConcurrentStreams: Number.POSITIVE_INFINITY },
  admin: { maxRelays: Number.POSITIVE_INFINITY, maxConcurrentStreams: Number.POSITIVE_INFINITY },
};

/** Formule inconnue ou absente : aucun droit (refus par défaut). */
export const limitsOf = (plan: string | null | undefined) => PLAN_LIMITS[(plan ?? "") as PlanId] ?? PLAN_LIMITS.free;

/** `until` : fin de la formule (profiles.plan_until, migration 0016). Passée : le compte est traité en Gratuit. */
export type Account = { plan: string | null; suspended: boolean; until?: string | null };

/** Formule effective d'un compte (échéance passée = Gratuit, même avant la tâche quotidienne du site). */
export function planOf(account: Account | null, now = Date.now()): string {
  if (!account) return "free";
  if (account.plan !== "admin" && account.until && Date.parse(account.until) <= now) return "free";
  return account.plan ?? "free";
}

type RelayLike = { id: string; archived: boolean; created_at: string; protocol?: string };

/** Peut-on ajouter (ou réactiver) un relais de ce protocole, vu les relais actifs déjà comptés ? */
export function roomFor(limits: Limits, active: { total: number; sameProtocol: number }) {
  if (active.total >= limits.maxRelays) return false;
  return limits.maxPerProtocol === undefined || active.sameProtocol < limits.maxPerProtocol;
}

/**
 * Relais d'un compte autorisés à diffuser : compte actif, formule payante ou bêta, relais non archivé,
 * et dans les limites de la formule, au total et par protocole (les plus anciens d'abord).
 */
export function allowedRelayIds<R extends RelayLike>(account: Account | null, relays: R[]): Set<string> {
  if (!account || account.suspended) return new Set();
  const limits = limitsOf(planOf(account));
  const active = relays.filter((r) => !r.archived).sort((a, b) => a.created_at.localeCompare(b.created_at));
  const ok = new Set<string>();
  const perProtocol = new Map<string, number>();
  for (const r of active) {
    const same = perProtocol.get(r.protocol ?? "") ?? 0;
    if (!roomFor(limits, { total: ok.size, sameProtocol: same })) continue;
    ok.add(r.id);
    perProtocol.set(r.protocol ?? "", same + 1);
  }
  return ok;
}

/**
 * Un publieur vient d'être accepté par le SLS : a-t-il le droit de diffuser ? null = oui, sinon la raison.
 * `liveOthers` = autres relais du compte déjà en direct (flux simultanés).
 */
export function publisherVerdict<R extends RelayLike>(
  account: Account | null,
  relays: R[],
  relayId: string,
  liveOthers: number,
): "account" | "suspended" | "plan" | "quota" | "streams" | null {
  if (!account) return "account";
  if (account.suspended) return "suspended";
  const limits = limitsOf(planOf(account));
  if (!allowedRelayIds(account, relays).has(relayId)) return limits.maxRelays <= 0 ? "plan" : "quota";
  if (liveOthers + 1 > limits.maxConcurrentStreams) return "streams";
  return null;
}
