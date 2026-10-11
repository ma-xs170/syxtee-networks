import assert from "node:assert/strict";
import { test } from "node:test";

const U = "00000000-0000-0000-0000-000000000001";

test("GET /v1/me/ingest : session requise, URLs d'envoi des relais actifs du compte", async () => {
  const { buildServer } = await import("../src/server.ts");
  const { loadConfig } = await import("../src/config.ts");
  const config = loadConfig({ RELAY_KEYS_SECRET: "k".repeat(64),
    CORE_API_TOKEN: "x".repeat(32), SUPABASE_URL: "https://x.supabase.co", SUPABASE_SECRET_KEY: "secretsecret",
    SLS_API_KEY: "slskeyslskey", RELAY_PUBLIC_HOST: "1.2.3.4",
  } as NodeJS.ProcessEnv);
  const base = { user_id: U, protocol: "srtla", server: "bhs1", play_id: "play_a", out_publish_id: "o", out_play_id: "op", mode: "direct", status: "offline", created_at: "", rotated_at: null, last_live_at: null, cam_key: null, record: false };
  const relays = [
    { ...base, id: "r1", name: "Principal", publish_id: "live_a", archived: false },
    { ...base, id: "r2", name: "Ancien", publish_id: "live_b", archived: true },
  ];
  const app = buildServer({
    config, health: { state: () => null }, samples: {}, sessions: {}, keys: {}, relays: { list: async () => relays },
    verifyUser: async (h?: string) => (h === "Bearer jwt_ok" ? U : null), previewPath: () => "", onKeysChanged: () => {}, slsHealthy: async () => true,
  } as unknown as Parameters<typeof buildServer>[0]);

  assert.equal((await app.inject({ method: "GET", url: "/v1/me/ingest" })).statusCode, 401);
  const ok = await app.inject({ method: "GET", url: "/v1/me/ingest", headers: { authorization: "Bearer jwt_ok" } });
  assert.equal(ok.statusCode, 200);
  const j = ok.json();
  assert.equal(j.relays.length, 1);
  assert.equal(j.relays[0].name, "Principal");
  assert.match(j.relays[0].urls.srt_url, /^srt:\/\/1\.2\.3\.4:\d+\?streamid=live_a$/);
  assert.match(j.relays[0].urls.srtla_url, /^srtla:\/\//);
  await app.close();
});
