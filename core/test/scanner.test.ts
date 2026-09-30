import assert from "node:assert/strict";
import { test } from "node:test";
import { brand } from "../src/asn.ts";
import { inferAsns, planBackfill, type RawRow } from "../src/backfill.ts";
import { deviceHash } from "../src/coverage.ts";
import { brandKey, classify, countsOnMap, declaredName, isCaribbean } from "../src/link.ts";
import { reclassOne, type PendingItem } from "../src/pending.ts";
import { createPrivateRelay, parseEgress } from "../src/privaterelay.ts";

// Correctif « réseau inconnu » : ASN des Antilles-Guyane, Relais privé iCloud, opérateur déclaré, file d'attente, backfill v3.

test("Orange Caraïbe (AS16028) en 4G : compté sur la carte", () => {
  const c = classify({ asn: 16028, asName: "Orange Caraibe", operator: "Orange Caraïbe" });
  assert.deepEqual(c, { link_type: "cellular", conf: 0.85 });
  assert.ok(countsOnMap(c));
  assert.deepEqual(classify({ asn: 16028, operator: "Orange Caraïbe", declared: "orange" }), { link_type: "cellular", conf: 0.9, tags: ["declared"] });
});

test("reconnaissance de la marque par le nom", () => {
  assert.equal(brandKey("Orange Caraibe"), "orange");
  assert.equal(brandKey("Orange Caraîbe Mobiles Network"), "orange");
  assert.equal(brandKey("DIGICEL ANTILLES FRANCAISES GUYANE SA"), "digicel");
  assert.equal(brandKey("Outremer Telecom SAS"), "sfr");
  assert.equal(brandKey("FreeCaraibe Free SAS"), "free");
  assert.equal(brandKey("Dauphin Telecom"), "dauphin");
  assert.equal(brandKey("United Telecommunication Services (UTS)"), "uts");
  assert.equal(brandKey("Comcast"), null);
  assert.equal(brand({ as_name: "Outremer Telecom SAS", country_code: "MQ" }), "SFR Caraïbe");
  assert.equal(brand({ as_name: "FreeCaraibe Free SAS", country_code: "FR" }), "Free Caraïbe");
  assert.equal(brand({ as_name: "Orange S.A.", country_code: "GP" }), "Orange Caraïbe");
  assert.equal(brand({ as_name: "Digicel Antilles Francaises Guyane", country_code: "GF" }), "Digicel");
});

test("ASN mixte : déclaration cohérente → mobile, autre marque → box (Wi-Fi), sans déclaration → inconnu", () => {
  const digicel = { asn: 48252, asName: "DIGICEL ANTILLES FRANCAISES GUYANE SA", operator: "Digicel" };
  assert.deepEqual(classify(digicel), { link_type: "unknown", conf: 0.4 });
  assert.deepEqual(classify({ ...digicel, declared: "digicel" }), { link_type: "cellular", conf: 0.9, tags: ["declared"] });
  assert.deepEqual(classify({ ...digicel, declared: "orange" }), { link_type: "fixed", conf: 0.8, tags: ["declared_mismatch"] });
  // Préfixe appris (Android) prioritaire sur la déclaration.
  assert.equal(classify({ ...digicel, declared: "digicel", prefix: { cellular: 0, wifi: 5 } }).link_type, "fixed");
  // « Autre » ne tranche rien.
  assert.equal(classify({ ...digicel, declared: "other" }).link_type, "unknown");
});

test("box fibre (ASN fixe) : Wi-Fi même avec une déclaration", () => {
  assert.equal(classify({ asn: 21351, asName: "Canal + Telecom", declared: "orange" }).link_type, "fixed");
  assert.equal(classify({ asn: 12322, declared: "free" }).link_type, "fixed");
});

test("ASN inconnu : l'opérateur déclaré compte avec 0,75", () => {
  assert.deepEqual(classify({ asn: 64500, asName: "Some Carrier" }), { link_type: "unknown", conf: 0.2 });
  const c = classify({ asn: 64500, asName: "Some Carrier", declared: "sfr" });
  assert.deepEqual(c, { link_type: "cellular", conf: 0.75, tags: ["declared"] });
  assert.ok(countsOnMap(c));
});

test("Relais privé iCloud : jamais rejeté en silence, compté seulement avec une déclaration", () => {
  assert.deepEqual(classify({ relay: true }), { link_type: "unknown", conf: 0.2, tags: ["private_relay"] });
  assert.deepEqual(classify({ asn: 13335 }), { link_type: "unknown", conf: 0.2, tags: ["private_relay"] }); // Cloudflare
  assert.deepEqual(classify({ asn: 36183, declared: "digicel" }), { link_type: "cellular", conf: 0.75, tags: ["private_relay", "declared"] });
  // Le téléphone qui dit lui-même « wifi » l'emporte.
  assert.equal(classify({ relay: true, device: "wifi", declared: "orange" }).link_type, "wifi");
});

test("base IPinfo absente : en attente, pas « inconnu » définitif", () => {
  assert.deepEqual(classify({ pending: true, declared: "orange" }), { link_type: "unknown", conf: 0.2, tags: ["pending"] });
});

test("nom de la marque déclarée, Antilles-Guyane", () => {
  assert.ok(isCaribbean(16.24, -61.53)); // Pointe-à-Pitre
  assert.ok(isCaribbean(14.6, -61.07)); // Fort-de-France
  assert.ok(isCaribbean(4.93, -52.33)); // Cayenne
  assert.ok(isCaribbean(18.07, -63.08)); // Marigot
  assert.ok(!isCaribbean(48.85, 2.35));
  assert.equal(declaredName("orange", true), "Orange Caraïbe");
  assert.equal(declaredName("free", false), "Free");
  assert.equal(declaredName("digicel", true), "Digicel");
  assert.equal(declaredName("other", true), null);
});

