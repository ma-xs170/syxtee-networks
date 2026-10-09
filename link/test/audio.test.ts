import assert from "node:assert/strict";
import { test } from "node:test";
import { AudioGuard, cleanAudio, DEFAULT_AUDIO } from "../src/audio.ts";

function fake(scene = "Live") {
  const o = { scene, muted: false, unmuted: 0 };
  const req = async (t: string, d?: Record<string, unknown>) => {
    if (t === "GetCurrentProgramScene") return { currentProgramSceneName: o.scene };
    if (t === "GetInputMute") return { inputMuted: o.muted };
    if (t === "SetCurrentProgramScene") o.scene = String(d?.sceneName);
    if (t === "SetInputMute") {
      o.muted = !!d?.inputMuted;
      o.unmuted++;
    }
    return {};
  };
  return { o, req };
}

test("audio : silence prolongé sur la scène Live = alerte, le son revenu l'efface", async () => {
  const { req } = fake();
  const g = new AudioGuard(req);
  g.setLive("Live");
  g.set({ enabled: true, source: "Micro", seconds: 10, unmute: false, backup: false });
  await g.tick(1000);
  assert.equal(g.state, "ok");
  g.feed("Micro", 0.2, 5000);
  await g.tick(14000);
  assert.equal(g.state, "ok");
  await g.tick(15500);
  assert.equal(g.state, "silent");
  g.feed("Micro", 0.2, 16000);
  await g.tick(16500);
  assert.equal(g.state, "ok");
});

test("audio : hors scène Live, rien n'est surveillé", async () => {
  const { o, req } = fake("Pause");
  const g = new AudioGuard(req);
  g.setLive("Live");
  g.set({ enabled: true, source: "Micro", seconds: 3, unmute: false, backup: false });
  await g.tick(1000);
  await g.tick(60000);
  assert.equal(g.state, "idle");
  o.scene = "Live";
  await g.tick(61000);
  assert.equal(g.state, "ok");
});

test("audio : micro coupé = alerte, ou remis tout seul avec l'option", async () => {
  const a = fake();
  a.o.muted = true;
  const g = new AudioGuard(a.req);
  g.setLive("Live");
  g.set({ enabled: true, source: "Micro", seconds: 10, unmute: false, backup: false });
  await g.tick(1000);
  assert.equal(g.state, "muted");
  assert.equal(a.o.unmuted, 0);
  g.set({ enabled: true, source: "Micro", seconds: 10, unmute: true, backup: false });
  await g.tick(2000);
  assert.equal(a.o.muted, false);
  assert.equal(g.state, "ok");
});

test("audio : silence = bascule sur le secours, le son revenu 3 s = retour sur Live ; une scène changée à la main rend la main", async () => {
  const { o, req } = fake();
  const g = new AudioGuard(req);
  g.setLive("Live");
  g.setBackupScene("BRB");
  g.set({ enabled: true, source: "Micro", seconds: 5, unmute: false, backup: true });
  await g.tick(1000);
  await g.tick(7000);
  assert.equal(o.scene, "BRB");
  assert.equal(g.state, "backup");
  // Son qui revient : pas de retour avant 3 s continues.
  for (let t = 8000; t <= 9000; t += 200) g.feed("Micro", 0.2, t);
  await g.tick(9000);
  assert.equal(o.scene, "BRB");
  for (let t = 9200; t <= 11500; t += 200) g.feed("Micro", 0.2, t);
  await g.tick(11500);
  assert.equal(o.scene, "Live");
  assert.equal(g.state, "ok");
  // Nouveau silence, puis l'utilisateur change de scène : on ne touche à rien.
  await g.tick(30000);
  assert.equal(o.scene, "BRB");
  o.scene = "Discord";
  await g.tick(31000);
  assert.equal(o.scene, "Discord");
  assert.equal(g.state, "idle");
});

test("audio : micro coupé et remis tout seul = pas de bascule", async () => {
  const a = fake();
  a.o.muted = true;
  const g = new AudioGuard(a.req);
  g.setLive("Live");
  g.setBackupScene("BRB");
  g.set({ enabled: true, source: "Micro", seconds: 5, unmute: true, backup: true });
  await g.tick(1000);
  assert.equal(a.o.scene, "Live");
  assert.equal(g.state, "ok");
});

test("cleanAudio : bornes et valeurs par défaut", () => {
  assert.deepEqual(cleanAudio(undefined), DEFAULT_AUDIO);
  assert.equal(cleanAudio({ seconds: 1 }).seconds, 3);
  assert.equal(cleanAudio({ seconds: 999 }).seconds, 120);
  assert.equal(cleanAudio({ source: 4, enabled: "x" }, { ...DEFAULT_AUDIO, source: "M" }).source, "M");
});
