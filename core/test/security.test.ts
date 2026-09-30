import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { test } from "node:test";
import { newStreamIds } from "../src/ids.ts";
import { createSealer, hashKey, keyHashes } from "../src/keys.ts";
import { publisherVerdict } from "../src/plans.ts";
import { createRelayStore, ForbiddenError, type Relay } from "../src/relays.ts";
import { createRtmp } from "../src/rtmp.ts";
import { createSecurity, isInternal, keyHint, type Ban, type SecurityDb, type SecurityEvent } from "../src/security.ts";
import type { Sls } from "../src/sls.ts";
import { fakeDb, fakeSls } from "./fake-db.ts";

// Garanties de sécurité des relais (voir le rapport d'audit dans core/README.md, section Sécurité).

const U = "00000000-0000-4000-8000-000000000001";
const OTHER = "00000000-0000-4000-8000-000000000002";
const sealer = createSealer(randomBytes(32));
const UNIQUE = { relays: ["publish_hash", "play_hash", "out_publish_hash", "out_play_hash", "cam_hash"] };

function setup(plan = "beta") {
  let n = 0;
  const db = fakeDb(UNIQUE, {
    relays: () => ({ archived: false, mode: "direct", status: "offline", rotated_at: null, last_live_at: null, created_at: new Date(Date.UTC(2026, 0, 1, 0, 0, n++)).toISOString() }),
  });
  db.rows("profiles").push({ id: U, plan, suspended_at: null, username: "u" }, { id: OTHER, plan: "beta", suspended_at: null });
  const { sls, pairs } = fakeSls();
  const revoked: string[][] = [];
  const store = createRelayStore(db as never, sls as unknown as Sls, "nyc1", { sealer, onRevoked: (k) => revoked.push(k) });
  return { db, sls, pairs, revoked, store };
}

function memoryDb(): SecurityDb & { events: SecurityEvent[]; saved: Ban[] } {
  const events: SecurityEvent[] = [];
  const saved: Ban[] = [];
  return {
    events,
    saved,
    insert: async (rows) => void events.push(...rows),
    loadBans: async () => [],
    saveBan: async (b) => void saved.push(b),
    deleteBan: async () => {},
    recent: async () => events,
    alerts: async (u) => events.filter((e) => e.user_id === u && e.kind === "duplicate"),
    forget: async () => {},
  };
}

function security(o: { checkPublisher?: (r: Relay) => Promise<string | null>; now?: () => number } = {}) {
  const db = memoryDb();
  const guard = { kicks: [] as { ip: string; port: number }[][], bans: [] as string[], kick: async (t: { ip: string; port: number }[]) => void guard.kicks.push(t), ban: async (ip: string) => void guard.bans.push(ip), unban: async () => {} };
  const denied: string[] = [];
  const sec = createSecurity({ db, guard, log: () => {}, checkPublisher: o.checkPublisher ?? (async () => null), onDenied: (_r, why) => denied.push(why), now: o.now });
  return { sec, db, guard, denied };
}

// ───── Clés ─────

test("clés : publication et lecture distinctes, 128 bits aléatoires, aucune ne se déduit de l'autre", () => {
  const a = newStreamIds();
  const b = newStreamIds();
  assert.match(a.publish_id, /^live_[0-9a-f]{32}$/);
  assert.match(a.play_id, /^play_[0-9a-f]{32}$/);
  assert.notEqual(a.publish_id.slice(5), a.play_id.slice(5));
  assert.notEqual(a.publish_id, b.publish_id);
  assert.notEqual(a.play_id, b.play_id);
});

