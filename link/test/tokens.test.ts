import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import { createServer } from "node:http";
import type { AddressInfo } from "node:net";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { defaults, load } from "../src/config.ts";
import { freshToken, refreshTokens, setTokens } from "../src/tokens.ts";

process.env.SYXTEE_LINK_HOME = mkdtempSync(join(tmpdir(), "link-tok-"));

function stub(handler: (body: { refresh?: string }) => { status: number; body: unknown }) {
  const server = createServer((req, res) => {
    let raw = "";
    req.on("data", (c) => (raw += c));
    req.on("end", () => {
      const r = handler(JSON.parse(raw || "{}"));
      res.writeHead(r.status, { "content-type": "application/json" }).end(JSON.stringify(r.body));
    });
  });
  return new Promise<{ core: string; stop: () => void }>((ok) => server.listen(0, "127.0.0.1", () => ok({ core: `http://127.0.0.1:${(server.address() as AddressInfo).port}`, stop: () => server.close() })));
}

test("jetons : le renouvellement remplace accès et refresh, écrits dans la config", async () => {
  let current = "slr_old"; // le Core ne connaît que le dernier jeton de renouvellement émis
  const s = await stub((b) => {
    if (b.refresh !== current) return { status: 401, body: { error: "invalid_token" } };
    current = "slr_new";
    return { status: 200, body: { token: "slk_new", refresh: "slr_new", expires_in: 3600 } };
  });
  const cfg = { ...defaults(), core: s.core };
  setTokens(cfg, { token: "slk_old", refresh: "slr_old", expires_in: 3600 });
  assert.ok(cfg.expires > Date.now());
  assert.equal(await refreshTokens(cfg), "ok");
  assert.deepEqual([cfg.token, cfg.refresh], ["slk_new", "slr_new"]);
  assert.equal(load().refresh, "slr_new");
  // Ancien refresh rejoué : le Core répond 401, l'appareil doit être reconnecté.
  cfg.refresh = "slr_old";
  assert.equal(await refreshTokens(cfg), "revoked");
  s.stop();
});

test("jetons : renouvelé seulement près de l'échéance, ancien jeton sans échéance laissé tel quel", async () => {
  let calls = 0;
  const s = await stub(() => (calls++, { status: 200, body: { token: "slk_b", refresh: "slr_b", expires_in: 3600 } }));
  const cfg = { ...defaults(), core: s.core };
  setTokens(cfg, { token: "slk_a", refresh: "slr_a", expires_in: 3600 });
  assert.equal(await freshToken(cfg), "slk_a");
  assert.equal(calls, 0);
  cfg.expires = Date.now() + 10_000; // moins d'une minute
  assert.equal(await freshToken(cfg), "slk_b");
  assert.equal(calls, 1);
  const legacy = { ...defaults(), core: s.core, token: "slk_legacy" };
  assert.equal(await freshToken(legacy), "slk_legacy");
  assert.equal(calls, 1);
  s.stop();
});

test("jetons : serveur injoignable = hors ligne, pas révoqué", async () => {
  const cfg = { ...defaults(), core: "http://127.0.0.1:1" };
  setTokens(cfg, { token: "slk_a", refresh: "slr_a", expires_in: 3600 });
  assert.equal(await refreshTokens(cfg), "offline");
  assert.equal(cfg.token, "slk_a");
});
