// API de MediaMTX (127.0.0.1:9997) : coupe les publieurs d'un chemin dont la clé n'est plus valable
// (clé régénérée, relais archivé ou supprimé, compte suspendu). MediaMTX ne redemande l'autorisation qu'à la connexion.

const KINDS = ["rtmpconns", "webrtcsessions", "rtspsessions", "srtconns"] as const;

export async function kickPath(apiUrl: string, path: string, fetchImpl: typeof fetch = fetch): Promise<number> {
  let n = 0;
  for (const kind of KINDS) {
    try {
      const res = await fetchImpl(`${apiUrl}/v3/${kind}/list?itemsPerPage=1000`, { signal: AbortSignal.timeout(2000) });
      if (!res.ok) continue;
      const items = ((await res.json()) as { items?: { id: string; path: string; state?: string }[] }).items ?? [];
      for (const c of items.filter((c) => c.path === path && c.state !== "read")) {
        const k = await fetchImpl(`${apiUrl}/v3/${kind}/kick/${c.id}`, { method: "POST", signal: AbortSignal.timeout(2000) });
        if (k.ok) n++;
      }
    } catch {
      // MediaMTX absent ou redémarre
    }
  }
  return n;
}
