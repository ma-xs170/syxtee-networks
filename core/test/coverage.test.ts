import assert from "node:assert/strict";
import { test } from "node:test";
import { cellToParent } from "h3-js";
import { aggregate, hourBucket, madFilter, reliability, wQuantile, type Measurement } from "../src/aggregate.ts";
import { brand } from "../src/asn.ts";
import { planBackfill, reclassify } from "../src/backfill.ts";
import { cellsOf, createCoverage, deviceHash, distance, lossPct, type CoverageDb, type MeasurementRow, type Point, type Prefs } from "../src/coverage.ts";
import { asnClass, classify, countsOnMap, createPrefixes, ipPrefix, netToken } from "../src/link.ts";

const U = "00000000-0000-0000-0000-000000000001";
const CELL = { link_type: "cellular" as const, conf: 0.95 };

function fakeDb(prefs: Prefs) {
  const rows: MeasurementRow[] = [];
  const contributions: { user_id: string; h3_index: string; n: number }[] = [];
  const db: CoverageDb = {
    prefs: async () => prefs,
    insertMeasurements: async (r) => void rows.push(...r),
    insertContributions: async (r) => void contributions.push(...r),
    purge: async () => {},
    measurements: async () => [],
    writeHexes: async () => {},
    erase: async (hashes) => {
      const before = rows.length;
      rows.splice(0, rows.length, ...rows.filter((r) => !hashes.includes(r.device_hash)));
      return before - rows.length;
    },
  };
  return { db, rows, contributions, prefs };
}

// Point à `m` mètres au nord de Pointe-à-Pitre, `s` secondes après le départ.
const P0 = { lat: 16.2411, lng: -61.5331 };
const pt = (m: number, s: number, extra: Partial<Point> = {}): Point => ({
  t: 1_000_000 + s * 1000,
  lat: P0.lat + m / 111_195,
  lng: P0.lng,
  acc: 10,
  up_kbps: 5000,
  rtt_ms: 60,
  loss_pct: 0,
  operator: "Digicel",
  link: CELL,
  ...extra,
});

// ─────────────── Collecte ───────────────

test("distance et pertes", () => {
  assert.ok(Math.abs(distance(P0, { lat: P0.lat + 1000 / 111_195, lng: P0.lng }) - 1000) < 2);
  assert.equal(lossPct(0, 5000, 2000), 0);
  assert.ok(lossPct(10, 5000, 2000) > 0 && lossPct(10, 5000, 2000) < 2);
});

test("sans consentement : rien n'est écrit, même si le point est valide", async () => {
  const { db, rows } = fakeDb({ consent: false, zones: [] });
  const c = createCoverage({ db, salt: "s" });
  for (let s = 0; s <= 200; s += 20) assert.equal(await c.add(U, "scan", pt(s * 5, s)), "no_consent");
  await c.flush();
  assert.equal(rows.length, 0);
});

test("consentement retiré entre la mesure et l'écriture : points jetés", async () => {
  const f = fakeDb({ consent: true, zones: [] });
  const c = createCoverage({ db: f.db, salt: "s" });
  for (let s = 0; s <= 200; s += 20) await c.add(U, "scan", pt(s * 5, s));
  assert.ok(c.pending() > 0);
  f.prefs.consent = false;
  await c.flush();
  assert.equal(f.rows.length, 0);
});

test("collecte mondiale : un point à Tokyo ou en mer est gardé, opérateur inconnu compris", async () => {
  const { db, rows } = fakeDb({ consent: true, zones: [] });
  const c = createCoverage({ db, salt: "s" });
  assert.equal(await c.add(U, "scan", { ...pt(0, 0), lat: 35.68, lng: 139.76, operator: "KDDI CORPORATION", asn: 2516 }), null);
  assert.equal(await c.add("autre", "scan", { ...pt(0, 0), lat: -20.9, lng: 55.5, operator: null }), null);
  await c.flush();
  assert.equal(rows.length, 2);
  assert.equal(rows[0].operator, "KDDI CORPORATION");
  assert.equal(rows[0].asn, 2516);
});

