import assert from "node:assert/strict";
import { test } from "node:test";
import { BackupWatcher } from "../src/backup.ts";

const beau = (n: number) => `${n}`.padEnd(3000, "x");

// Régression : retour manuel sur Live pendant le secours alors que le flux revient lentement. Les compteurs d'image figée du secours
// ne doivent pas rebasculer aussitôt sur « Connexion perdue ».
function rig() {
  const o = { scene: "Live", img: beau(0), switches: [] as string[] };
  const req = async (t: string, d?: Record<string, unknown>) => {
    if (t === "GetSourceScreenshot") return { imageData: o.img };
    if (t === "GetCurrentProgramScene") return { currentProgramSceneName: o.scene };
    if (t === "SetCurrentProgramScene") {
      o.scene = String(d?.sceneName);
      o.switches.push(o.scene);
    }
    return {};
  };
  const w = new BackupWatcher(req);
  w.setLive("Live");
  w.set({ enabled: true, source: "CAM", scene: "BRB", freezeSeconds: 4, recoverSeconds: 2, trigger: "cut" });
  return { o, w };
}

test("retour manuel sur Live pendant le secours : pas de yoyo tant que le flux n'est pas revenu", async () => {
  const { o, w } = rig();
  for (let i = 1; i <= 3; i++) {
    o.img = beau(i);
    await w.tick();
  }
  // Le flux se fige : secours.
  for (let i = 0; i < 6; i++) await w.tick();
  assert.equal(w.state, "backup");
  // L'utilisateur clique Live ; la vignette met quelques secondes à repartir.
  o.scene = "Live";
  for (let i = 0; i < 3; i++) await w.tick();
  assert.equal(o.scene, "Live", "ne doit pas rebasculer sur le secours dans la grâce");
  o.img = beau(99);
  await w.tick();
  o.img = beau(100);
  await w.tick();
  assert.equal(o.scene, "Live");
});

test("serveur : flux hors ligne = coupure détectée, flux en ligne = retour du secours même sans vignette", async () => {
  const { o, w } = rig();
  for (let i = 1; i <= 3; i++) {
    o.img = beau(i);
    w.setRelayLive(true);
    await w.tick();
  }
  // L'image continue de bouger (dernière image qui boucle) mais le serveur dit hors ligne.
  w.setRelayLive(false);
  for (let i = 10; i < 16; i++) {
    o.img = beau(i);
    await w.tick();
  }
  assert.equal(w.state, "backup");
  // En secours, la source n'est pas rendue (vignette figée) mais le serveur dit en ligne.
  w.setRelayLive(true);
  for (let i = 0; i < 3; i++) await w.tick();
  assert.equal(o.scene, "Live");
});
