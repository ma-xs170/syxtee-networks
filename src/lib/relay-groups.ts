import type { RelayView } from "@/lib/core";

// Classement des relais (partagé serveur / navigateur).

export type RelayRow = RelayView & { avg_kbps: number | null };

const DAY = 86_400_000;

export type RelayGroup = "live" | "active" | "idle" | "archived";

/** En live · actif (direct dans les 30 derniers jours) · inactif · archivé. */
export function relayGroup(r: Pick<RelayView, "live" | "archived" | "last_live_at">, now = Date.now()): RelayGroup {
  if (r.archived) return "archived";
  if (r.live) return "live";
  return r.last_live_at && now - new Date(r.last_live_at).getTime() < 30 * DAY ? "active" : "idle";
}

/** Relais à afficher par défaut (santé, aperçu) : celui en direct, sinon le plus récemment utilisé, sinon le premier. */
export function defaultRelay<T extends Pick<RelayView, "id" | "live" | "archived" | "last_live_at">>(relays: T[]): T | null {
  const active = relays.filter((r) => !r.archived);
  return (
    active.find((r) => r.live) ??
    [...active].sort((a, b) => (b.last_live_at ?? "").localeCompare(a.last_live_at ?? ""))[0] ??
    null
  );
}