test("60 premières secondes : position exacte jamais écrite (centre de l'hexagone rés. 8), puis position fine", async () => {
  const { db, rows } = fakeDb({ consent: true, zones: [] });
  const c = createCoverage({ db, salt: "s" });
  for (let s = 0; s <= 120; s += 10) assert.equal(await c.add(U, "live", pt(s * 2, s)), null);
  await c.flush();
  const early = rows.filter((r) => Date.parse(r.ts) - 1_000_000 < 60_000);
  const late = rows.filter((r) => Date.parse(r.ts) - 1_000_000 >= 60_000);
  assert.equal(early.length, 6);
  assert.ok(early.every((r) => r.coarse && r.h3_9 === null && r.h3_10 === null));
  assert.ok(early.every((r) => r.lat === early[0].lat && r.lng === early[0].lng), "tous au même centre");
  assert.ok(early.every((r) => distance(r, P0) > 5), "jamais la position réelle");
  assert.ok(late.every((r) => !r.coarse && r.h3_10 && cellToParent(r.h3_10, 9) === r.h3_9 && cellToParent(r.h3_10, 8) === r.h3_8));
  assert.ok(rows.every((r) => !("user_id" in r)));
});

test("précision 20 m, vitesse et zones privées", async () => {
  const zone = { lat: P0.lat + 1000 / 111_195, lng: P0.lng, radius_m: 200 };
  const { db } = fakeDb({ consent: true, zones: [zone] });
  const c = createCoverage({ db, salt: "s" });
  assert.equal(await c.add(U, "scan", pt(0, 0, { acc: 25 })), "accuracy");
  assert.equal(await c.add(U, "scan", pt(0, 0, { acc: null })), "accuracy");
  assert.equal(await c.add(U, "scan", pt(0, 0, { acc: 20 })), null);
  assert.equal(await c.add(U, "scan", pt(5000, 10)), "speed"); // 5 km en 10 s
  assert.equal(await c.add(U, "scan", pt(1000, 100)), "private_zone");
  assert.equal(await c.add(U, "scan", pt(1500, 150)), null);
});

test("vitesse : au-delà de 30 km/h, point tagué « en mouvement »", async () => {
  const { db, rows } = fakeDb({ consent: true, zones: [] });
  const c = createCoverage({ db, salt: "s" });
  await c.add(U, "scan", pt(0, 0, { speed_kmh: 4 }));
  await c.add(U, "scan", pt(100, 100, { speed_kmh: 50 }));
  await c.add(U, "scan", pt(1100, 160)); // 1 km en 60 s = 60 km/h, calculé
  await c.flush();
  assert.deepEqual(rows.map((r) => r.moving), [false, true, true]);
});

test("Wi-Fi : mesure gardée à part, jamais de contribution ni d'hexagone à recalculer", async () => {
  const f = fakeDb({ consent: true, zones: [] });
  const c = createCoverage({ db: f.db, salt: "s" });
  for (let s = 0; s <= 300; s += 20) await c.add(U, "scan", pt(s * 5, s, { link: { link_type: "wifi", conf: 0.95 } }));
  await c.flush();
  assert.ok(f.rows.length > 0 && f.rows.every((r) => r.link_type === "wifi"));
  assert.equal(f.contributions.length, 0);
  for (let s = 400; s <= 700; s += 20) await c.add(U, "scan", pt(s * 5, s));
  await c.flush();
  assert.ok(f.contributions.length > 0);
  assert.ok(f.contributions.every((x) => x.n >= 1));
});

test("identifiant d'appareil : stable sur le mois, différent entre comptes et entre mois", () => {
  const t = Date.UTC(2026, 8, 27);
  assert.equal(deviceHash("s", U, t), deviceHash("s", U, t + 86_400_000));
  assert.notEqual(deviceHash("s", U, t), deviceHash("s", "autre", t));
  assert.notEqual(deviceHash("s", U, t), deviceHash("s", U, Date.UTC(2026, 9, 5)));
});

test("marques d'opérateur", () => {
  assert.equal(brand({ as_name: "Digicel Antilles Francaises Guyane SA", country_code: "GP" }), "Digicel");
  assert.equal(brand({ as_name: "Orange Caraibe", as_domain: "orange.fr", country_code: "MQ" }), "Orange Caraïbe");
  assert.equal(brand({ as_name: "Outremer Telecom", country_code: "GP" }), "SFR Caraïbe");
  assert.equal(brand({ as_name: "Free Mobile SAS", as_domain: "free.fr", country_code: "FR" }), "Free");
  assert.equal(brand({ as_name: "Telstra Limited", country_code: "AU" }), "Telstra Limited");
  assert.equal(brand(null), null);
});

