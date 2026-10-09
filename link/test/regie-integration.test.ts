import assert from "node:assert/strict";
import { test } from "node:test";
import { AudioGuard } from "../src/audio.ts";
import { BackupWatcher } from "../src/backup.ts";
import { AiDirector, DEFAULT_DIRECTOR } from "../src/director.ts";

// Les trois automatismes sur un même faux OBS, comme dans l'agent : secours (BackupWatcher), garde audio, régie de caméras.
const beau = (n: number) => `${n}`.padEnd(3000, "x");

function rig(initial: string, interval = 2) {
  const o = { scene: initial, osmo: "", iphone: "", muted: false, switches: [] as string[], n: 0 };
  const req = async (t: string, d?: Record<string, unknown>) => {
    if (t === "GetSourceScreenshot") {
      const img = d?.sourceName === "OSMO" ? o.osmo : d?.sourceName === "IPHONE" ? o.iphone : "";
      if (img === "") throw new Error("source absente");
      return { imageData: img };
    }
    if (t === "GetCurrentProgramScene") return { currentProgramSceneName: o.scene };
    if (t === "SetCurrentProgramScene") {
      o.scene = String(d?.sceneName);
      o.switches.push(o.scene);
    }
    if (t === "GetInputMute") return { inputMuted: o.muted };
    return {};
  };
  const watcher = new BackupWatcher(req);
  watcher.setLive("IRL Osmo");
  watcher.set({ enabled: true, source: "OSMO", scene: "BRB", freezeSeconds: 4, recoverSeconds: 2, trigger: "cut" });
  const audio = new AudioGuard(req);
  audio.setLive("IRL Osmo");
  audio.setBackupScene("BRB");
  const director = new AiDirector(req, async () => "", () => {});
  director.setLive("IRL Osmo");
  director.fallbackScene = "BRB";
  director.backupActive = () => watcher.state === "backup";
  director.set({
    ...DEFAULT_DIRECTOR,
    enabled: true,
    provider: "none",
    interval,
    cams: [
      { source: "OSMO", scene: "IRL Osmo", label: "Osmo" },
      { source: "IPHONE", scene: "IRL iPhone", label: "iPhone" },
    ],
  });
  watcher.defer = (s) => director.canTakeOver(s, o.n * 1000);
  /** Une seconde de direct : les images des caméras vivantes bougent, puis les trois automatismes tournent. */
  const second = async (live: { osmo: boolean; iphone: boolean }) => {
    o.n++;
    if (live.osmo) o.osmo = beau(o.n * 2);
    if (live.iphone) o.iphone = beau(o.n * 2 + 1);
    await watcher.tick();
    await audio.tick(o.n * 1000);
    await director.tick(o.n * 1000);
  };
  return { o, watcher, director, second };
}

test("intégration : l'Osmo tombe, la régie passe sur l'iPhone avant le secours « Connexion perdue »", async () => {
  const { o, second } = rig("IRL Osmo", 4); // analyse lente : sans la patience du secours, il couperait avant la régie
  for (let i = 0; i < 6; i++) await second({ osmo: true, iphone: true });
  assert.equal(o.scene, "IRL Osmo");
  for (let i = 0; i < 12; i++) await second({ osmo: false, iphone: true });
  assert.equal(o.scene, "IRL iPhone");
  assert.ok(!o.switches.includes("BRB"), `le secours ne devait pas jouer : ${o.switches.join(", ")}`);
});

test("intégration : les deux caméras tombent = secours ; l'iPhone revient = la régie reprend la main depuis le secours", async () => {
  const { o, second } = rig("IRL Osmo");
  for (let i = 0; i < 6; i++) await second({ osmo: true, iphone: true });
  for (let i = 0; i < 14; i++) await second({ osmo: false, iphone: false });
  assert.equal(o.scene, "BRB");
  for (let i = 0; i < 8; i++) await second({ osmo: false, iphone: true });
  assert.equal(o.scene, "IRL iPhone");
});

test("intégration : sans autre caméra vivante, le secours joue comme avant", async () => {
  const { o, second } = rig("IRL Osmo");
  for (let i = 0; i < 6; i++) await second({ osmo: true, iphone: false });
  for (let i = 0; i < 12; i++) await second({ osmo: false, iphone: false });
  assert.equal(o.scene, "BRB");
});

test("intégration : une scène « Connexion perdue » choisie à la main n'est pas quittée par la régie", async () => {
  const { o, second } = rig("BRB");
  for (let i = 0; i < 10; i++) await second({ osmo: true, iphone: true });
  assert.equal(o.scene, "BRB");
  assert.deepEqual(o.switches, []);
});
