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

export function createUserVerifier(supabaseUrl: string, jwks?: JWTVerifyGetKey) {
  const issuer = `${supabaseUrl.replace(/\/$/, "")}/auth/v1`;
  const keys = jwks ?? createRemoteJWKSet(new URL(`${issuer}/.well-known/jwks.json`));
  /** Identifiant de l'utilisateur, ou null si le jeton est absent, expiré ou invalide. */
  return async function verifyUser(header: string | undefined): Promise<string | null> {
    if (!header?.startsWith("Bearer ")) return null;
    try {
      const { payload } = await jwtVerify(header.slice(7), keys, { issuer, audience: "authenticated" });
      return typeof payload.sub === "string" ? payload.sub : null;
    } catch {
      return null;
    }
  };
}