test("droit à l'effacement : toutes les mesures du compte disparaissent", async () => {
  const { db, rows } = fakeDb({ consent: true, zones: [] });
  const c = createCoverage({ db, salt: "s", now: () => 1_000_000 + 400_000 });
  for (let s = 0; s <= 200; s += 20) await c.add(U, "scan", pt(s * 5, s));
  await c.flush();
  const n = rows.length;
  assert.ok(n > 0);
  assert.equal(await c.erase(U), n);
  assert.equal(rows.length, 0);
});

// ─────────────── Classement Wi-Fi / cellulaire ───────────────

test("classement : connection.type prioritaire", () => {
  assert.deepEqual(classify({ device: "cellular", asn: 12322 }), { link_type: "cellular", conf: 0.95 });
  assert.deepEqual(classify({ device: "wifi", asn: 51207 }), { link_type: "wifi", conf: 0.95 });
  assert.equal(classify({ device: "wifi", asn: 14593 }).link_type, "starlink");
});

test("classement : ASN (Starlink, box, mobile, mixte)", () => {
  assert.equal(classify({ asn: 14593 }).link_type, "starlink");
  assert.equal(classify({ asn: 12322 }).link_type, "fixed");
  assert.ok(countsOnMap(classify({ asn: 51207 })));
  const mixed = classify({ asn: 3215 });
  assert.equal(mixed.link_type, "unknown");
  assert.ok(!countsOnMap(mixed));
  assert.equal(asnClass(null, "Vodafone Mobile Operations"), "mobile");
  assert.equal(asnClass(null, "Example Fibre Networks"), "fixed");
  assert.equal(asnClass(null, "Digicel"), null);
});

test("classement : préfixes appris depuis les Android", () => {
  const learned = createPrefixes();
  const p = ipPrefix("203.0.113.57");
  assert.equal(p, "203.0.113.0/24");
  for (let i = 0; i < 4; i++) learned.learn(p, "cellular");
  learned.learn(p, "4g"); // valeur non reconnue : ignorée
  const c = classify({ asn: 3215, prefix: learned.get(p) });
  assert.equal(c.link_type, "cellular");
  assert.ok(c.conf >= 0.7);
  const q = ipPrefix("2001:db8:abcd:12::1");
  assert.equal(q, "2001:db8:abcd::/48");
  for (let i = 0; i < 5; i++) learned.learn(q, "wifi");
  assert.equal(classify({ asn: 3215, prefix: learned.get(q) }).link_type, "fixed");
  // Préfixe partagé (mi-mobile, mi-box) : inconnu.
  const r = ipPrefix("198.51.100.4");
  for (let i = 0; i < 3; i++) learned.learn(r, "wifi"), learned.learn(r, "cellular");
  assert.equal(classify({ asn: 3215, prefix: learned.get(r) }).link_type, "unknown");
  assert.equal(ipPrefix("192.168.1.2"), null);
  assert.equal(ipPrefix("::ffff:10.0.0.1"), null);
  assert.equal(ipPrefix("fe80::1"), null);
});

test("classement : iPhone, IP changée après « Coupe le Wi-Fi »", () => {
  assert.equal(classify({ asn: 3215, switched: true }).link_type, "cellular");
  assert.equal(classify({ asn: 12322, switched: true }).link_type, "fixed"); // l'ASN d'une box l'emporte
  assert.notEqual(netToken("s", "203.0.113.0/24"), netToken("s", "198.51.100.0/24"));
  assert.equal(netToken("s", null), "");
});

// ─────────────── Moteur de calcul (jeux simulés) ───────────────

const NOW = Date.UTC(2026, 8, 28, 12);
const cells = cellsOf(P0.lat, P0.lng);
function sim(n: number, o: Partial<Measurement> & { devices?: number; spreadDays?: number } = {}): Measurement[] {
  const { devices = 1, spreadDays = 0, ...rest } = o;
  return Array.from({ length: n }, (_, i) => ({
    ts: new Date(NOW - 3_600_000 - (spreadDays ? (i % (spreadDays + 1)) * 86_400_000 + (i % 4) * 6 * 3_600_000 : i * 60_000)).toISOString(),
    lng: P0.lng,
    accuracy_m: 8,
    ...cells,
    operator: "Digicel",
    tech: "4g",
    link_type: "cellular",
    link_conf: 0.95,
    up_kbps: 6000 + (i % 5) * 100,
    down_kbps: 20_000,
    rtt_ms: 50,
    loss_pct: 0,
    moving: false,
    device_hash: `dev${i % devices}`,
    ...rest,
  }));
}
const pick = (rows: ReturnType<typeof aggregate>, res = 9, mode = "all", operator = "*") =>
  rows.find((r) => r.res === res && r.mode === mode && r.operator === operator && r.layer === "cellular");

