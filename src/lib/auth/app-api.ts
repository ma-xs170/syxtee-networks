import "server-only";
import { getProfile, getUser, type Profile } from "@/lib/auth/dal";

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
