import type { SupabaseClient } from "@supabase/supabase-js";

// Historique des directs : une ligne `live_sessions` par session de diffusion et par relais (Supabase).
// Ouverte quand le flux passe en ligne, mise à jour toutes les 30 s (durée, débit moyen / crête, mini-courbe),
// fermée quand le flux reste hors ligne plus de GRACE_MS. Une coupure plus courte compte comme une reconnexion.

export const GRACE_MS = 60_000;
const FLUSH_MS = 30_000;
const SERIES_POINTS = 60;

export type SessionRow = {
  user_id: string;
  relay_id: string;
  device_name: string | null;
  started_at: string;
  ended_at: string | null;
  duration_s: number;
  avg_kbps: number;
  peak_kbps: number;
  reconnects: number;
  relay: string;
  bitrate_series: number[];
};

/** Accès à la base, isolé pour les tests. */
export type SessionDb = {
  insert(row: SessionRow): Promise<string>;
  update(id: string, patch: Partial<SessionRow>): Promise<void>;
  /** Ferme les sessions restées ouvertes (Core arrêté pendant un direct). Renvoie leur nombre. */
  closeStale(): Promise<number>;
};

type Open = {
  id: Promise<string | null>;
  startedAt: number;
  lastLiveAt: number;
  offlineSince: number | null;
  reconnects: number;
  points: number[]; // débit de chaque relevé (kbps)
  lastFlush: number;
};

/** Moyenne par tranche pour tenir en `n` points. */
export function downsample(points: number[], n = SERIES_POINTS) {
  if (points.length <= n) return points.map(Math.round);
  const out: number[] = [];
  const size = points.length / n;
  for (let i = 0; i < n; i++) {
    const chunk = points.slice(Math.floor(i * size), Math.floor((i + 1) * size));
    out.push(Math.round(chunk.reduce((a, b) => a + b, 0) / chunk.length));
  }
  return out;
}

export function createSessionTracker(opts: { db: SessionDb; relay: string; now?: () => number; log?: (m: string) => void }) {
  const { db, relay } = opts;
  const now = opts.now ?? Date.now;
  const log = opts.log ?? (() => {});
  const open = new Map<string, Open>(); // par id de relais
  const queue = new Map<string, Promise<unknown>>(); // écritures en série par relais

  const serial = (relayId: string, job: () => Promise<unknown>) => {
    const next = (queue.get(relayId) ?? Promise.resolve()).then(job).catch((e) => log(`session ${relayId.slice(0, 8)} : ${(e as Error).message}`));
    queue.set(relayId, next);
    return next;
  };

  function stats(s: Open, end: number) {
    const sum = s.points.reduce((a, b) => a + b, 0);
    return {
      duration_s: Math.max(0, Math.round((end - s.startedAt) / 1000)),
      avg_kbps: s.points.length ? Math.round(sum / s.points.length) : 0,
      peak_kbps: Math.round(Math.max(0, ...s.points)),
      reconnects: s.reconnects,
      bitrate_series: downsample(s.points),
    };
  }

  function flush(relayId: string, s: Open, end: number, ended: boolean) {
    const patch: Partial<SessionRow> = { ...stats(s, end), ...(ended ? { ended_at: new Date(end).toISOString() } : {}) };
    s.lastFlush = now();
    return serial(relayId, async () => {
      const id = await s.id;
      if (id) await db.update(id, patch);
    });
  }

  function close(relayId: string, s: Open) {
    open.delete(relayId);
    return flush(relayId, s, s.offlineSince ?? s.lastLiveAt, true);
  }

  return {
    /** Changement d'état du flux d'un relais (évènement « status » du moniteur de santé). */
    status(relayId: string, live: boolean, userId: string) {
      const t = now();
      const s = open.get(relayId);
      if (!live) {
        if (s && s.offlineSince === null) s.offlineSince = t;
        return;
      }
      if (s) {
        if (s.offlineSince !== null) {
          s.reconnects += 1;
          s.offlineSince = null;
        }
        s.lastLiveAt = t;
        return;
      }
      const row: SessionRow = {
        user_id: userId,
        relay_id: relayId,
        device_name: null,
        started_at: new Date(t).toISOString(),
        ended_at: null,
        duration_s: 0,
        avg_kbps: 0,
        peak_kbps: 0,
        reconnects: 0,
        relay,
        bitrate_series: [],
      };
      let resolve!: (id: string | null) => void;
      const id = new Promise<string | null>((r) => (resolve = r));
      open.set(relayId, { id, startedAt: t, lastLiveAt: t, offlineSince: null, reconnects: 0, points: [], lastFlush: t });
      serial(relayId, async () => {
        try {
          resolve(await db.insert(row));
        } catch (e) {
          resolve(null);
          throw e;
        }
      });
    },

    /** Relevé de débit d'un flux en ligne. */
    sample(relayId: string, kbps: number) {
      const s = open.get(relayId);
      if (!s || s.offlineSince !== null) return;
      s.points.push(kbps);
      s.lastLiveAt = now();
    },

    /** Appelé régulièrement : ferme les sessions hors ligne depuis GRACE_MS, sauvegarde les autres toutes les 30 s. */
    tick() {
      const t = now();
      const jobs: Promise<unknown>[] = [];
      for (const [relayId, s] of open) {
        if (s.offlineSince !== null && t - s.offlineSince >= GRACE_MS) jobs.push(close(relayId, s));
        else if (s.offlineSince === null && t - s.lastFlush >= FLUSH_MS) jobs.push(flush(relayId, s, s.lastLiveAt, false));
      }
      return Promise.all(jobs);
    },

    /** Direct en cours (même pendant une coupure de moins de GRACE_MS). */
    current(relayId: string) {
      const s = open.get(relayId);
      return s ? { started_at: s.startedAt, reconnects: s.reconnects, reconnecting: s.offlineSince !== null } : null;
    },

    /** Arrêt du Core : ferme toutes les sessions. */
    closeAll() {
      for (const [relayId, s] of open) {
        if (s.offlineSince === null) s.offlineSince = now();
        void close(relayId, s);
      }
      return Promise.all(queue.values());
    },
  };
}

export type SessionTracker = ReturnType<typeof createSessionTracker>;

/** Implémentation Supabase de SessionDb. */
export function supabaseSessionDb(db: SupabaseClient): SessionDb {
  return {
    async insert(row) {
      const { data, error } = await db.from("live_sessions").insert(row).select("id").single();
      if (error) throw new Error(`live_sessions insert : ${error.message}`);
      return (data as { id: string }).id;
    },
    async update(id, patch) {
      const { error } = await db.from("live_sessions").update(patch).eq("id", id);
      if (error) throw new Error(`live_sessions update : ${error.message}`);
    },
    async closeStale() {
      const { data, error } = await db.from("live_sessions").select("id, started_at, duration_s").is("ended_at", null);
      if (error) throw new Error(`live_sessions : ${error.message}`);
      const rows = (data ?? []) as { id: string; started_at: string; duration_s: number }[];
      for (const r of rows) {
        const ended = new Date(new Date(r.started_at).getTime() + r.duration_s * 1000).toISOString();
        await this.update(r.id, { ended_at: ended });
      }
      return rows.length;
    },
  };
}