test("fiabilité : 1 contributeur = Estimation, publié dès 5 mesures", () => {
  assert.equal(pick(aggregate(sim(4), NOW))?.published, false);
  const r = pick(aggregate(sim(5), NOW))!;
  assert.equal(r.published, true);
  assert.equal(r.reliability, "estimation");
  assert.equal(r.contributors, 1);
  // Confidentialité : date arrondie au mois.
  assert.equal(r.last_ts, "2026-09-01T00:00:00.000Z");
  assert.equal(r.last_month, "2026-09");
});

test("fiabilité : 2-4 contributeurs ou 20+ mesures = Fiable ; 5+ ou 100+ sur plusieurs jours et horaires = Très fiable", () => {
  assert.equal(pick(aggregate(sim(6, { devices: 2 }), NOW))!.reliability, "fiable");
  assert.equal(pick(aggregate(sim(20), NOW))!.reliability, "fiable");
  assert.equal(pick(aggregate(sim(10, { devices: 5 }), NOW))!.reliability, "tres_fiable");
  assert.equal(pick(aggregate(sim(100, { spreadDays: 3 }), NOW))!.reliability, "tres_fiable");
  assert.equal(pick(aggregate(sim(100), NOW))!.reliability, "fiable"); // 100 mesures en une heure
  assert.equal(reliability(1, 100, 1, 1), "fiable");
  const two = pick(aggregate(sim(6, { devices: 2 }), NOW))!;
  assert.equal(two.last_ts, "2026-09-28T00:00:00.000Z"); // au jour près, jamais l'heure
});

test("Wi-Fi, box, inconnu et confiance < 0,7 : absents de la carte ; Starlink dans sa couche", () => {
  const rows = aggregate(
    [
      ...sim(10, { link_type: "wifi" }),
      ...sim(10, { link_type: "fixed" }),
      ...sim(10, { link_type: "unknown", link_conf: 0.4 }),
      ...sim(10, { link_type: "cellular", link_conf: 0.6 }),
      ...sim(6, { link_type: "starlink", operator: "Starlink", link_conf: 0.9 }),
    ],
    NOW,
  );
  assert.equal(rows.filter((r) => r.layer === "cellular").length, 0);
  const sl = rows.find((r) => r.layer === "starlink" && r.res === 9 && r.operator === "*" && r.mode === "all")!;
  assert.equal(sl.n, 6);
});

test("aberrations : médiane ± 3 MAD par hexagone et opérateur", () => {
  const data = [...sim(10), { ...sim(1)[0], up_kbps: 500_000 }, { ...sim(1)[0], up_kbps: 1 }];
  const r = pick(aggregate(data, NOW))!;
  assert.equal(r.n, 10);
  assert.ok(r.median_kbps! >= 6000 && r.median_kbps! <= 6400);
  // Un autre opérateur à 1 Mbit/s n'est pas une aberration de Digicel.
  const mixed = aggregate([...sim(10), ...sim(6, { operator: "Orange Caraïbe", up_kbps: 1000 })], NOW);
  assert.equal(pick(mixed)!.n, 16);
  assert.equal(pick(mixed, 9, "all", "Orange Caraïbe")!.median_kbps, 1000);
  assert.equal(madFilter([1, 2], (x) => x).length, 2);
});

test("pondération : les mesures fraîches et précises pèsent plus", () => {
  assert.equal(wQuantile([[1, 1], [10, 3]], 0.5), 10);
  assert.equal(wQuantile([[1, 3], [10, 1]], 0.5), 1);
  const old = sim(5, { up_kbps: 1000, ts: new Date(NOW - 80 * 86_400_000).toISOString(), device_hash: "a" });
  const fresh = sim(5, { up_kbps: 8000, device_hash: "b" });
  assert.equal(pick(aggregate([...old, ...fresh], NOW))!.median_kbps, 8000);
});

