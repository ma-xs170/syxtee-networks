import assert from "node:assert/strict";
import { test } from "node:test";
import { SignJWT, createLocalJWKSet, exportJWK, generateKeyPair } from "jose";
import { createUserVerifier, isServiceToken } from "../src/auth.ts";

test("jeton de service : comparaison exacte", () => {
  const tok = "x".repeat(40);
  assert.equal(isServiceToken(`Bearer ${tok}`, tok), true);
  assert.equal(isServiceToken(`Bearer ${tok}y`, tok), false);
  assert.equal(isServiceToken(undefined, tok), false);
});

test("jeton Supabase : signature, émetteur et audience vérifiés", async () => {
  const url = "https://abc.supabase.co";
  const { publicKey, privateKey } = await generateKeyPair("ES256");
  const jwk = { ...(await exportJWK(publicKey)), kid: "k1", alg: "ES256" };
  const verify = createUserVerifier(url, createLocalJWKSet({ keys: [jwk] }));
  const sign = (iss: string, aud: string) =>
    new SignJWT({}).setProtectedHeader({ alg: "ES256", kid: "k1" }).setSubject("user-1").setIssuer(iss).setAudience(aud).setExpirationTime("5m").sign(privateKey);

  assert.equal(await verify(`Bearer ${await sign(`${url}/auth/v1`, "authenticated")}`), "user-1");
  assert.equal(await verify(`Bearer ${await sign("https://autre.supabase.co/auth/v1", "authenticated")}`), null);
  assert.equal(await verify(`Bearer ${await sign(`${url}/auth/v1`, "anon")}`), null);
  assert.equal(await verify("Bearer n'importe-quoi"), null);
});

test("espace partagé : un membre agit au nom de l'espace, un non-membre est refusé (jamais son compte perso)", async () => {
  const url = "https://abc.supabase.co";
  const WS = "11111111-1111-4111-8111-111111111111";
  const { publicKey, privateKey } = await generateKeyPair("ES256");
  const jwk = { ...(await exportJWK(publicKey)), kid: "k1", alg: "ES256" };
  const verify = createUserVerifier(url, createLocalJWKSet({ keys: [jwk] }), async (user, ws) => user === "membre" && ws === WS);
  const sign = (sub: string) => new SignJWT({}).setProtectedHeader({ alg: "ES256", kid: "k1" }).setSubject(sub).setIssuer(`${url}/auth/v1`).setAudience("authenticated").setExpirationTime("5m").sign(privateKey);

  assert.equal(await verify(`Bearer ${await sign("membre")}`, WS), WS);
  assert.equal(await verify(`Bearer ${await sign("membre")}`), "membre");
  assert.equal(await verify(`Bearer ${await sign("intrus")}`, WS), null);
  assert.equal(await verify(`Bearer ${await sign("membre")}`, "pas-un-uuid"), null);
  const sansVerif = createUserVerifier(url, createLocalJWKSet({ keys: [jwk] }));
  assert.equal(await sansVerif(`Bearer ${await sign("membre")}`, WS), null);
});
