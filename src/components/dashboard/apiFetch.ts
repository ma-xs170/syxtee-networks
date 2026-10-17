// fetch du navigateur vers les routes du site (/api/...) avec délai maximal et nouvel essai.
//  - délai : 10 s par défaut (au-delà, l'appel est annulé et l'appelant affiche son message d'erreur) ;
//  - nouvel essai : seulement pour une lecture (GET), sur erreur réseau ou 502/503/504, après une courte pause ;
//  - 429 : on attend le délai demandé par le serveur (Retry-After, 10 s au plus) avant l'unique nouvel essai.
// Les envois (POST, DELETE) ne sont jamais rejoués tout seuls : un message envoyé deux fois serait pire qu'une erreur.
const RETRY_STATUS = new Set([502, 503, 504]);
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

export async function apiFetch(url: string, init: RequestInit = {}, opts: { timeoutMs?: number; retries?: number } = {}): Promise<Response> {
  const { timeoutMs = 10_000, retries = 1 } = opts;
  const canRetry = (init.method ?? "GET").toUpperCase() === "GET";
  for (let attempt = 0; ; attempt++) {
    const limit = AbortSignal.timeout(timeoutMs);
    try {
      const res = await fetch(url, { ...init, signal: init.signal ? AbortSignal.any([init.signal, limit]) : limit });
      if (canRetry && attempt < retries && (RETRY_STATUS.has(res.status) || res.status === 429)) {
        const asked = Number(res.headers.get("Retry-After"));
        await wait(res.status === 429 ? Math.min(10_000, Math.max(1000, asked * 1000 || 2000)) : 800 * (attempt + 1));
        continue;
      }
      return res;
    } catch (e) {
      if (init.signal?.aborted || !canRetry || attempt >= retries) throw e;
      await wait(800 * (attempt + 1));
    }
  }
}
