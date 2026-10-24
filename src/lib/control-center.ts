// Centre de contrôle : calculs sur les connexions (modems) d'un relais SRTLA. Fonctions pures, sans dépendance.

export type Peer = { connection_id: string; bitrate: number; throughput?: number; jitter?: number; uptime?: number };

/** Seuils en kb/s : sous BAD le lien ne porte presque rien, sous WARN il est faible (mêmes seuils que l'onglet Connexions). */
export const BAD = 300;
export const WARN = 1000;

export type Level = "off" | "bad" | "warn" | "ok";
export const levelOf = (kbps: number): Level => (kbps <= 0 ? "off" : kbps < BAD ? "bad" : kbps < WARN ? "warn" : "ok");

/** Connexions dans un ordre stable (la même connexion garde sa case d'un relevé à l'autre). */
export const sortPeers = <T extends { connection_id: string }>(peers: T[]) => [...peers].sort((a, b) => a.connection_id.localeCompare(b.connection_id));

/** Rendement : part du débit réseau qui est du débit utile. 100 % : aucune retransmission. Null sans débit réseau mesuré. */
export function efficiency(peers: Peer[]): number | null {
  const net = peers.reduce((a, p) => a + (p.throughput ?? 0), 0);
  if (net <= 0) return null;
  const useful = peers.reduce((a, p) => a + p.bitrate, 0);
  return Math.min(100, Math.round((useful / net) * 100));
}

export type Summary = { total: number; active: number; weak: number; strongest: string | null; weakest: string | null };

/** Résumé des connexions : combien portent du débit, combien sont faibles, la plus forte et la plus faible. */
export function summarize(peers: Peer[]): Summary {
  const carrying = peers.filter((p) => p.bitrate >= BAD);
  const sorted = [...peers].sort((a, b) => b.bitrate - a.bitrate);
  return {
    total: peers.reduce((a, p) => a + p.bitrate, 0),
    active: carrying.length,
    weak: peers.filter((p) => p.bitrate < WARN).length,
    strongest: sorted[0]?.connection_id ?? null,
    weakest: sorted.length > 1 ? sorted[sorted.length - 1].connection_id : null,
  };
}

/** Part d'une connexion dans le débit total, en %. */
export const share = (kbps: number, total: number) => (total > 0 ? Math.round((kbps / total) * 100) : 0);

export type Point = { t: number; v: number };

/** Statistiques d'une série : moyenne, minimum, maximum et part du temps sous le seuil BAD (coupures). */
export function seriesStats(points: Point[]) {
  if (points.length === 0) return { avg: 0, min: 0, max: 0, down: 0 };
  const vs = points.map((p) => p.v);
  return {
    avg: vs.reduce((a, b) => a + b, 0) / vs.length,
    min: Math.min(...vs),
    max: Math.max(...vs),
    down: Math.round((vs.filter((v) => v < BAD).length / vs.length) * 100),
  };
}

export const fmtKbps = (kbps: number) => (kbps >= 1000 ? `${(kbps / 1000).toFixed(1).replace(".", ",")} Mb/s` : `${Math.round(kbps)} kb/s`);
