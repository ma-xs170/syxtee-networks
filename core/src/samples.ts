import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { DatabaseSync } from "node:sqlite";

// Historique de santé du flux : SQLite local (node:sqlite), 24 h glissantes, un point toutes les 2 s par flux.
// Table samples : la colonne user_id contient l'id du RELAIS (nom gardé pour ne pas migrer la base locale).
// Table positions : id du compte (SYXTEE Cam envoie la position du téléphone, pas d'un relais).

export type Sample = {
  t: number; // ms epoch
  bitrate: number;
  rtt: number;
  dropped: number; // paquets perdus depuis le point précédent
  buffer: number | null;
  latency: number | null;
  congestion: number; // 0 → 1
  links: number; // connexions SRTLA actives
};

/** Une connexion SRTLA (un modem) à un instant : débit utile, débit réseau (retransmissions comprises) et gigue. */
export type PeerSample = { t: number; conn: string; bitrate: number; throughput: number | null; jitter: number | null };

export type Position = { t: number; lat: number; lon: number; acc: number | null; speed: number | null };

const DAY = 24 * 3600 * 1000;

export function openSamples(file: string) {
  if (file !== ":memory:") mkdirSync(dirname(file), { recursive: true });
  const db = new DatabaseSync(file);
  db.exec(`
    PRAGMA journal_mode = WAL;
    CREATE TABLE IF NOT EXISTS samples (
      user_id TEXT NOT NULL, t INTEGER NOT NULL, bitrate REAL, rtt REAL, dropped INTEGER,
      buffer REAL, latency REAL, congestion REAL, links INTEGER
    );
    CREATE INDEX IF NOT EXISTS samples_user_t ON samples (user_id, t);
  `);
  const insert = db.prepare("INSERT INTO samples VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)");
  const range = db.prepare("SELECT t, bitrate, rtt, dropped, buffer, latency, congestion, links FROM samples WHERE user_id = ? AND t >= ? ORDER BY t");
  const purge = db.prepare("DELETE FROM samples WHERE t < ?");
  // Positions GPS envoyées par SYXTEE Cam pendant les lives (même rétention : 24 h).
  db.exec(`
    CREATE TABLE IF NOT EXISTS positions (user_id TEXT NOT NULL, t INTEGER NOT NULL, lat REAL, lon REAL, acc REAL, speed REAL);
    CREATE INDEX IF NOT EXISTS positions_user_t ON positions (user_id, t);
  `);
  const insertPos = db.prepare("INSERT INTO positions VALUES (?, ?, ?, ?, ?, ?)");
  const rangePos = db.prepare("SELECT t, lat, lon, acc, speed FROM positions WHERE user_id = ? AND t >= ? ORDER BY t");
  const purgePos = db.prepare("DELETE FROM positions WHERE t < ?");

  // Historique par connexion (modem) : mêmes 24 h, même rythme (un point toutes les 2 s par connexion).
  db.exec(`
    CREATE TABLE IF NOT EXISTS peer_samples (relay_id TEXT NOT NULL, t INTEGER NOT NULL, conn TEXT NOT NULL, bitrate REAL, throughput REAL, jitter REAL);
    CREATE INDEX IF NOT EXISTS peer_samples_relay_t ON peer_samples (relay_id, t);
  `);
  const insertPeer = db.prepare("INSERT INTO peer_samples VALUES (?, ?, ?, ?, ?, ?)");
  const rangePeers = db.prepare("SELECT t, conn, bitrate, throughput, jitter FROM peer_samples WHERE relay_id = ? AND t >= ? ORDER BY t");
  const purgePeers = db.prepare("DELETE FROM peer_samples WHERE t < ?");

  return {
    addPeers(relayId: string, t: number, peers: { connection_id: string; bitrate: number; throughput?: number; jitter?: number }[]) {
      for (const p of peers) insertPeer.run(relayId, t, p.connection_id, p.bitrate, p.throughput ?? null, p.jitter ?? null);
    },
    /** Historique par connexion depuis `sinceMs`, réduit à `maxPoints` au plus par connexion (moyenne par tranche). */
    peerHistory(relayId: string, sinceMs: number, maxPoints = 360): Record<string, PeerSample[]> {
      const rows = rangePeers.all(relayId, sinceMs) as unknown as PeerSample[];
      const by: Record<string, PeerSample[]> = {};
      for (const r of rows) (by[r.conn] ??= []).push(r);
      for (const [conn, list] of Object.entries(by)) {
        if (list.length <= maxPoints) continue;
        const size = Math.ceil(list.length / maxPoints);
        const out: PeerSample[] = [];
        for (let i = 0; i < list.length; i += size) {
          const c = list.slice(i, i + size);
          const avg = (k: "bitrate" | "throughput" | "jitter") => {
            const v = c.map((x) => x[k]).filter((x): x is number => x !== null);
            return v.length ? v.reduce((a, b) => a + b, 0) / v.length : null;
          };
          out.push({ t: c[0].t, conn, bitrate: avg("bitrate") ?? 0, throughput: avg("throughput"), jitter: avg("jitter") });
        }
        by[conn] = out;
      }
      return by;
    },
    add(relayId: string, s: Sample) {
      insert.run(relayId, s.t, s.bitrate, s.rtt, s.dropped, s.buffer, s.latency, s.congestion, s.links);
    },
    /** Points depuis `sinceMs`, réduits à `maxPoints` au plus (moyenne par tranche, pertes additionnées). */
    history(relayId: string, sinceMs: number, maxPoints = 720): Sample[] {
      const rows = range.all(relayId, sinceMs) as unknown as Sample[];
      if (rows.length <= maxPoints) return rows;
      const size = Math.ceil(rows.length / maxPoints);
      const out: Sample[] = [];
      for (let i = 0; i < rows.length; i += size) {
        const chunk = rows.slice(i, i + size);
        const avg = (k: "bitrate" | "rtt" | "congestion") => chunk.reduce((a, r) => a + r[k], 0) / chunk.length;
        out.push({
          t: chunk[0].t,
          bitrate: avg("bitrate"),
          rtt: avg("rtt"),
          congestion: avg("congestion"),
          dropped: chunk.reduce((a, r) => a + r.dropped, 0),
          buffer: chunk[chunk.length - 1].buffer,
          latency: chunk[chunk.length - 1].latency,
          links: Math.max(...chunk.map((r) => r.links)),
        });
      }
      return out;
    },
    addPosition(userId: string, p: Position) {
      insertPos.run(userId, p.t, p.lat, p.lon, p.acc, p.speed);
    },
    positions(userId: string, sinceMs: number): Position[] {
      return rangePos.all(userId, sinceMs) as unknown as Position[];
    },
    purge(now = Date.now()) {
      purgePos.run(now - DAY);
      purgePeers.run(now - DAY);
      return Number(purge.run(now - DAY).changes);
    },
    close() {
      db.close();
    },
  };
}

export type SampleStore = ReturnType<typeof openSamples>;
