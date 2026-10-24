import assert from "node:assert/strict";
import { test } from "node:test";
import { TOKEN_RE, stability } from "./live-report.ts";

const flat = Array.from({ length: 40 }, () => 5000);

test("stabilité : direct trop court, pas de note", () => {
  assert.equal(stability({ duration_s: 90, avg_kbps: 5000, reconnects: 0, bitrate_series: flat }), null);
});

test("stabilité : flux régulier sans coupure = 100", () => {
  assert.deepEqual(stability({ duration_s: 3600, avg_kbps: 5000, reconnects: 0, bitrate_series: flat }), { score: 100, label: "Très stable" });
});

test("stabilité : coupures et creux baissent la note", () => {
  const dips = [...flat.slice(0, 30), ...Array.from({ length: 10 }, () => 500)]; // 25 % de creux
  const r = stability({ duration_s: 3600, avg_kbps: 4000, reconnects: 2, bitrate_series: dips });
  assert.ok(r);
  assert.equal(r.score, 100 - 16 - 20);
  assert.equal(r.label, "Correct");
});

test("stabilité : plafonds des pénalités, jamais sous 20", () => {
  const r = stability({ duration_s: 600, avg_kbps: 4000, reconnects: 50, bitrate_series: Array.from({ length: 40 }, () => 100) });
  assert.equal(r?.score, 20);
  assert.equal(r?.label, "Instable");
});

test("jeton de partage : 32 caractères URL-safe", () => {
  assert.ok(TOKEN_RE.test("abcDEF012345_-abcDEF012345_-abcD"));
  assert.ok(!TOKEN_RE.test("court"));
  assert.ok(!TOKEN_RE.test("../../etc/passwd/../../etc/passwd"));
});
