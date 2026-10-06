import { hostname } from "node:os";
import type { Tokens } from "./tokens.ts";

/** Présente le code d'appairage au Core. Renvoie le jeton d'appareil, ou un message d'erreur lisible. */
export async function claimCode(core: string, code: string): Promise<Tokens | { error: string }> {
  const clean = code.trim();
  if (!clean) return { error: "Entre le code affiché dans SYXTEE Studio." };
  const res = await fetch(`${core}/v1/link/claim`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ code: clean, name: hostname().slice(0, 40) || "OBS", platform: process.platform }),
    signal: AbortSignal.timeout(10_000),
  }).catch(() => null);
  if (!res) return { error: "Serveur injoignable. Vérifie ta connexion." };
  const j = (await res.json().catch(() => ({}))) as Partial<Tokens> & { error?: string };
  if (res.ok && j.token) return { token: j.token, refresh: j.refresh, expires_in: j.expires_in };
  if (j.error === "invalid_code") return { error: "Code invalide ou expiré. Génère-en un nouveau dans SYXTEE Studio." };
  if (j.error === "too_many") return { error: "Trop d'essais. Réessaie dans une minute." };
  return { error: "Appairage impossible." };
}
