import "server-only";
import { getProfile, getUser, type Profile } from "@/lib/auth/dal";
import { limitOr429 } from "@/lib/guard";

/** Réponse JSON privée : jamais mise en cache partagée. */
export const privateJson = (data: unknown, init: ResponseInit = {}) =>
  Response.json(data, { ...init, headers: { "Cache-Control": "private, no-store", ...(init.headers ?? {}) } });

/** Utilisateur de l'app iOS (jeton Bearer ou cookie) ; une `Response` 401/403 sinon. */
export async function appUser(): Promise<{ id: string; email: string | null; profile: Profile } | Response> {
  const user = await getUser();
  if (!user) return privateJson({ error: "unauthorized" }, { status: 401 });
  const profile = await getProfile();
  if (!profile) return privateJson({ error: "no_profile" }, { status: 403 });
  if (profile.suspended_at) return privateJson({ error: "suspended" }, { status: 403 });
  // App iOS et dashboard : 120 requêtes par minute et par compte (une app qui boucle ne peut pas saturer le serveur).
  const limited = await limitOr429(`app:${user.id}`, 120, 60);
  if (limited) return limited;
  return { id: user.id, email: user.email ?? null, profile };
}

/** Une Server Action qui se termine par `redirect()` lève NEXT_REDIRECT : on récupère la destination au lieu de suivre la redirection. */
export async function redirectTarget<T>(job: () => Promise<T>): Promise<{ result: T } | { redirect: string }> {
  try {
    return { result: await job() };
  } catch (e) {
    const digest = (e as { digest?: string } | null)?.digest;
    if (typeof digest === "string" && digest.startsWith("NEXT_REDIRECT")) {
      const target = digest.split(";")[2];
      if (target) return { redirect: target };
    }
    throw e;
  }
}

/** Corps JSON d'une requête, limité à 32 Ko (aucune de ces routes n'a besoin de plus) ; null si trop gros ou invalide. */
export async function readJson(request: Request, maxBytes = 32_000): Promise<unknown> {
  const declared = Number(request.headers.get("content-length"));
  if (declared > maxBytes) return null;
  const text = await request.text();
  if (text.length > maxBytes) return null;
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}