test("liste des sorties du Relais privé : fusion et recherche", () => {
  const csv = "172.224.226.0/27,GB,GB-EN,London,\n172.224.226.32/31,GB,GB-SC,Aberdeen,\n2a02:26f7:b3c0:4000::/64,FR,FR-IDF,Paris,\n\n";
  const r = parseEgress(csv);
  assert.equal(r.v4.length, 1); // deux blocs contigus fusionnés
  assert.equal(r.v6.length, 1);
  const relay = createPrivateRelay({ file: "/nonexistent/egress.csv", log: () => {} });
  assert.equal(relay.has("172.224.226.5"), false); // liste pas encore chargée
});

test("liste des sorties du Relais privé : téléchargement et recherche", async () => {
  const csv = Array.from({ length: 120 }, (_, i) => `10.${i * 2}.0.0/16,US,US-CA,X,`).join("\n") + "\n172.224.226.0/27,GB,GB-EN,London,\n2a02:26f7:b3c0:4000::/64,FR,FR-IDF,Paris,\n";
  const file = `${process.env.TMPDIR ?? "/tmp"}/egress-test-${process.pid}.csv`;
  const relay = createPrivateRelay({ file, log: () => {}, fetchImpl: (async () => new Response(csv)) as unknown as typeof fetch });
  await relay.refresh();
  assert.ok(relay.ready());
  assert.ok(relay.has("172.224.226.31"));
  assert.ok(relay.has("::ffff:172.224.226.1"));
  assert.ok(!relay.has("172.224.226.32"));
  assert.ok(relay.has("2a02:26f7:b3c0:4000::1234"));
  assert.ok(!relay.has("2a02:26f7:b3c0:4001::1"));
  assert.ok(!relay.has("81.52.214.10")); // Orange Caraïbe
});

test("file d'attente : reclassée quand la base revient, déclarée au bout de 14 jours", () => {
  const now = Date.parse("2026-09-29T12:00:00Z");
  const item: PendingItem = {
    measurement_id: 1,
    user_id: "u",
    ip: "81.52.214.10",
    ctx: { declared: "orange", ct: null, switched: false, caribbean: true },
    created_at: new Date(now - 3_600_000).toISOString(),
    m: { ts: "2026-09-29T11:00:00Z", h3_8: "x", h3_9: "y", accuracy_m: 10 },
  };
  const down = { ready: () => false, lookup: () => ({ operator: null, asn: null, asName: null, failed: true }) };
  const up = { ready: () => true, lookup: () => ({ operator: "Orange Caraïbe", asn: 16028, asName: "Orange Caraibe" }) };
  assert.equal(reclassOne(item, down, undefined, undefined, now), null);
  assert.deepEqual(reclassOne(item, up, undefined, undefined, now), {
    id: 1,
    operator: "Orange Caraïbe",
    asn: 16028,
    link_type: "cellular",
    link_conf: 0.9,
    tags: ["declared"],
  });
  const old = { ...item, created_at: new Date(now - 15 * 86_400_000).toISOString() };
  assert.deepEqual(reclassOne(old, down, undefined, undefined, now), {
    id: 1,
    operator: "Orange Caraïbe",
    asn: null,
    link_type: "cellular",
    link_conf: 0.75,
    tags: ["declared"],
  });
});

test("backfill v3 : AS16028 compté, ASN déduit du même appareil, raisons des inconnues", () => {
  const U = "00000000-0000-0000-0000-000000000001";
  const NOW = Date.parse("2026-09-30T00:00:00Z");
  const ts = "2026-09-29T15:00:00Z";
  const h = deviceHash("s", U, Date.parse(ts));
  const base = { ts, lat: 16.2411, lng: -61.5331, accuracy_m: 8, up_kbps: 4000, link_type: "unknown", link_conf: 0.2, coarse: false, device_hash: h, operator: "Orange Caraïbe" };
  const rows: RawRow[] = [
    ...Array.from({ length: 5 }, (_, i) => ({ ...base, id: i, asn: 16028 })),
    { ...base, id: 10, asn: null }, // ASN non enregistré : déduit (même appareil, même opérateur)
    { ...base, id: 11, asn: 48252, operator: "Digicel", device_hash: "autre" }, // mixte, sans déclaration
    { ...base, id: 12, asn: 13335, operator: "Cloudflare, Inc.", device_hash: "autre" }, // Relais privé
    { ...base, id: 13, asn: null, operator: "Inconnu SA", device_hash: "autre" },
  ];
  assert.equal(inferAsns(rows).get(10), 16028);
  const plan = planBackfill(rows, [U], "s", NOW);
  assert.equal(plan.report.unknown_to_cellular, 6);
  assert.equal(plan.report.kept, 6);
  assert.deepEqual(plan.report.unknown_why, { mixed_asn_no_declaration: 1, private_relay: 1, no_asn: 1 });
  assert.deepEqual(plan.report.operators, { "Orange Caraïbe": 6 });
  const u10 = plan.updates.find((u) => u.id === 10)!;
  assert.equal(u10.asn, 16028);
  assert.deepEqual(u10.tags, ["asn_inferred"]);
  assert.equal(plan.updates.find((u) => u.id === 12)!.operator, null);
  // Avec la déclaration « Digicel » du compte, la mesure mixte passe en 4G/5G.
  const withDecl = planBackfill(rows.map((r) => ({ ...r, device_hash: h })), [U], "s", NOW, new Map([[U, "digicel" as const]]));
  assert.equal(withDecl.updates.find((u) => u.id === 11)!.link_type, "cellular");
  assert.equal(withDecl.updates.find((u) => u.id === 12)!.operator, "Digicel");
});
