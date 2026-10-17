import "server-only";
import { allow } from "@/lib/auth/rateLimit";

// Garde-fous des routes API et des appels sortants.
//  - limitOr429 : plafond de requêtes par visiteur (compteurs Postgres, partagés entre toutes les instances).
//  - budget : plafond d'appels par jour vers un fournisseur payant ou à quota (YouTube, e-mails…).
//  - throttle : limite en mémoire, sans base, pour les routes très fréquentes (battement de présence).

/** Réponse 429 si `key` dépasse `max` requêtes par fenêtre de `windowSeconds` ; null sinon. */
export async function limitOr429(key: string, max: number, windowSeconds: number): Promise<Response | null> {
  if (await allow(key, max, windowSeconds)) return null;
  return Response.json({ error: "rate_limited" }, { status: 429, headers: { "Retry-After": String(Math.min(windowSeconds, 60)), "Cache-Control": "no-store" } });
}

/** Vrai tant que le fournisseur n'a pas atteint son plafond du jour. À appeler AVANT l'appel sortant. */
export const budget = (provider: string, perDay: number) => allow(`budget:${provider}`, perDay, 86_400);

const hits = new Map<string, number[]>();
/** Limite locale à l'instance (sans base) : au plus `max` appels par `windowMs` pour `key`. */
export function throttle(key: string, max: number, windowMs: number) {
  const now = Date.now();
  const recent = (hits.get(key) ?? []).filter((t) => now - t < windowMs);
  if (recent.length >= max) {
    hits.set(key, recent);
    return false;
  }
  recent.push(now);
  hits.set(key, recent);
  if (hits.size > 5000) for (const [k, v] of hits) if (now - (v.at(-1) ?? 0) > windowMs) hits.delete(k);
  return true;
}
