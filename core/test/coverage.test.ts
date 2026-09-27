import assert from "node:assert/strict";
import { test } from "node:test";
import { brand } from "../src/asn.ts";
import { createCoverage, deviceHash, distance, lossPct, type CoverageDb, type MeasurementRow, type Point, type Prefs } from "../src/coverage.ts";

const U = "00000000-0000-0000-0000-000000000001";

function fakeDb(prefs: Prefs) {
  const rows: MeasurementRow[] = [];
  const contributions: unknown[] = [];
  const db: CoverageDb = {
    prefs: async () => prefs,
    insertMeasurements: async (r) => void rows.push(...r),
    insertContributions: async (r) => void contributions.push(...r),
    aggregate: async () => null,
    erase: async (hashes) => {
      const before = rows.length;
      rows.splice(0, rows.length, ...rows.filter((r) => !hashes.includes(r.device_hash)));
      return before - rows.length;
    },
  };
  return { db, rows, contributions, prefs };
}

// Point à `m` mètres au nord de Pointe-à-Pitre, `s` secondes après le départ (≈ 36 km/h si m = 10·s).
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
  ...extra,
});

test("distance et pertes", () => {
  assert.ok(Math.abs(distance(P0, { lat: P0.lat + 1000 / 111_195, lng: P0.lng }) - 1000) < 2);
  assert.equal(lossPct(0, 5000, 2000), 0);
  assert.ok(lossPct(10, 5000, 2000) > 0 && lossPct(10, 5000, 2000) < 2);
});

test("sans consentement : rien n'est écrit, même si le point est valide", async () => {
  const { db, rows } = fakeDb({ consent: false, zones: [] });
  const c = createCoverage({ db, salt: "s" });
  for (let m = 0; m <= 2000; m += 50) assert.equal(await c.add(U, "scan", pt(m, m / 10)), "no_consent");
  await c.flush();
  assert.equal(rows.length, 0);
});

test("consentement retiré entre la mesure et l'écriture : points jetés", async () => {
  const f = fakeDb({ consent: true, zones: [] });
  const c = createCoverage({ db: f.db, salt: "s" });
  for (let m = 0; m <= 2000; m += 50) await c.add(U, "scan", pt(m, m / 10));
  assert.ok(c.pending() > 0);
  f.prefs.consent = false;
  await c.flush();
  assert.equal(f.rows.length, 0);
});

test("les 300 premiers et 300 derniers mètres ne sont jamais écrits", async () => {
  const { db, rows } = fakeDb({ consent: true, zones: [] });
  const c = createCoverage({ db, salt: "s" });
  for (let m = 0; m <= 2000; m += 50) await c.add(U, "live", pt(m, m / 10));
  c.end(U, "live");
  await c.flush();
  assert.ok(rows.length > 0);
  const dist = rows.map((r) => distance(P0, { lat: r.lat, lng: r.lng }));
  assert.ok(Math.min(...dist) >= 299, `premier point à ${Math.min(...dist)} m`);
  assert.ok(Math.max(...dist) <= 2000 - 299, `dernier point à ${Math.max(...dist)} m`);
  assert.ok(rows.every((r) => r.h3_index.length === 15 && r.source === "live"));
  assert.ok(rows.every((r) => !("user_id" in r)));
});

test("précision, vitesse et zones privées", async () => {
  const zone = { lat: P0.lat + 1000 / 111_195, lng: P0.lng, radius_m: 200 };
  const { db } = fakeDb({ consent: true, zones: [zone] });
  const c = createCoverage({ db, salt: "s" });
  assert.equal(await c.add(U, "scan", pt(0, 0, { acc: 80 })), "accuracy");
  assert.equal(await c.add(U, "scan", pt(0, 0, { acc: null })), "accuracy");
  assert.equal(await c.add(U, "scan", pt(0, 0)), "trim");
  assert.equal(await c.add(U, "scan", pt(5000, 10)), "speed"); // 5 km en 10 s
  assert.equal(await c.add(U, "scan", pt(1000, 100)), "private_zone");
  assert.equal(await c.add(U, "scan", pt(1500, 150)), null);
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
  assert.equal(brand(null), null);
});

test("droit à l'effacement : toutes les mesures du compte disparaissent", async () => {
  const { db, rows } = fakeDb({ consent: true, zones: [] });
  const c = createCoverage({ db, salt: "s", now: () => 1_000_000 + 400_000 });
  for (let m = 0; m <= 2000; m += 50) await c.add(U, "scan", pt(m, m / 10));
  c.end(U, "scan");
  await c.flush();
  assert.ok(rows.length > 0);
  const n = rows.length;
  assert.equal(await c.erase(U), n);
  assert.equal(rows.length, 0);
});

test("route /v1/cam/scan : mesure le débit, garde le point, refuse sans clé", async () => {
  const { buildServer } = await import("../src/server.ts");
  const { loadConfig } = await import("../src/config.ts");
  const config = loadConfig({
    CORE_API_TOKEN: "x".repeat(32), SUPABASE_URL: "https://x.supabase.co", SUPABASE_SECRET_KEY: "secretsecret",
    SLS_API_KEY: "slskeyslskey", RELAY_PUBLIC_HOST: "1.2.3.4",
  } as NodeJS.ProcessEnv);
  const added: Point[] = [];
  const coverage = { add: async (_u: string, _s: string, p: Point) => (added.push(p), null), consent: async () => true, erase: async () => 0 };
  const cam = { lookup: async (k: string) => (k === "cam_ok" ? { user_id: U, cam_key: "cam_ok" } : null), whipUrl: () => "", authorize: async () => false };
  const app = buildServer({
    config, cam, coverage, asn: { operator: () => "Digicel" },
    health: { state: () => null }, samples: {}, sessions: {}, keys: {},
    verifyUser: async () => null, previewPath: () => "", onKeysChanged: () => {}, slsHealthy: async () => true,
  } as unknown as Parameters<typeof buildServer>[0]);
  const payload = Buffer.alloc(300_000);
  const url = `/v1/cam/scan?lat=${P0.lat}&lng=${P0.lng}&acc=8&rtt=42`;
  const bad = await app.inject({ method: "POST", url, headers: { authorization: "Bearer nope", "content-type": "application/octet-stream" }, payload });
  assert.equal(bad.statusCode, 401);
  const ok = await app.inject({ method: "POST", url, headers: { authorization: "Bearer cam_ok", "content-type": "application/octet-stream" }, payload });
  assert.equal(ok.statusCode, 200, ok.body);
  const j = ok.json();
  assert.equal(j.accepted, true);
  assert.equal(j.operator, "Digicel");
  assert.equal(j.bytes, 300_000);
  assert.equal(added[0].rtt_ms, 42);
  assert.equal(added[0].acc, 8);
  const small = await app.inject({ method: "POST", url, headers: { authorization: "Bearer cam_ok", "content-type": "application/octet-stream" }, payload: Buffer.alloc(10) });
  assert.equal(small.statusCode, 400);
  await app.close();
});
