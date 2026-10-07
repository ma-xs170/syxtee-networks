import { timingSafeEqual } from "node:crypto";
import { createRemoteJWKSet, jwtVerify, type JWTVerifyGetKey } from "jose";

// Deux façons d'appeler le Core :
// - le serveur Vercel (actions du dashboard) : jeton de service partagé CORE_API_TOKEN ;
// - le navigateur (santé en direct, aperçu) : jeton de session Supabase, vérifié avec les clés publiques du projet (JWKS).

export function isServiceToken(header: string | undefined, token: string) {
  const got = header?.startsWith("Bearer ") ? header.slice(7) : "";
  const a = Buffer.from(got);
  const b = Buffer.from(token);
  return a.length === b.length && timingSafeEqual(a, b);
}

/** Appartenance à un espace partagé : vrai si `userId` est membre de `workspaceId` (fourni par le Core, jamais par le navigateur). */
export type MemberCheck = (userId: string, workspaceId: string) => Promise<boolean>;

export function createUserVerifier(supabaseUrl: string, jwks?: JWTVerifyGetKey, isMember?: MemberCheck) {
  const issuer = `${supabaseUrl.replace(/\/$/, "")}/auth/v1`;
  const keys = jwks ?? createRemoteJWKSet(new URL(`${issuer}/.well-known/jwks.json`));
  /** Identifiant de l'utilisateur, ou null si le jeton est absent, expiré ou invalide. */
  /**
   * `workspace` : espace partagé sur lequel agit l'utilisateur (en-tête X-Syxtee-Workspace). Un membre agit alors AU NOM de l'espace
   * (son compte technique) ; un non-membre est refusé (null), jamais traité comme son compte personnel.
   */
  return async function verifyUser(header: string | undefined, workspace?: string): Promise<string | null> {
    if (!header?.startsWith("Bearer ")) return null;
    let user: string | null = null;
    try {
      const { payload } = await jwtVerify(header.slice(7), keys, { issuer, audience: "authenticated" });
      user = typeof payload.sub === "string" ? payload.sub : null;
    } catch {
      return null;
    }
    if (!user || !workspace) return user;
    if (!/^[0-9a-f-]{36}$/i.test(workspace) || !isMember) return null;
    return (await isMember(user, workspace)) ? workspace : null;
  };
}
