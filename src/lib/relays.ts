import "server-only";
import { CoreOutdated, hasCore, listRelays, type RelayView } from "@/lib/core";
import type { RelayRow } from "./relay-groups";
import { dataClient } from "@/lib/workspace";

// Relais du compte connecté, pour les pages du dashboard : lus au Core (URLs, statut en direct),
// complétés par l'historique (débit moyen sur 30 jours, lu avec la session de l'utilisateur).

export type CoreStatus = "ok" | "down" | "off" | "outdated";
export type { RelayRow } from "./relay-groups";

const DAY = 86_400_000;

export async function loadRelays(userId: string): Promise<{ relays: RelayRow[]; status: CoreStatus }> {
  if (!hasCore) return { relays: [], status: "off" };
  let relays: RelayView[];
  try {
    relays = await listRelays(userId);
  } catch (e) {
    if (e instanceof CoreOutdated) return { relays: [], status: "outdated" };
    console.error("relais : Core", e);
    return { relays: [], status: "down" };
  }
  const avg = new Map<string, { w: number; s: number }>();
  if (relays.length) {
    const { db: supabase, ownerId } = await dataClient();
    let avgQ = supabase
      .from("live_sessions")
      .select("relay_id, avg_kbps, duration_s")
      .not("ended_at", "is", null)
      .gte("started_at", new Date(Date.now() - 30 * DAY).toISOString());
    if (ownerId) avgQ = avgQ.eq("user_id", ownerId);
    const { data } = await avgQ;
    for (const r of (data ?? []) as { relay_id: string | null; avg_kbps: number; duration_s: number }[]) {
      if (!r.relay_id) continue;
      const a = avg.get(r.relay_id) ?? { w: 0, s: 0 };
      a.w += r.avg_kbps * r.duration_s;
      a.s += r.duration_s;
      avg.set(r.relay_id, a);
    }
  }
  return {
    relays: relays.map((r) => {
      const a = avg.get(r.id);
      return { ...r, avg_kbps: a && a.s > 0 ? Math.round(a.w / a.s) : null };
    }),
    status: "ok",
  };
}

/** Message affiché quand le Core ne peut pas donner les relais. */
export const coreStatusText: Record<Exclude<CoreStatus, "ok">, string> = {
  down: "Le relais ne répond pas pour le moment. Réessaie dans quelques minutes.",
  off: "Le relais n'est pas encore branché au dashboard.",
  outdated: "Le serveur relais n'est pas encore à jour : les relais multiples arrivent avec sa prochaine mise à jour.",
};
