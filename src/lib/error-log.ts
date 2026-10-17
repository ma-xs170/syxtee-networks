import "server-only";
import { createHash } from "node:crypto";
import { createAdminClient, hasAdmin } from "@/lib/supabase/admin";

// Journal des erreurs (table error_logs, migration 0054) : une ligne par erreur distincte, avec un compteur.
// Ne lève jamais : journaliser une erreur ne doit pas en créer une autre.

export type ErrorSource = "server" | "client" | "action" | "route";

// Mots à ne jamais écrire dans le journal : jetons, clés, adresses e-mail.
const SECRET = /(eyJ[\w-]{10,}\.[\w-]{10,}\.[\w-]{10,}|(sk|rk|pk|whsec)_[A-Za-z0-9_]{8,}|Bearer\s+\S+|[\w.+-]+@[\w-]+\.[\w.-]+)/g;
const clean = (v: string) => v.replace(SECRET, "[masqué]");

const recent = new Map<string, number>();

export async function logError(input: { source: ErrorSource; message: string; digest?: string; path?: string; method?: string; userAgent?: string }) {
  try {
    const message = clean(input.message.split("\n")[0] ?? "").slice(0, 600) || "(sans message)";
    const path = (input.path ?? "").split("?")[0].slice(0, 300);
    const fingerprint = createHash("sha1").update(`${input.source}|${input.digest ?? message}|${path}`).digest("hex");
    // Rafale (même erreur 100 fois en une seconde) : une écriture par 5 s et par instance suffit.
    const now = Date.now();
    if (now - (recent.get(fingerprint) ?? 0) < 5000) return;
    recent.set(fingerprint, now);
    if (recent.size > 500) for (const [k, t] of recent) if (now - t > 60_000) recent.delete(k);
    if (!hasAdmin) return;
    const { error } = await createAdminClient().rpc("log_error", {
      p_fingerprint: fingerprint,
      p_source: input.source,
      p_message: message,
      p_digest: input.digest ?? null,
      p_path: path || null,
      p_method: input.method ?? null,
      p_user_agent: input.userAgent ?? null,
    });
    if (error) console.error("log_error", error.message);
  } catch (e) {
    console.error("log_error", e instanceof Error ? e.message : e);
  }
}
