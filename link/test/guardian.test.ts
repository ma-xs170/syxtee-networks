import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { MAX_AUTO_RESTARTS, ObsWatch, RESTART_WINDOW_MS, type Deps } from "../src/guardian.ts";
import { readJson, takeResume, writeJson, writeStreaming } from "../src/state.ts";
import { guardianPlist } from "../src/launchd.ts";

function setup() {
  process.env.SYXTEE_LINK_HOME = mkdtempSync(join(tmpdir(), "guardian-"));
  const st = { pid: null as number | null, t: 1_000_000, launches: 0, kills: [] as string[], logs: [] as string[] };
  const d: Deps = {
    findObs: async () => st.pid,
    launchObs: async () => {
      st.launches++;
    },
    kill: (pid, sig) => st.kills.push(`${pid}:${sig}`),
    now: () => st.t,
    log: (m) => st.logs.push(m),
  };
  const w = new ObsWatch(d);
  const crash = async (pid: number) => {
    st.pid = pid;
    writeJson("session.json", { pid, exited: false });
    await w.tick();
    st.pid = null;
    await w.tick();
  };
  return { st, w, crash, done: () => (w.stop(), rmSync(process.env.SYXTEE_LINK_HOME!, { recursive: true, force: true })) };
}
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

test("plantage : OBS est relancé après un court délai", async () => {
  const { st, w, crash, done } = setup();
  await crash(111);
  assert.equal(w.launching, true);
  assert.equal(st.launches, 0);
  await wait(4200);
  assert.equal(st.launches, 1);
  done();
});

test("fermeture normale : jamais de relance", async () => {
  const { st, w, done } = setup();
  st.pid = 222;
  writeJson("session.json", { pid: 222, exited: false });
  await w.tick();
  writeJson("session.json", { pid: 222, exited: true });
  st.pid = null;
  await w.tick();
  await wait(4200);
  assert.equal(st.launches, 0);
  done();
});

test("sans note de session pour ce processus : pas de relance", async () => {
  const { st, w, done } = setup();
  st.pid = 333;
  writeJson("session.json", { pid: 999, exited: false });
  await w.tick();
  st.pid = null;
  await w.tick();
  await wait(4200);
  assert.equal(st.launches, 0);
  done();
});

test("surveillance coupée : le plantage est noté mais OBS n'est pas relancé", async () => {
  const { st, w, crash, done } = setup();
  w.settings.watch = false;
  await crash(444);
  await wait(4200);
  assert.equal(st.launches, 0);
  assert.ok(w.crashedAt > 0);
  done();
});

test("boucle de plantages : 3 relances par quart d'heure, puis le Gardien s'arrête et le dit", async () => {
  const { st, w, crash, done } = setup();
  for (let i = 0; i < MAX_AUTO_RESTARTS; i++) await crash(500 + i);
  assert.equal(w.gaveUp, false);
  await crash(600);
  assert.equal(w.gaveUp, true);
  // Le quart d'heure passé, le compteur repart.
  st.t += RESTART_WINDOW_MS + 1;
  assert.equal(w.restarts, 0);
  w.stop();
  done();
});

test("direct actif au plantage : reprise demandée, une seule fois et seulement si récente", async () => {
  const { w, crash, st, done } = setup();
  writeStreaming(true);
  await crash(700);
  assert.ok(readJson("resume.json"));
  assert.equal(takeResume(Date.now()), true);
  assert.equal(takeResume(Date.now()), false);
  writeJson("resume.json", { at: Date.now() - 6 * 60_000 });
  assert.equal(takeResume(Date.now()), false);
  void w;
  void st;
  done();
});

test("reprise du direct coupée dans les réglages : pas de fichier de reprise", async () => {
  const { w, crash, done } = setup();
  w.settings.resume = false;
  writeStreaming(true);
  await crash(800);
  assert.equal(readJson("resume.json"), null);
  done();
});

test("lancement manuel : refusé si OBS tourne, remet le compteur à zéro", async () => {
  const { st, w, crash, done } = setup();
  for (let i = 0; i < MAX_AUTO_RESTARTS + 1; i++) await crash(900 + i);
  assert.equal(w.gaveUp, true);
  st.pid = 5;
  await assert.rejects(() => w.manualLaunch(), /déjà ouvert/);
  st.pid = null;
  await w.manualLaunch();
  assert.equal(st.launches, 1);
  assert.equal(w.gaveUp, false);
  assert.equal(w.restarts, 0);
  done();
});

test("redémarrage demandé : arrêt normal, SIGKILL si OBS est gelé, puis relance sans compter comme plantage", async () => {
  const { st, w, done } = setup();
  st.pid = 42;
  writeJson("session.json", { pid: 42, exited: false });
  await w.tick();
  // OBS gelé : ne s'arrête pas sur SIGTERM, disparaît sur SIGKILL.
  const kill = (pid: number, sig: string) => {
    st.kills.push(`${pid}:${sig}`);
    if (sig === "SIGKILL") st.pid = null;
  };
  (w as unknown as { d: Deps }).d.kill = kill as Deps["kill"];
  let now = st.t;
  (w as unknown as { d: Deps }).d.now = () => (now += 3000);
  await w.restartObs();
  assert.deepEqual(st.kills, ["42:SIGTERM", "42:SIGKILL"]);
  assert.equal(st.launches, 1);
  assert.equal(w.gaveUp, false);
  done();
});

test("LaunchAgent : relancé en continu, journal dans le dossier SYXTEE", () => {
  const p = guardianPlist("/x/syxtee-link-helper", null, "/h/guardian.log");
  assert.match(p, /<key>KeepAlive<\/key><true\/>/);
  assert.match(p, /<string>\/x\/syxtee-link-helper<\/string><string>guardian<\/string>/);
  assert.match(p, /\/h\/guardian\.log/);
});
