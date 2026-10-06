import assert from "node:assert/strict";
import { createServer, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import { test } from "node:test";
import { WebSocket } from "ws";
import { ALLOWED, createRemote, hashToken, isDeviceToken, isRefreshToken, newDeviceToken, newPairCode } from "../src/remote.ts";
import { fakeDb } from "./fake-db.ts";

const U = "00000000-0000-4000-8000-000000000001";
const OTHER = "00000000-0000-4000-8000-000000000002";

function setup(allowed = new Set([U])) {
  const db = fakeDb({ link_devices: ["token_hash", "refresh_hash"] }, { link_devices: () => ({ id: crypto.randomUUID(), created_at: new Date().toISOString(), last_seen: null }) });
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
  assert.equal(ready.agent.online, true);
  assert.equal(ready.agent.name, "Mac de Mathis");
  assert.equal(ready.agent.version, "0.1.0");
  assert.equal((await rem.next()).type, "instances");
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
  const a = [await rem.next(), await rem.next(), await rem.next()];
  assert.ok(a.some((m) => m.type === "res" && m.id === "a3" && m.error === "agent_offline"));
  assert.ok(a.some((m) => m.type === "agent" && m.online === false));
  assert.ok(a.some((m) => m.type === "instances" && m.online.length === 0));
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

// ───── Lot 1 : registre, jetons courts + refresh, audit, limites ─────
type Setup = Awaited<ReturnType<typeof setup>>;
async function pair(s: Setup, name = "Mac", user = U) {
  const r = await s.remote.claim("1.1.1.1", s.remote.newCode(user).code, name, "darwin");
  assert.ok("token" in r);
  return r as Extract<typeof r, { token: string }>;
}
async function connectAgent(s: Setup, token: string, extra: Record<string, unknown> = {}) {
  const a = client(s.port, "/v1/link/agent");
  await a.open();
  a.send({ type: "hello", token, ...extra });
  return a;
}
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

test("jetons : accès court + renouvellement, seules les empreintes sont stockées", async () => {
  const s = await setup();
  const t = await pair(s);
  assert.ok(isDeviceToken(t.token) && isRefreshToken(t.refresh));
  assert.equal(t.expires_in, 3600);
  const row = s.db.rows("link_devices")[0];
  assert.equal(row.refresh_hash, hashToken(t.refresh));
  assert.ok(Date.parse(row.token_expires_at as string) > Date.now() && Date.parse(row.token_expires_at as string) <= Date.now() + 3_600_000);
  assert.ok(!JSON.stringify(row).includes(t.token) && !JSON.stringify(row).includes(t.refresh));
  s.stop();
});

test("renouvellement : l'ancien jeton de renouvellement meurt, l'ancien accès aussi", async () => {
  const s = await setup();
  const t = await pair(s);
  const n = await s.remote.refresh("1.1.1.1", t.refresh);
  assert.ok("token" in n && n.token !== t.token && n.refresh !== t.refresh && n.device_id === t.device_id);
  // Rejouer l'ancien jeton de renouvellement : refusé.
  assert.deepEqual(await s.remote.refresh("1.1.1.1", t.refresh), { error: "invalid_token" });
  // L'ancien jeton d'accès ne connecte plus ; le nouveau, si.
  const old = await connectAgent(s, t.token);
  assert.equal(await old.closed, 4003);
  const fresh = await connectAgent(s, "token" in n ? n.token : "");
  assert.equal((await fresh.next()).type, "ready");
  fresh.ws.close();
  // Format invalide ou inconnu.
  assert.deepEqual(await s.remote.refresh("1.1.1.1", "slr_x"), { error: "invalid_token" });
  assert.deepEqual(await s.remote.refresh("1.1.1.1", `slr_${"a".repeat(48)}`), { error: "invalid_token" });
  s.stop();
});

test("jeton d'accès périmé : refusé à la connexion, un renouvellement le remplace", async () => {
  const s = await setup();
  const t = await pair(s);
  s.db.rows("link_devices")[0].token_expires_at = new Date(Date.now() - 1000).toISOString();
  const a = await connectAgent(s, t.token);
  assert.equal(await a.closed, 4003);
  const n = await s.remote.refresh("1.1.1.1", t.refresh);
  assert.ok("token" in n);
  const b = await connectAgent(s, "token" in n ? n.token : "");
  assert.equal((await b.next()).type, "ready");
  b.ws.close();
  s.stop();
});

test("jeton de renouvellement périmé : refusé", async () => {
  const s = await setup();
  const t = await pair(s);
  s.db.rows("link_devices")[0].refresh_expires_at = new Date(Date.now() - 1000).toISOString();
  assert.deepEqual(await s.remote.refresh("1.1.1.1", t.refresh), { error: "invalid_token" });
  s.stop();
});

test("session d'agent : se ferme à l'échéance du jeton, sauf `reauth` avec un jeton renouvelé", async () => {
  const s = await setup();
  const t = await pair(s);
  s.db.rows("link_devices")[0].token_expires_at = new Date(Date.now() + 400).toISOString();
  const a = await connectAgent(s, t.token);
  assert.equal((await a.next()).type, "ready");
  assert.equal(await a.closed, 4006); // pas de reauth : coupé

  const t2 = await pair(s, "Mac 2");
  s.db.rows("link_devices")[1].token_expires_at = new Date(Date.now() + 400).toISOString();
  const b = await connectAgent(s, t2.token);
  assert.equal((await b.next()).type, "ready");
  const n = await s.remote.refresh("1.1.1.1", t2.refresh);
  b.send({ type: "reauth", token: "token" in n ? n.token : "" });
  await sleep(800);
  assert.equal(b.ws.readyState, WebSocket.OPEN);
  b.ws.close();
  s.stop();
});

test("révocation : sockets coupés tout de suite, plus de connexion ni de renouvellement", async () => {
  const s = await setup();
  const t = await pair(s);
  const a = await connectAgent(s, t.token);
  await a.next();
  const rem = client(s.port, "/v1/link/remote");
  await rem.open();
  rem.send({ type: "hello", access: "jwt-u" });
  assert.equal((await rem.next()).agent.online, true);
  assert.equal(await s.remote.revoke(U, t.device_id), true);
  assert.equal(await a.closed, 4005);
  assert.deepEqual(await s.remote.refresh("1.1.1.1", t.refresh), { error: "invalid_token" });
  const again = await connectAgent(s, t.token);
  assert.equal(await again.closed, 4003);
  assert.equal(await s.remote.revoke(U, t.device_id), false); // déjà révoqué
  assert.equal((await s.remote.devices(U)).length, 0);
  assert.ok(s.db.rows("link_audit").some((r) => r.method === "device.revoke"));
  rem.ws.close();
  s.stop();
});

test("audit : actions et refus écrits, lectures non, jamais de réglage ni de clé", async () => {
  const s = await setup();
  const t = await pair(s);
  const a = await connectAgent(s, t.token);
  await a.next();
  const rem = client(s.port, "/v1/link/remote");
  await rem.open();
  rem.send({ type: "hello", access: "jwt-u" });
  await rem.next();
  await rem.next();
  await a.next(); // viewers

  rem.send({ type: "req", id: "1", method: "GetStats" }); // lecture
  agentReply(a, { ok: true });
  assert.equal((await rem.next()).ok, true);
  rem.send({ type: "req", id: "2", method: "SetCurrentProgramScene", params: { sceneName: "BRB", secret: "slk_nope", streamKey: "live_123" } });
  agentReply(a, { ok: true });
  assert.equal((await rem.next()).ok, true);
  rem.send({ type: "req", id: "3", method: "StartStream" });
  agentReply(a, { ok: false });
  assert.equal((await rem.next()).ok, false);
  rem.send({ type: "req", id: "4", method: "SetStreamServiceSettings", params: { key: "live_123" } });
  assert.equal((await rem.next()).error, "method_not_allowed");

  const rows = s.db.rows("link_audit");
  assert.deepEqual(rows.map((r) => [r.method, r.ok]), [["SetCurrentProgramScene", true], ["StartStream", false], ["SetStreamServiceSettings", false]]);
  assert.equal(rows[0].detail, "sceneName=BRB");
  assert.equal(rows[0].device_id, t.device_id);
  assert.equal(rows[0].user_id, U);
  assert.ok(!JSON.stringify(rows).includes("live_123") && !JSON.stringify(rows).includes("slk_nope"));
  assert.equal(rows[2].error, "not_allowed");
  assert.equal((await s.remote.auditLog(U)).length, 3);
  assert.equal((await s.remote.auditLog(OTHER)).length, 0);
  rem.ws.close();
  a.ws.close();
  s.stop();
});

/** Répond à la prochaine demande reçue par l'agent. */
function agentReply(a: ReturnType<typeof client>, r: { ok: boolean }) {
  void a.next().then((req) => req.type === "req" && a.send({ type: "res", id: req.id, ok: r.ok, result: {} }));
}

test("plafond d'actions : 60 par 10 s et par appareil, refus audité une fois", async () => {
  const s = await setup();
  const t = await pair(s);
  const a = await connectAgent(s, t.token);
  await a.next();
  const rem = client(s.port, "/v1/link/remote");
  await rem.open();
  rem.send({ type: "hello", access: "jwt-u" });
  await rem.next();
  await rem.next();
  for (let i = 0; i < 63; i++) rem.send({ type: "req", id: `r${i}`, method: "SetInputMute", params: { inputName: "Mic", inputMuted: true } });
  for (let i = 0; i < 3; i++) assert.deepEqual(await rem.next(), { type: "res", id: `r${60 + i}`, ok: false, error: "rate_limited" });
  assert.equal(s.db.rows("link_audit").filter((r) => r.error === "rate_limited").length, 1);
  // Les lectures ne comptent pas dans ce plafond.
  rem.send({ type: "req", id: "g", method: "GetStats" });
  await sleep(50);
  rem.ws.close();
  a.ws.close();
  s.stop();
});

test("clés de stream : aucune méthode ne les lit ni ne les écrit", () => {
  for (const m of ["GetStreamServiceSettings", "SetStreamServiceSettings", "GetProfileParameter", "GetPersistentData", "GetInputSettings", "GetOutputSettings", "GetOutputList", "GetStreamStatusSettings"]) assert.ok(!ALLOWED.has(m), m);
  assert.ok([...ALLOWED].every((m) => !/StreamService|InputSettings|OutputSettings|Parameter|Persistent|StreamKey/i.test(m)));
});

test("plusieurs postes : registre, choix du poste, événements routés, révocation isolée", async () => {
  const s = await setup();
  const t1 = await pair(s, "Mac");
  const t2 = await pair(s, "PC");
  const a1 = await connectAgent(s, t1.token, { name: "Mac", version: "0.2.0", os: "macOS 15", host: "mac.local" });
  await a1.next();
  await sleep(5);
  const a2 = await connectAgent(s, t2.token, { name: "PC", version: "0.2.0", os: "Windows 11", host: "pc.local" });
  await a2.next();
  const list = await s.remote.devices(U);
  assert.equal(list.length, 2);
  assert.ok(list.every((d) => d.online && d.online_since));
  assert.equal(list.find((d) => d.name === "Mac")?.plugin_version, "0.2.0");
  assert.equal(list.find((d) => d.name === "Mac")?.os, "macOS 15");
  assert.ok(list.every((d) => !("token_hash" in d) && !("refresh_hash" in d) && !("user_id" in d)));

  const rem = client(s.port, "/v1/link/remote"); // par défaut : le dernier connecté
  await rem.open();
  rem.send({ type: "hello", access: "jwt-u" });
  assert.equal((await rem.next()).agent.name, "PC");
  assert.equal((await rem.next()).online.length, 2);
  rem.send({ type: "select", device: t1.device_id });
  assert.equal((await rem.next()).name, "Mac");
  // Les ordres vont au Mac, pas au PC.
  rem.send({ type: "req", id: "x", method: "GetStats" });
  let got = await a1.next();
  while (got.type === "viewers") got = await a1.next(); // le Mac reçoit des « viewers » avant l'ordre
  assert.equal(got.method, "GetStats");
  // Événement du PC : non transmis au navigateur qui pilote le Mac.
  a2.send({ type: "event", name: "Ignoré", data: {} });
  a1.send({ type: "event", name: "Reçu", data: {} });
  assert.equal((await rem.next()).name, "Reçu");
  // Renommer, puis révoquer le Mac : le PC reste connecté.
  assert.equal(await s.remote.rename(U, t1.device_id, "Mac studio"), true);
  assert.equal(await s.remote.rename(OTHER, t1.device_id, "Pirate"), false);
  assert.equal(await s.remote.revoke(U, t1.device_id), true);
  assert.equal(await a1.closed, 4005);
  assert.equal(a2.ws.readyState, WebSocket.OPEN);
  assert.equal((await s.remote.devices(U)).length, 1);
  rem.ws.close();
  a2.ws.close();
  s.stop();
});

test("hors ligne : déconnexion enregistrée dans le registre", async () => {
  const s = await setup();
  const t = await pair(s);
  const a = await connectAgent(s, t.token, { version: "0.3.0" });
  await a.next();
  assert.ok(s.db.rows("link_devices")[0].online_since);
  a.ws.close();
  await sleep(50);
  const d = (await s.remote.devices(U))[0];
  assert.equal(d.online, false);
  assert.equal(d.online_since, null);
  assert.ok(s.db.rows("link_devices")[0].last_seen);
  s.stop();
});

test("appairage par appareil : poste affiché, refus possible, jetons donnés une fois", async () => {
  const s = await setup();
  const st = s.remote.deviceStart("3.3.3.3", "Mac de Mathis", "darwin", "macOS 15.1", "0.2.0");
  assert.ok("user_code" in st);
  const code = "user_code" in st ? st.user_code : "";
  const info = s.remote.deviceLookup(code);
  assert.equal(info?.os, "macOS 15.1");
  assert.equal(info?.version, "0.2.0");
  assert.ok(info?.scopes.includes("obs.control"));
  assert.equal(s.remote.deviceDeny(OTHER, code), false); // compte non invité
  assert.equal(s.remote.deviceDeny(U, code), true);
  assert.equal(s.remote.deviceLookup(code), null);
  assert.equal(s.remote.deviceApprove(U, code), null);
  assert.deepEqual(await s.remote.devicePoll("device_code" in st ? st.device_code : ""), { status: "denied" });
  assert.deepEqual(await s.remote.devicePoll("device_code" in st ? st.device_code : ""), { status: "expired" });

  const st2 = s.remote.deviceStart("3.3.3.3", "PC", "win32", "Windows 11", "0.2.0");
  assert.ok("device_code" in st2);
  assert.ok(s.remote.deviceApprove(U, "user_code" in st2 ? st2.user_code : ""));
  const p = await s.remote.devicePoll("device_code" in st2 ? st2.device_code : "");
  assert.ok(p.status === "approved" && isDeviceToken(p.token) && isRefreshToken(p.refresh));
  const row = s.db.rows("link_devices")[0];
  assert.equal(row.os, "Windows 11");
  assert.equal(row.plugin_version, "0.2.0");
  assert.ok((row.scopes as string[]).includes("backups"));
  assert.equal(row.org_id, undefined); // colonne réservée, jamais renseignée
  assert.deepEqual(await s.remote.devicePoll("device_code" in st2 ? st2.device_code : ""), { status: "expired" });
  s.stop();
});
