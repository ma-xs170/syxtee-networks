import assert from "node:assert/strict";
import { test } from "node:test";
import { gateRegie, regieOf } from "../src/plans.ts";

const full = {
  liveScene: "Live",
  autoEnabled: true,
  droneScene: "Drone",
  autoRules: [{ source: "CAM2", scene: "Plan 2" }],
  audioEnabled: true,
  audioSource: "Micro",
  directorEnabled: true,
  directorKey: "sk-ant-x",
  directorRules: "montre l'action",
  directorCams: Array.from({ length: 6 }, (_, i) => ({ source: `S${i}`, scene: `C${i}`, label: `L${i}` })),
};

test("Essentiel : ni prises ni régie IA, mais secours et garde audio intacts", () => {
  const p = gateRegie("basic", full);
  assert.equal(p.autoEnabled, false);
  assert.equal("autoRules" in p, false);
  assert.equal(p.directorEnabled, false);
  assert.equal("directorCams" in p, false);
  assert.equal("directorKey" in p, false);
  assert.equal(p.audioEnabled, true);
  assert.equal(p.liveScene, "Live");
  assert.equal(p.droneScene, "Drone");
});

test("Signature : prises permises, régie IA limitée à 3 caméras", () => {
  const p = gateRegie("paid", full);
  assert.equal(p.autoEnabled, true);
  assert.deepEqual(p.autoRules, full.autoRules);
  assert.equal(p.directorEnabled, true);
  assert.equal((p.directorCams as unknown[]).length, 3);
});

test("Prestige, partenaire et admin : 6 caméras ; Gratuit, inconnu, absent : rien", () => {
  for (const plan of ["extra", "partner", "admin"]) assert.equal((gateRegie(plan, full).directorCams as unknown[]).length, 6);
  for (const plan of ["free", "n'importe quoi", null, undefined]) {
    const p = gateRegie(plan, full);
    assert.equal(p.autoEnabled, false);
    assert.equal(p.directorEnabled, false);
    assert.equal("directorCams" in p, false);
  }
  assert.deepEqual(regieOf("beta"), { prises: true, cams: 3 });
});

test("gateRegie : entrée illisible, objet d'origine intact", () => {
  assert.deepEqual(gateRegie("paid", null), {});
  assert.deepEqual(gateRegie("paid", "x"), {});
  const before = JSON.stringify(full);
  gateRegie("basic", full);
  assert.equal(JSON.stringify(full), before);
});

test("gateRegie : une mise à jour sans les champs de régie ne les ajoute pas", () => {
  const p = gateRegie("basic", { enabled: true });
  assert.deepEqual(p, { enabled: true });
});