test("clés au repos : AES-256-GCM (aller-retour), modification ou autre secret → refus, empreintes SHA-256", () => {
  const ids = { ...newStreamIds(), cam_key: null };
  const sealed = sealer.seal(ids);
  assert.ok(!sealed.includes(ids.publish_id) && !sealed.includes(ids.play_id), "jamais en clair");
  assert.deepEqual(sealer.open(sealed), ids);
  const parts = sealed.split(".");
  parts[2] = Buffer.from("x".repeat(20)).toString("base64url");
  assert.throws(() => sealer.open(parts.join(".")));
  assert.throws(() => createSealer(randomBytes(32)).open(sealed));
  assert.equal(keyHashes(ids).publish_hash, hashKey(ids.publish_id));
  assert.match(keyHashes(ids).play_hash, /^[0-9a-f]{64}$/);
});

test("base : aucune clé en clair, empreintes UNIQUE, nouvelle génération en cas de collision", async () => {
  const { db, store } = setup();
  const r = await store.create(U, { name: "iPhone", protocol: "srtla", limit: 3 });
  const row = db.rows("relays")[0];
  for (const k of [r.publish_id, r.play_id, r.out_publish_id, r.out_play_id]) assert.ok(!JSON.stringify(row).includes(k.split("_").at(-1)!), "clé absente de la ligne");
  assert.equal(row.publish_hash, hashKey(r.publish_id));
  // Collision forcée : la 1re génération reprend les clés du relais existant (UNIQUE → 23505), la 2e passe.
  const { sls } = fakeSls();
  const queue = [{ ...r }, newStreamIds()];
  const store2 = createRelayStore(db as never, sls as unknown as Sls, "nyc1", { sealer, newIds: () => queue.shift()! });
  const r2 = await store2.create(OTHER, { name: "Osmo", protocol: "rtmp", limit: 3 });
  assert.notEqual(r2.publish_id, r.publish_id);
  assert.equal(db.rows("relays").length, 2);
  assert.equal(queue.length, 0, "2 générations");
  assert.equal((await sls.listStreamIds()).length, 2, "paires de la tentative ratée retirées du SLS");
});

// ───── Vérification serveur ─────

test("Clé inventée → refusée (RTMP par le Core ; SRT/SRTLA : seul le SLS réaligné connaît les clés autorisées)", async () => {
  const { store, pairs } = setup();
  const r = await store.create(U, { name: "iPhone", protocol: "srtla", limit: 3 });
  const { relays } = await store.reconcile();
  assert.deepEqual([...pairs.keys()].sort(), [r.out_play_id, r.play_id].sort());
  assert.equal(relays.length, 1);
  // Paire SYXTEE inconnue de la base (ex. ancienne clé) : retirée du SLS.
  pairs.set("play_fantome", { publisher: "live_fantome", player: "play_fantome", description: `syxtee:${U}:x` });
  await store.reconcile();
  assert.ok(!pairs.has("play_fantome"));

  const { sec, db } = security();
  const rtmp = createRtmp({ apiUrl: "http://mtx", rtspUrl: "rtsp://x", output: () => "", log: () => {}, security: sec, fetchImpl: (async () => new Response("{}")) as never });
  assert.equal(await rtmp.authorize({ action: "publish", protocol: "rtmp", path: `live/live_${"9".repeat(32)}`, ip: "203.0.113.5" }), false);
  await sec.flush();
  assert.equal(db.events[0].kind, "refused");
  assert.equal(db.events[0].detail.key, "live_9999…", "la clé tentée n'est jamais journalisée en entier");
});