test("modes à pied / en véhicule", () => {
  const data = [...sim(6), ...sim(8, { moving: true, up_kbps: 1000, device_hash: "car" })];
  const rows = aggregate(data, NOW);
  assert.equal(pick(rows, 9, "vehicle")!.n, 8);
  assert.equal(pick(rows, 9, "vehicle")!.median_kbps, 1000);
  assert.ok(pick(rows, 9, "foot")!.median_kbps! >= 6000, "en mouvement : poids moindre à pied");
  assert.equal(pick(rows, 9, "all")!.median_kbps, 1000);
});

test("grille : rés. 8, 9 et 10 ; points des 60 premières secondes seulement en rés. 8", () => {
  const coarse = sim(6, { h3_9: null, h3_10: null, device_hash: "x" });
  const rows = aggregate([...sim(5), ...coarse], NOW);
  assert.equal(pick(rows, 8)!.n, 11);
  assert.equal(pick(rows, 9)!.n, 5);
  assert.equal(pick(rows, 10)!.n, 5);
  assert.equal(pick(rows, 10)!.h3_index, cells.h3_10);
});

test("précision GPS : au-delà de 20 m, hors calcul", () => {
  assert.equal(pick(aggregate(sim(6, { accuracy_m: 35 }), NOW)), undefined);
});

test("tranches horaires à l'heure locale (longitude)", () => {
  // 12 h UTC en Guadeloupe (−61,5°) ≈ 7 h 54 locale : matin.
  assert.equal(hourBucket("2026-09-28T12:00:00Z", -61.5), 0);
  assert.equal(hourBucket("2026-09-28T02:00:00Z", -61.5), 2); // ≈ 21 h 54 : soir
  assert.equal(hourBucket("2026-09-28T06:00:00Z", -61.5), 3); // ≈ 1 h 54 : nuit
  assert.equal(pick(aggregate(sim(100, { spreadDays: 3 }), NOW))!.hours.filter(Boolean).length > 1, true);
});

test("backfill : reclassement, contributions reconstruites, chiffres", () => {
  const u2 = "00000000-0000-0000-0000-000000000002";
  const ts = new Date(NOW - 86_400_000).toISOString();
  const base = { ts, lat: P0.lat, lng: P0.lng, accuracy_m: 10, up_kbps: 5000, device_hash: deviceHash("s", U, Date.parse(ts)) };
  const rows = [
    ...Array.from({ length: 6 }, (_, i) => ({ ...base, id: i, operator: "Free Mobile", link_type: "cell" })),
    { ...base, id: 10, operator: "Starlink", link_type: "cell" },
    { ...base, id: 11, operator: "Digicel", link_type: "cell" },
    { ...base, id: 12, operator: "Free Mobile", link_type: "cell", accuracy_m: 40 },
    { ...base, id: 13, operator: "Orange", link_type: "wifi", device_hash: deviceHash("s", u2, Date.parse(ts)) },
  ];
  const plan = planBackfill(rows, [U, u2], "s", NOW);
  assert.deepEqual(
    { ...plan.report },
    { total: 10, kept: 6, wifi: 1, starlink: 1, unknown: 1, imprecise: 1, hexes: 1 },
  );
  assert.equal(plan.updates.length, 10);
  assert.ok(plan.updates.every((u) => u.h3_10 && cellToParent(u.h3_10, 9) === u.h3_9));
  // Contributions : seulement le compte U, 6 mesures cellulaires précises (+ Starlink), jamais le Wi-Fi de u2.
  assert.ok(plan.contributions.every((c) => c.user_id === U));
  assert.equal(plan.contributions.reduce((a, c) => a + c.n, 0), 7);
  assert.equal(reclassify({ link_type: "cell", operator: null }).link_type, "unknown");
});

// ─────────────── Routes du mode Scan ───────────────

