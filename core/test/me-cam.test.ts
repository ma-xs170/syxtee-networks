import assert from "node:assert/strict";
import { test } from "node:test";

const U = "00000000-0000-0000-0000-000000000001";

test("GET /v1/me/cam : session requise, renvoie la clé caméra du compte, 404 sans relais", async () => {
  const { buildServer } = await import("../src/server.ts");
  const { loadConfig } = await import("../src/config.ts");
  const config = loadConfig({ RELAY_KEYS_SECRET: "k".repeat(64),
    CORE_API_TOKEN: "x".repeat(32), SUPABASE_URL: "https://x.supabase.co", SUPABASE_SECRET_KEY: "secretsecret",
    SLS_API_KEY: "slskeyslskey", RELAY_PUBLIC_HOST: "1.2.3.4",
  } as NodeJS.ProcessEnv);
  const row = { id: "r1", name: "iPhone", cam_key: `cam_${"a".repeat(32)}` };
  let owner: string | null = U;
  const cam = {
    lookup: async () => null, authorize: async () => false,
    whipUrl: (k: string) => `https://cam.example/${k}/whip`,
    ensure: async (id: string) => (id === owner ? row : null),
  };
  const app = buildServer({
    config, cam, health: { state: () => null }, samples: {}, sessions: {}, keys: {}, relays: {},
    verifyUser: async (h?: string) => (h === "Bearer jwt_ok" ? U : null), previewPath: () => "", onKeysChanged: () => {}, slsHealthy: async () => true,
  } as unknown as Parameters<typeof buildServer>[0]);

  assert.equal((await app.inject({ method: "GET", url: "/v1/me/cam" })).statusCode, 401);
  assert.equal((await app.inject({ method: "GET", url: "/v1/me/cam", headers: { authorization: "Bearer nope" } })).statusCode, 401);

  const ok = await app.inject({ method: "GET", url: "/v1/me/cam", headers: { authorization: "Bearer jwt_ok" } });
  assert.equal(ok.statusCode, 200);
  assert.equal(ok.json().cam_key, row.cam_key);
  assert.equal(ok.json().relay.name, "iPhone");

  owner = null;
  assert.equal((await app.inject({ method: "GET", url: "/v1/me/cam", headers: { authorization: "Bearer jwt_ok" } })).statusCode, 404);
  await app.close();
});