test("Clé de lecture sur l'entrée publish → refusée", async () => {
  const { store } = setup();
  const r = await store.create(U, { name: "Osmo", protocol: "rtmp", limit: 3 });
  const { relays } = await store.reconcile();
  const { sec, db } = security();
  sec.setRelays(relays);
  const rtmp = createRtmp({ apiUrl: "http://mtx", rtspUrl: "rtsp://x", output: () => "", log: () => {}, security: sec, fetchImpl: (async () => new Response("{}")) as never });
  rtmp.setKeys(relays);
  assert.equal(await rtmp.authorize({ action: "publish", protocol: "rtmp", path: `live/${r.play_id}`, ip: "203.0.113.5" }), false);
  assert.equal(await rtmp.authorize({ action: "publish", protocol: "rtmp", path: `live/${r.publish_id}`, ip: "203.0.113.5" }), true);
  // Même chose côté SRT : le SLS refuse, le journal rattache la tentative au relais.
  await sec.handleSls([{ kind: "refused", ip: "198.51.100.7", port: 4242, role: "publisher", key: r.play_id }]);
  await sec.flush();
  assert.equal(db.events.at(-1)!.relay_id, r.id);
  assert.equal(db.events.at(-1)!.detail.role, "publisher");
});

test("2e publisher → refusé, propriétaire alerté (IP / pays), une alerte par relais toutes les 10 min", async () => {
  const { store } = setup();
  const r = await store.create(U, { name: "Osmo", protocol: "rtmp", limit: 3 });
  const { relays } = await store.reconcile();
  let t = 1_000_000;
  const { sec, db } = security({ now: () => t });
  sec.setRelays(relays);
  const paths = { items: [{ name: `live/${r.publish_id}`, ready: true }] };
  const conns = { items: [{ id: "c1", path: `live/${r.publish_id}`, state: "publish", remoteAddr: "203.0.113.5:50000" }] };
  const fetchImpl = (async (url: string) => new Response(JSON.stringify(String(url).includes("rtmpconns") ? conns : paths))) as never;
  const rtmp = createRtmp({ apiUrl: "http://mtx", rtspUrl: "rtsp://x", output: () => "", log: () => {}, security: sec, fetchImpl });
  rtmp.setKeys(relays);
  await rtmp.sync();
  assert.equal(await rtmp.authorize({ action: "publish", protocol: "rtmp", path: `live/${r.publish_id}`, ip: "198.51.100.9" }), false);
  rtmp.stopAll();
  // SRT : le SLS refuse le 2e appareil (journal), même règle d'alerte.
  await sec.handleSls([{ kind: "publisher", ip: "203.0.113.5", port: 1000, key: r.publish_id }]);
  await sec.handleSls([{ kind: "duplicate", ip: "198.51.100.10", port: 2000, key: r.publish_id }]);
  t += 11 * 60_000;
  await sec.handleSls([{ kind: "duplicate", ip: "198.51.100.11", port: 2001, key: r.publish_id }]);
  await sec.flush();
  const alerts = await sec.alerts(U);
  assert.equal(alerts.length, 2, "1re tentative RTMP + 1 alerte 11 min plus tard (celle du milieu est regroupée)");
  assert.equal(alerts[0].ip, "198.51.100.9");
  // Reconnexion du même appareil (même IP) : pas d'alerte.
  const quiet = security();
  quiet.sec.setRelays(relays);
  await quiet.sec.handleSls([{ kind: "publisher", ip: "203.0.113.5", port: 1000, key: r.publish_id }, { kind: "duplicate", ip: "203.0.113.5", port: 1001, key: r.publish_id }]);
  await quiet.sec.flush();
  assert.equal((await quiet.sec.alerts(U)).length, 0);
});

