import { EventEmitter } from "node:events";
import type { Relay } from "./relays.ts";
import type { SampleStore, Sample } from "./samples.ts";
import type { PublisherStats, Sls } from "./sls.ts";

// Santé du flux : relève /stats de chaque flux en respectant la limite du SLS (5 requêtes/s par défaut).
// Flux en live (ou regardé dans le dashboard) : toutes les secondes si possible. Hors ligne : toutes les 10 s.
// Un point est enregistré toutes les 2 s par flux live ; les abonnés (SSE) reçoivent chaque relevé.

export type Live = { live: boolean; since: number; sample: Sample | null; peers: PublisherStats["peers"] };

type Entry = { key: Relay; nextAt: number; lastDropped: number | null; lastStored: number; state: Live };

const clamp01 = (x: number) => Math.min(1, Math.max(0, x));

/** 0 = fluide, 1 = saturé : RTT élevé ou pertes. */
export function congestion(rtt: number, droppedDelta: number) {
  return Math.max(clamp01((rtt - 100) / 500), clamp01(droppedDelta / 50));
}

export function createHealthMonitor(opts: { sls: Sls; samples: SampleStore; perSecond: number; now?: () => number }) {
  const { sls, samples, perSecond } = opts;
  const now = opts.now ?? Date.now;
  const events = new EventEmitter();
  events.setMaxListeners(0);
  const entries = new Map<string, Entry>(); // par id de relais
  const watchers = new Map<string, number>(); // id de relais → nombre d'abonnés
  let credit = perSecond; // budget plein au démarrage
  let lastTick = now();

  function setKeys(keys: Relay[]) {
    const seen = new Set<string>();
    for (const key of keys) {
      seen.add(key.id);
      const e = entries.get(key.id);
      if (e) e.key = key;
      else entries.set(key.id, { key, nextAt: 0, lastDropped: null, lastStored: 0, state: { live: false, since: now(), sample: null, peers: undefined } });
    }
    for (const id of entries.keys()) if (!seen.has(id)) entries.delete(id);
  }

  function interval(e: Entry) {
    const busy = [...entries.values()].filter((x) => x.state.live || watchers.has(x.key.id)).length;
    const fast = Math.max(1000, (busy / perSecond) * 1000);
    return e.state.live || watchers.has(e.key.id) ? fast : Math.max(10_000, fast);
  }

  function setLive(e: Entry, live: boolean) {
    if (e.state.live === live) return;
    e.state = { ...e.state, live, since: now(), sample: live ? e.state.sample : null, peers: live ? e.state.peers : undefined };
    if (!live) e.lastDropped = null;
    events.emit("status", e.key.id, e.state, e.key);
  }

  async function poll(e: Entry) {
    let stats: PublisherStats | null;
    try {
      stats = await sls.stats(e.key.play_id);
    } catch {
      return; // SLS injoignable ou limité : on réessaiera au prochain tour
    }
    const t = now();
    if (!stats || stats.bitrate <= 0) {
      setLive(e, false);
      events.emit("sample", e.key.id, e.state, e.key);
      return;
    }
    const cum = stats.dropped_pkts ?? 0;
    const dropped = e.lastDropped === null ? 0 : Math.max(0, cum - e.lastDropped);
    e.lastDropped = cum;
    const sample: Sample = {
      t,
      bitrate: stats.bitrate,
      rtt: stats.rtt,
      dropped,
      buffer: stats.buffer ?? null,
      latency: stats.latency ?? null,
      congestion: congestion(stats.rtt, dropped),
      links: stats.peers?.length ?? 1,
    };
    setLive(e, true);
    e.state = { ...e.state, sample, peers: stats.peers };
    if (t - e.lastStored >= 2000) {
      samples.add(e.key.id, sample);
      e.lastStored = t;
    }
    events.emit("sample", e.key.id, e.state, e.key);
  }

  /** Appelé en boucle (toutes les 200 ms) : dépense le budget de requêtes sur les flux les plus en retard. */
  function tick() {
    const t = now();
    credit = Math.min(perSecond, credit + ((t - lastTick) / 1000) * perSecond);
    lastTick = t;
    const due = [...entries.values()].filter((e) => e.nextAt <= t).sort((a, b) => a.nextAt - b.nextAt);
    const jobs: Promise<void>[] = [];
    for (const e of due) {
      if (credit < 1) break;
      credit -= 1;
      e.nextAt = t + interval(e);
      // Replanifié après le relevé : un flux qui vient de passer en live repart au rythme rapide.
      jobs.push(poll(e).then(() => void (e.nextAt = t + interval(e))));
    }
    return Promise.all(jobs);
  }

  return {
    events,
    setKeys,
    tick,
    state: (relayId: string): Live | null => entries.get(relayId)?.state ?? null,
    relay: (relayId: string): Relay | null => entries.get(relayId)?.key ?? null,
    /** Relais actifs d'un compte, avec leur état. */
    byUser: (userId: string) => [...entries.values()].filter((e) => e.key.user_id === userId).map((e) => ({ relay: e.key, state: e.state })),
    liveRelays: () => [...entries.values()].filter((e) => e.state.live).map((e) => e.key),
    /** Un abonné (dashboard ouvert) : relevé rapide même hors ligne. Renvoie la fonction de désabonnement. */
    watch(relayId: string) {
      watchers.set(relayId, (watchers.get(relayId) ?? 0) + 1);
      const e = entries.get(relayId);
      if (e) e.nextAt = 0;
      return () => {
        const n = (watchers.get(relayId) ?? 1) - 1;
        if (n <= 0) watchers.delete(relayId);
        else watchers.set(relayId, n);
      };
    },
  };
}

export type HealthMonitor = ReturnType<typeof createHealthMonitor>;
