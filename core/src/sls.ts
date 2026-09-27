// Client de l'API de srt-live-server (OpenIRL). Doc : API.md du dépôt OpenIRL/srt-live-server.
// POST /api/stream-ids · DELETE /api/stream-ids/{player} · GET /stats/{player} (sans authentification).

export type PublisherStats = {
  bitrate: number; // kbps utiles
  throughput?: number; // kbps réseau, retransmissions comprises
  rtt: number; // ms
  buffer?: number; // ms
  dropped_pkts?: number; // paquets perdus définitivement (cumul)
  uptime?: number; // s
  latency?: number; // ms
  peers?: { connection_id: string; bitrate: number; throughput?: number; jitter?: number; uptime?: number }[];
};

export class SlsError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export function createSls(baseUrl: string, apiKey: string, fetchImpl: typeof fetch = fetch) {
  const auth = { Authorization: `Bearer ${apiKey}` };

  async function call(path: string, init: RequestInit = {}) {
    const res = await fetchImpl(`${baseUrl}${path}`, { ...init, headers: { ...auth, ...(init.headers ?? {}) }, signal: AbortSignal.timeout(5000) });
    if (!res.ok) throw new SlsError(res.status, `SLS ${init.method ?? "GET"} ${path.split("/").slice(0, 3).join("/")} → ${res.status}`);
    return res;
  }

  return {
    async addStreamId(publisher: string, player: string, description: string) {
      await call("/api/stream-ids", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ publisher, player, description }),
      });
    },
    /** Supprime une paire. 404 = déjà absente : pas une erreur. */
    async deleteStreamId(player: string) {
      try {
        await call(`/api/stream-ids/${encodeURIComponent(player)}`, { method: "DELETE" });
      } catch (e) {
        if (!(e instanceof SlsError && e.status === 404)) throw e;
      }
    },
    async listStreamIds(): Promise<{ publisher: string; player: string; description?: string }[]> {
      const json = (await (await call("/api/stream-ids")).json()) as { data?: { publisher: string; player: string; description?: string }[] };
      return json.data ?? [];
    },
    /** Stats du publieur d'un player ; null si personne ne publie. */
    async stats(player: string): Promise<PublisherStats | null> {
      const res = await fetchImpl(`${baseUrl}/stats/${encodeURIComponent(player)}`, { signal: AbortSignal.timeout(3000) });
      if (res.status === 404) return null;
      if (res.status === 429) throw new SlsError(429, "SLS stats : limite de requêtes atteinte");
      if (!res.ok) throw new SlsError(res.status, `SLS stats → ${res.status}`);
      return parseStats(await res.json());
    },
  };
}

export type Sls = ReturnType<typeof createSls>;

/** Normalise la réponse /stats (format actuel, et format legacy au cas où). */
export function parseStats(json: unknown): PublisherStats | null {
  if (!json || typeof json !== "object") return null;
  const j = json as Record<string, unknown>;
  let p = j.publisher as Record<string, unknown> | undefined;
  if (!p && j.publishers && typeof j.publishers === "object") p = Object.values(j.publishers as object)[0] as Record<string, unknown> | undefined;
  if (!p || typeof p !== "object") return null;
  const num = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : undefined);
  const bitrate = num(p.bitrate);
  if (bitrate === undefined) return null;
  return {
    bitrate,
    throughput: num(p.throughput),
    rtt: num(p.rtt) ?? 0,
    buffer: num(p.buffer) ?? num(p.ms_rcv_buf),
    dropped_pkts: num(p.dropped_pkts) ?? num(p.pkt_rcv_drop),
    uptime: num(p.uptime),
    latency: num(p.latency),
    peers: Array.isArray(p.peers) ? (p.peers as PublisherStats["peers"]) : undefined,
  };
}