test("Clé régénérée → l'ancienne est retirée du SLS, ses sessions sont coupées, elle est refusée ensuite", async () => {
  const { store, pairs, revoked } = setup();
  const r = await store.create(U, { name: "iPhone", protocol: "rtmp", limit: 3 });
  const { relays } = await store.reconcile();
  const { sec, guard } = security();
  sec.setRelays(relays);
  await sec.handleSls([
    { kind: "publisher", ip: "203.0.113.5", port: 40000, key: r.publish_id },
    { kind: "publisher_ptr", key: r.publish_id, ptr: "0x1" },
    { kind: "player", ip: "198.51.100.2", port: 41000, key: r.publish_id, ptr: "0x2" },
  ]);
  const fresh = await store.rotate(r);
  assert.notEqual(fresh.publish_id, r.publish_id);
  assert.ok(!pairs.has(r.play_id) && pairs.has(fresh.play_id), "ancienne paire retirée, nouvelle déclarée");
  assert.deepEqual(revoked.at(-1), [r.publish_id, r.out_publish_id]);
  assert.equal(await sec.kickKeys(revoked.at(-1)!), 2);
  assert.deepEqual(guard.kicks[0], [{ ip: "203.0.113.5", port: 40000 }, { ip: "198.51.100.2", port: 41000 }]);
  // RTMP : l'ancienne clé est refusée, et un publieur encore connecté avec elle est coupé (API MediaMTX).
  const kicked: string[] = [];
  const fetchImpl = (async (url: string, init?: RequestInit) => {
    if (init?.method === "POST") return kicked.push(String(url)), new Response("{}");
    if (String(url).includes("rtmpconns/list")) return new Response(JSON.stringify({ items: [{ id: "old", path: `live/${r.publish_id}`, state: "publish" }] }));
    if (String(url).includes("paths/list")) return new Response(JSON.stringify({ items: [{ name: `live/${r.publish_id}`, ready: true }] }));
    return new Response(JSON.stringify({ items: [] }));
  }) as never;
  const rtmp = createRtmp({ apiUrl: "http://mtx", rtspUrl: "rtsp://x", output: () => "", log: () => {}, security: sec, fetchImpl });
  rtmp.setKeys((await store.reconcile()).relays);
  assert.equal(await rtmp.authorize({ action: "publish", protocol: "rtmp", path: `live/${r.publish_id}`, ip: "203.0.113.5" }), false);
  await rtmp.sync();
  assert.deepEqual(kicked, ["http://mtx/v3/rtmpconns/kick/old"]);
});

test("Compte gratuit → refusé : aucune création, paires retirées du SLS, publieur coupé", async () => {
  const { db, store, pairs } = setup("free");
  await assert.rejects(store.create(U, { name: "iPhone", protocol: "srtla", limit: 3 }), ForbiddenError);
  // Compte passé en gratuit (ou suspendu) alors qu'il avait un relais : retiré au prochain alignement.
  db.rows("profiles")[0].plan = "beta";
  const r = await store.create(U, { name: "iPhone", protocol: "srtla", limit: 3 });
  assert.ok(pairs.has(r.play_id));
  db.rows("profiles")[0].plan = "free";
  const { relays } = await store.reconcile();
  assert.equal(relays.length, 0);
  assert.ok(!pairs.has(r.play_id));
  db.rows("profiles")[0].plan = "beta";
  db.rows("profiles")[0].suspended_at = new Date().toISOString();
  assert.equal((await store.reconcile()).relays.length, 0);
  await assert.rejects(store.create(U, { name: "iPad", protocol: "srtla", limit: 3 }), ForbiddenError);
});