test("routes /v1/cam/scan : 3 micro-tests, médiane, Wi-Fi signalé, refus sans clé", async () => {
  const { buildServer } = await import("../src/server.ts");
  const { loadConfig } = await import("../src/config.ts");
  const config = loadConfig({ RELAY_KEYS_SECRET: "k".repeat(64),
    CORE_API_TOKEN: "x".repeat(32), SUPABASE_URL: "https://x.supabase.co", SUPABASE_SECRET_KEY: "secretsecret",
    SLS_API_KEY: "slskeyslskey", RELAY_PUBLIC_HOST: "1.2.3.4",
  } as NodeJS.ProcessEnv);
  const added: Point[] = [];
  const coverage = { add: async (_u: string, _s: string, p: Point) => (added.push(p), null), consent: async () => true, erase: async () => 0, setLink: () => {} };
  const cam = { lookup: async (k: string) => (k === "cam_ok" ? { user_id: U, cam_key: "cam_ok" } : null), whipUrl: () => "", authorize: async () => false };
  const app = buildServer({
    config, cam, coverage, asn: { operator: () => "Digicel", lookup: () => ({ operator: "Digicel", asn: 3215, asName: "Digicel" }) },
    prefixes: createPrefixes(),
    health: { state: () => null }, samples: {}, sessions: {}, keys: {}, relays: {},
    verifyUser: async () => null, previewPath: () => "", onKeysChanged: () => {}, slsHealthy: async () => true,
  } as unknown as Parameters<typeof buildServer>[0]);
  const auth = { authorization: "Bearer cam_ok" };
  const up = (i: number, size = 300_000, a = auth) =>
    app.inject({ method: "POST", url: `/v1/cam/scan/up?test=abcdef&i=${i}`, headers: { ...a, "content-type": "application/octet-stream" }, payload: Buffer.alloc(size) });

  assert.equal((await up(0, 300_000, { authorization: "Bearer nope" })).statusCode, 401);
  assert.equal((await up(0, 10)).statusCode, 400);
  for (const i of [0, 1, 2]) assert.equal((await up(i)).statusCode, 200);
  const down = await app.inject({ method: "GET", url: "/v1/cam/scan/down?ms=500&max=65536", headers: auth });
  assert.equal(down.statusCode, 200);
  assert.ok(down.rawPayload.length >= 65_536 && down.rawPayload.length < 200_000);

  const body = { test: "abcdef", lat: P0.lat, lng: P0.lng, acc: 8, ct: "cellular", down_kbps: [9000, 20000, 11000], rtt_ms: [40, 90, 42] };
  const ok = await app.inject({ method: "POST", url: "/v1/cam/scan", headers: auth, payload: body });
  assert.equal(ok.statusCode, 200, ok.body);
  const j = ok.json();
  assert.equal(j.counted, true);
  assert.equal(j.link_type, "cellular");
  assert.equal(j.down_kbps, 11000);
  assert.equal(j.rtt_ms, 42);
  assert.equal(added[0].acc, 8);
  assert.ok(added[0].up_kbps! > 0);

  // Même test rejoué : les envois ont été consommés.
  assert.equal((await app.inject({ method: "POST", url: "/v1/cam/scan", headers: auth, payload: body })).statusCode, 400);

  for (const i of [0, 1, 2]) await up(i);
  const wifi = (await app.inject({ method: "POST", url: "/v1/cam/scan", headers: auth, payload: { ...body, ct: "wifi" } })).json();
  assert.equal(wifi.counted, false);
  assert.equal(wifi.reason, "wifi");

  const cov = (await app.inject({ method: "GET", url: "/v1/cam/coverage", headers: auth })).json();
  assert.equal(cov.consent, true);
  assert.equal(cov.link_type, "unknown"); // ASN mixte, IP locale, pas de connection.type

  // iPhone : page ouverte en Wi-Fi (réseau A), Wi-Fi coupé (réseau B) : compté ; plus tard sur un autre Wi-Fi (C) : non compté.
  const from = (ip: string) => ({ ...auth, "x-forwarded-for": ip });
  const A = (await app.inject({ method: "GET", url: "/v1/cam/coverage", headers: from("203.0.113.5") })).json().net;
  const B = (await app.inject({ method: "GET", url: `/v1/cam/coverage?from=${A}`, headers: from("198.51.100.7") })).json();
  assert.equal(B.link_type, "cellular");
  const iphone = async (ip: string) => {
    for (const i of [0, 1, 2]) await app.inject({ method: "POST", url: `/v1/cam/scan/up?test=iphone1&i=${i}`, headers: { ...from(ip), "content-type": "application/octet-stream" }, payload: Buffer.alloc(300_000) });
    return (await app.inject({ method: "POST", url: "/v1/cam/scan", headers: from(ip), payload: { ...body, test: "iphone1", ct: null, from: A, cell: B.net } })).json();
  };
  assert.equal((await iphone("198.51.100.7")).counted, true);
  assert.equal((await iphone("192.0.2.9")).counted, false);
  assert.equal((await iphone("203.0.113.5")).counted, false);
  await app.close();
});
