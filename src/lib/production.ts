import type { Plan } from "./plans";

// Production (équipes) : un espace partagé où chaque streamer a un relais et où les vidéastes sont comptés à part.
// L'encadrement (propriétaire, admins) n'est jamais compté.

export type MemberKind = "streamer" | "videaste" | "staff";
export const MEMBER_KINDS: MemberKind[] = ["streamer", "videaste", "staff"];
export const KIND_LABEL: Record<MemberKind, { one: string; many: string }> = {
  streamer: { one: "Streamer", many: "streamers" },
  videaste: { one: "Vidéaste", many: "vidéastes" },
  staff: { one: "Encadrement", many: "membres d'encadrement" },
};

export const isKind = (v: unknown): v is MemberKind => MEMBER_KINDS.includes(v as MemberKind);

/** Formule Production : le plan fixe un nombre de vidéastes (les autres formules n'en ont pas). */
export const isProduction = (plan: Plan) => plan.maxVideographers !== undefined;

/** Places d'un type de membre dans la formule (null : pas de limite). */
export function kindLimit(plan: Plan, kind: MemberKind): number | null {
  if (!isProduction(plan) || kind === "staff") return null;
  const n = kind === "streamer" ? plan.maxRelays : plan.maxVideographers!;
  return Number.isFinite(n) ? n : null;
}

/** Message de refus quand `used` membres (invitations comprises) remplissent déjà les places du type. */
export function kindFullMessage(plan: Plan, kind: MemberKind, used: number): string | null {
  const limit = kindLimit(plan, kind);
  if (limit === null || used < limit) return null;
  return `La formule ${plan.name} compte ${limit} ${KIND_LABEL[kind].many} au plus (invitations comprises). Retire-en un ou passe à une formule plus grande.`;
}