test("vérification à la connexion : formule, suspension, quota de relais, flux simultanés", async () => {
  const rel = (id: string, created_at: string, archived = false) => ({ id, created_at, archived });
  const three = [rel("a", "1"), rel("b", "2"), rel("c", "3"), rel("d", "4")];
  assert.equal(publisherVerdict({ plan: "beta", suspended: false }, three, "a", 0), null);
  assert.equal(publisherVerdict({ plan: "beta", suspended: false }, three, "d", 0), "quota", "4e relais au-delà de la bêta (3)");
  assert.equal(publisherVerdict({ plan: "beta", suspended: false }, three, "c", 3), "streams");
  // Formule échue (plan_until passé) : traitée en Gratuit, même avant la tâche quotidienne.
  assert.equal(publisherVerdict({ plan: "partner", suspended: false, until: "2020-01-01T00:00:00Z" }, three, "a", 0), "plan");
  assert.equal(publisherVerdict({ plan: "partner", suspended: false, until: "2999-01-01T00:00:00Z" }, three, "a", 0), null);
  assert.equal(publisherVerdict({ plan: "free", suspended: false }, three, "a", 0), "plan");
  assert.equal(publisherVerdict({ plan: "free", suspended: false }, three, "a", 0), "plan");
  assert.equal(publisherVerdict({ plan: "beta", suspended: true }, three, "a", 0), "suspended");
  assert.equal(publisherVerdict({ plan: "inconnue", suspended: false }, three, "a", 0), "plan", "formule inconnue = aucun droit");
  assert.equal(publisherVerdict(null, three, "a", 0), "account");
  assert.equal(publisherVerdict({ plan: "admin", suspended: false }, three, "d", 10), null);

  const { store } = setup();
  const r = await store.create(U, { name: "iPhone", protocol: "srtla", limit: 3 });
  const { relays } = await store.reconcile();
  const { sec, guard, denied } = security({ checkPublisher: async () => "plan" });
  sec.setRelays(relays);
  await sec.handleSls([{ kind: "publisher", ip: "203.0.113.5", port: 40000, key: r.publish_id }]);
  assert.deepEqual(guard.kicks[0], [{ ip: "203.0.113.5", port: 40000 }]);
  assert.deepEqual(denied, ["plan"]);
});

// ───── Force brute ─────

test("force brute : 10 refus en 1 min → IP bannie 15 min ; IP internes jamais bannies ; IP bannie refusée en RTMP", async () => {
  let t = 0;
  const { sec, guard, db } = security({ now: () => t });
  for (let i = 0; i < 9; i++) sec.refused({ protocol: "srt", ip: "203.0.113.66", key: `live_${i}` });
  assert.equal(sec.isBanned("203.0.113.66"), false);
  t += 61_000; // fenêtre glissante : les anciens refus ne comptent plus
  for (let i = 0; i < 9; i++) sec.refused({ protocol: "srt", ip: "203.0.113.66", key: `live_${i}` });
  assert.equal(sec.isBanned("203.0.113.66"), false);
  sec.refused({ protocol: "srt", ip: "203.0.113.66", key: "live_x" });
  await new Promise((r) => setImmediate(r));
  assert.equal(sec.isBanned("203.0.113.66"), true);
  assert.deepEqual(guard.bans, ["203.0.113.66"]);
  assert.equal(Date.parse(db.saved[0].until) - t, 15 * 60_000);
  for (let i = 0; i < 30; i++) sec.refused({ protocol: "srtla", ip: "127.0.0.1", key: "live_x" });
  for (let i = 0; i < 30; i++) sec.refused({ protocol: "srt", ip: "172.18.0.1", key: "live_x" });
  assert.equal(sec.isBanned("127.0.0.1") || sec.isBanned("172.18.0.1"), false);
  await assert.rejects(sec.ban("127.0.0.1", 5, "test", false));
  const rtmp = createRtmp({ apiUrl: "http://mtx", rtspUrl: "rtsp://x", output: () => "", log: () => {}, security: sec, fetchImpl: (async () => new Response("{}")) as never });
  assert.equal(await rtmp.authorize({ action: "publish", protocol: "rtmp", path: `live/live_${"a".repeat(32)}`, ip: "203.0.113.66" }), false);
  t += 15 * 60_000 + 1;
  assert.equal(sec.isBanned("203.0.113.66"), false, "levé après 15 min");
});

test("utilitaires : adresses internes, aperçu de clé", () => {
  assert.ok(isInternal("127.0.0.1") && isInternal("172.18.0.1") && isInternal("::1") && isInternal("10.0.0.3"));
  assert.ok(!isInternal("203.0.113.5") && !isInternal("2001:db8::1"));
  assert.ok(isInternal("147.182.220.5", ["147.182.220.5"]));
  assert.equal(keyHint(`live_${"a".repeat(32)}`), "live_aaaa…");
  assert.equal(keyHint(""), "(vide)");
});
