import assert from "node:assert/strict";
import { test } from "node:test";
import { cleanPermissions, firstAllowedHref, PERMISSION_KEYS, ROLE_META, ROLES, signatureOf, staffPresence } from "./staff.ts";

test("préréglages : chaque rôle n'accorde que des permissions connues, le support ne fait que le chat", () => {
  for (const r of [...ROLES, "owner" as const]) for (const p of ROLE_META[r].presets) assert.ok(PERMISSION_KEYS.includes(p), `${r} : ${p}`);
  assert.deepEqual([...ROLE_META.support.presets], ["support"]);
  assert.equal(ROLE_META.admin.presets.length, PERMISSION_KEYS.length);
  assert.ok(!ROLE_META.developer.presets.includes("revenue"), "le développeur ne voit pas les revenus");
});

test("permissions reçues d'un formulaire : valeurs inconnues et doublons écartés", () => {
  assert.deepEqual(cleanPermissions(["support", "support", "root", 3, "journal"]), ["support", "journal"]);
  assert.deepEqual(cleanPermissions("support"), []);
  assert.deepEqual(cleanPermissions(undefined), []);
});

test("signature : prénom puis équipe du rôle", () => {
  assert.equal(signatureOf("Mathis", "support"), "Mathis - Équipe Support");
  assert.equal(signatureOf("  Inès ", "developer"), "Inès - Équipe Développeur");
  assert.equal(signatureOf(null, "owner"), "L'équipe - Équipe SYXTEE");
});

test("présence : en ligne sous 2 min, absent sous 30 min, sinon hors ligne depuis…", () => {
  const now = Date.parse("2026-10-07T12:00:00Z");
  const at = (min: number) => new Date(now - min * 60_000).toISOString();
  assert.equal(staffPresence(at(1), now).state, "online");
  assert.equal(staffPresence(at(12), now).label, "Absent depuis 12 min");
  assert.equal(staffPresence(at(180), now).label, "Hors ligne depuis 3 h");
  assert.equal(staffPresence(at(3 * 1440), now).label, "Hors ligne depuis 3 j");
  assert.equal(staffPresence(null, now).label, "Jamais connecté");
});

test("première page ouverte : le support arrive sur le support, sans permission sur l'équipe", () => {
  assert.equal(firstAllowedHref(new Set(["support"])), "/admin/support");
  assert.equal(firstAllowedHref(new Set(["journal", "relays"])), "/admin/relais");
  assert.equal(firstAllowedHref(new Set()), "/admin/equipe");
});
