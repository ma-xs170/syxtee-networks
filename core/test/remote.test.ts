import assert from "node:assert/strict";
import { createServer, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import { test } from "node:test";
import { WebSocket } from "ws";
import { ALLOWED, createRemote, hashToken, isDeviceToken, newDeviceToken, newPairCode } from "../src/remote.ts";
import { fakeDb } from "./fake-db.ts";

const U = "00000000-0000-4000-8000-000000000001";
const OTHER = "00000000-0000-4000-8000-000000000002";

function setup(allowed = new Set([U])) {
  const db = fakeDb({ link_devices: ["token_hash"] }, { link_devices: () => ({ id: crypto.randomUUID(), created_at: new Date().toISOString(), last_seen: null }) });
  const logs: string[] = [];
  const remote = createRemote({
    db: db as never,
    canUse: (id) => allowed.has(id),
    verifyUser: async (h) => (h === "Bearer jwt-u" ? U : h === "Bearer jwt-other" ? OTHER : null),
    log: (m) => logs.push(m),
  });
  const server: Server = createServer();
  server.on("upgrade", (req, socket, head) => {
    if (!remote.upgrade(req, socket, head)) socket.destroy();
  });
  return new Promise<{ remote: ReturnType<typeof createRemote>; port: number; db: ReturnType<typeof fakeDb>; logs: string[]; stop: () => void }>((res) =>
    server.listen(0, "127.0.0.1", () => res({ remote, db, logs, port: (server.address() as AddressInfo).port, stop: () => (remote.close(), server.close()) })),
  );
}

/** Client WebSocket qui range les messages reçus dans une file. */
function client(port: number, path: string) {
  const ws = new WebSocket(`ws://127.0.0.1:${port}${path}`);
  const inbox: any[] = []; // eslint-disable-line @typescript-eslint/no-explicit-any
  const waiters: ((m: unknown) => void)[] = [];
  ws.on("message", (raw) => {
    const m = JSON.parse(String(raw));
    const w = waiters.shift();
    if (w) w(m);
    else inbox.push(m);
  });
  const closed = new Promise<number>((r) => ws.on("close", (code) => r(code)));
  return {
    ws,
    closed,
    open: () => new Promise<void>((r, j) => (ws.once("open", () => r()), ws.once("error", j))),
    next: (): Promise<any> => new Promise((r) => (inbox.length ? r(inbox.shift()) : waiters.push(r))), // eslint-disable-line @typescript-eslint/no-explicit-any
    send: (m: unknown) => ws.send(JSON.stringify(m)),
  };
}

test("codes et jetons : formats", () => {
  assert.match(newPairCode(), /^[A-HJ-NP-Z2-9]{8}$/);
  const t = newDeviceToken();
  assert.ok(isDeviceToken(t));
  assert.ok(!isDeviceToken("slk_x") && !isDeviceToken(undefined));
  assert.equal(hashToken(t).length, 64);
});

test("liste blanche : ni commande arbitraire ni suppression", () => {
  for (const m of ["SetCurrentProgramScene", "StartRecord", "ToggleStream", "link.setBackup"]) assert.ok(ALLOWED.has(m), m);
  for (const m of ["RemoveScene", "RemoveInput", "CreateInput", "SetProfileParameter", "CallVendorRequest", "Sleep", "SetStreamServiceSettings", "OpenInputPropertiesDialog"]) assert.ok(!ALLOWED.has(m), m);
});

test("appairage : code à usage unique, jeton jamais stocké en clair, accès sur invitation", async () => {
  const { remote, db, stop } = await setup();
  assert.equal(remote.canUse(U), true);
  const { code } = remote.newCode(U);
  const bad = await remote.claim("1.1.1.1", "ZZZZZZZZ", "Mac", "darwin");
  assert.deepEqual(bad, { error: "invalid_code" });
  const ok = await remote.claim("1.1.1.1", code.toLowerCase().replace(/(....)/, "$1-"), "Mac de Mathis", "darwin");
  assert.ok("token" in ok && isDeviceToken(ok.token));
  // Code consommé.
  assert.deepEqual(await remote.claim("1.1.1.1", code, "x", "x"), { error: "invalid_code" });
  const row = db.rows("link_devices")[0];
  assert.equal(row.token_hash, hashToken("token" in ok ? ok.token : ""));
  assert.ok(!JSON.stringify(row).includes("token" in ok ? ok.token : "?"));
  assert.equal(row.user_id, U);
  // Compte non invité : pas de code utilisable.
  const { code: c2 } = remote.newCode(OTHER);
  assert.deepEqual(await remote.claim("2.2.2.2", c2, "x", "x"), { error: "invalid_code" });
  stop();
});

test("appairage : 10 essais ratés par minute et par IP", async () => {
  const { remote, stop } = await setup();
  for (let i = 0; i < 10; i++) assert.deepEqual(await remote.claim("9.9.9.9", "AAAAAAAA", "x", "x"), { error: "invalid_code" });
  const { code } = remote.newCode(U);
  assert.deepEqual(await remote.claim("9.9.9.9", code, "x", "x"), { error: "too_many" });
  stop();
});

test("agent, navigateur : ordres transmis, réponses routées, événements diffusés", async () => {
  const { remote, port, stop } = await setup();
  const { code } = remote.newCode(U);
  const claim = await remote.claim("1.1.1.1", code, "Mac", "darwin");
  assert.ok("token" in claim);
  const token = "token" in claim ? claim.token : "";

  const agent = client(port, "/v1/link/agent");
  await agent.open();
  agent.send({ type: "hello", token, name: "Mac de Mathis", platform: "darwin", version: "0.1.0" });
  assert.equal((await agent.next()).type, "ready");

  const rem = client(port, "/v1/link/remote");
  await rem.open();
  rem.send({ type: "hello", access: "jwt-u" });
  const ready = await rem.next();
  assert.equal(ready.type, "ready");
  assert.deepEqual(ready.agent, { online: true, name: "Mac de Mathis", platform: "darwin", version: "0.1.0" });
  assert.deepEqual(await agent.next(), { type: "viewers", n: 1 });

  // Ordre autorisé : transmis à l'agent, la réponse revient au bon navigateur avec son identifiant d'origine.
  rem.send({ type: "req", id: "a1", method: "SetCurrentProgramScene", params: { sceneName: "BRB" } });
  const req = await agent.next();
  assert.equal(req.type, "req");
  assert.equal(req.method, "SetCurrentProgramScene");
  assert.deepEqual(req.params, { sceneName: "BRB" });
  agent.send({ type: "res", id: req.id, ok: true, result: {} });
  assert.deepEqual(await rem.next(), { type: "res", id: "a1", ok: true, result: {} });

  // Méthode hors liste blanche : refusée par le Core, l'agent ne la voit jamais.
  rem.send({ type: "req", id: "a2", method: "RemoveScene", params: { sceneName: "BRB" } });
  assert.deepEqual(await rem.next(), { type: "res", id: "a2", ok: false, error: "method_not_allowed" });

  // Événement de l'agent diffusé au navigateur.
  agent.send({ type: "event", name: "CurrentProgramSceneChanged", data: { sceneName: "Live" } });
  assert.deepEqual(await rem.next(), { type: "event", name: "CurrentProgramSceneChanged", data: { sceneName: "Live" } });

  // L'agent part : le navigateur est prévenu, et une demande en attente échoue tout de suite.
  rem.send({ type: "req", id: "a3", method: "GetStats" });
  await agent.next();
  agent.ws.close();
  const a = [await rem.next(), await rem.next()];
  assert.ok(a.some((m) => m.type === "res" && m.id === "a3" && m.error === "agent_offline"));
  assert.ok(a.some((m) => m.type === "agent" && m.online === false));
  rem.send({ type: "req", id: "a4", method: "GetStats" });
  assert.deepEqual(await rem.next(), { type: "res", id: "a4", ok: false, error: "agent_offline" });
  rem.ws.close();
  stop();
});

test("connexions refusées : jeton inconnu, navigateur d'un autre compte non invité, pas de hello", async () => {
  const { remote, port, stop } = await setup();
  const a = client(port, "/v1/link/agent");
  await a.open();
  a.send({ type: "hello", token: `slk_${"0".repeat(48)}` });
  assert.equal(await a.closed, 4003);

  const r = client(port, "/v1/link/remote");
  await r.open();
  r.send({ type: "hello", access: "jwt-other" }); // compte valide mais sans invitation
  assert.equal(await r.closed, 4003);

  const r2 = client(port, "/v1/link/remote");
  await r2.open();
  r2.send({ type: "hello", access: "faux-jeton" });
  assert.equal(await r2.closed, 4003);

  const r3 = client(port, "/v1/link/remote");
  await r3.open();
  r3.send({ type: "ping" });
  assert.equal(await r3.closed, 4002);
  void remote;
  stop();
});

test("appareils : liste, révocation coupe l'agent, un autre compte ne peut pas révoquer", async () => {
  const { remote, port, stop } = await setup(new Set([U, OTHER]));
  const claim = await remote.claim("1.1.1.1", remote.newCode(U).code, "Mac", "darwin");
  const token = "token" in claim ? claim.token : "";
  const agent = client(port, "/v1/link/agent");
  await agent.open();
  agent.send({ type: "hello", token });
  await agent.next();
  const list = await remote.devices(U);
  assert.equal(list.length, 1);
  assert.equal(list[0].online, true);
  assert.equal(await remote.revoke(OTHER, list[0].id), false);
  assert.equal(await remote.revoke(U, list[0].id), true);
  assert.equal(await agent.closed, 4005);
  assert.equal((await remote.devices(U)).length, 0);
  stop();
});
