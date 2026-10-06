import assert from "node:assert/strict";
import { createServer } from "node:http";
import type { AddressInfo } from "node:net";
import { test } from "node:test";
import { WebSocketServer } from "ws";
import { BackupWatcher, cleanBackup, DEFAULT_BACKUP } from "../src/backup.ts";
import { authString, ObsClient } from "../src/obs.ts";

test("authentification obs-websocket : vecteur connu", async () => {
  // Calcul de référence indépendant (crypto de Node).
  const { createHash } = await import("node:crypto");
  const h = (s: string) => createHash("sha256").update(s).digest("base64");
  assert.equal(await authString("secret", "salt", "chal"), h(h("secretsalt") + "chal"));
});

test("cleanBackup : bornes et types", () => {
  const c = cleanBackup({ enabled: true, source: "SRT", scene: "BRB", freezeSeconds: 999, recoverSeconds: -4 });
  assert.deepEqual(c, { enabled: true, source: "SRT", scene: "BRB", freezeSeconds: 60, recoverSeconds: 1, trigger: "cut" });
  assert.deepEqual(cleanBackup("n'importe quoi"), DEFAULT_BACKUP);
  assert.equal(cleanBackup({ source: 3 }, { ...DEFAULT_BACKUP, source: "A" }).source, "A");
});

/** Faux OBS : une scène courante et une image de la source qu'on pilote. */
function fakeObs(initial = "Live") {
  const o = { scene: initial, image: "a", fail: false, switches: [] as string[] };
  const req = async (t: string, d?: Record<string, unknown>) => {
    if (t === "GetSourceScreenshot") {
      if (o.fail) throw new Error("source absente");
      return { imageData: o.image };
    }
    if (t === "GetCurrentProgramScene") return { currentProgramSceneName: o.scene };
    if (t === "SetCurrentProgramScene") {
      o.scene = String(d?.sceneName);
      o.switches.push(o.scene);
      return {};
    }
    return {};
  };
  return { o, req };
}

test("backup : image figée → scène de secours → retour quand l'image repart", async () => {
  const { o, req } = fakeObs();
  const w = new BackupWatcher(req);
  w.set({ enabled: true, source: "SRT", scene: "BRB", freezeSeconds: 3, recoverSeconds: 2, trigger: "cut" });
  let n = 0;
  const moving = async () => ((o.image = `f${++n}`), await w.tick());
  await moving(); await moving();
  assert.equal(w.state, "ok");
  // Image identique : 1ère capture figée (vs précédente) puis 2e, 3e → bascule.
  await w.tick(); await w.tick();
  assert.equal(w.state, "frozen");
  assert.equal(o.scene, "Live");
  await w.tick();
  assert.equal(w.state, "backup");
  assert.equal(o.scene, "BRB");
  // L'image repart : 2 captures différentes → retour à la scène d'origine.
  await moving();
  assert.equal(w.state, "backup");
  await moving();
  assert.equal(w.state, "ok");
  assert.equal(o.scene, "Live");
  assert.deepEqual(o.switches, ["BRB", "Live"]);
});

test("backup : capture en échec (flux coupé) = figée ; désactivé = aucune action", async () => {
  const { o, req } = fakeObs();
  const w = new BackupWatcher(req);
  w.set({ enabled: false, source: "SRT", scene: "BRB", freezeSeconds: 1, recoverSeconds: 1, trigger: "cut" });
  o.fail = true;
  await w.tick(); await w.tick();
  assert.equal(o.scene, "Live");
  w.set({ enabled: true, source: "SRT", scene: "BRB", freezeSeconds: 2, recoverSeconds: 1, trigger: "cut" });
  await w.tick(); await w.tick();
  assert.equal(o.scene, "BRB");
});

test("backup : si l'utilisateur change de scène à la main pendant le secours, on ne la remplace pas", async () => {
  const { o, req } = fakeObs();
  const w = new BackupWatcher(req);
  w.set({ enabled: true, source: "SRT", scene: "BRB", freezeSeconds: 1, recoverSeconds: 1, trigger: "cut" });
  o.image = "x";
  await w.tick();
  await w.tick(); // figée → BRB
  assert.equal(w.state, "backup");
  o.scene = "Autre"; // choix manuel
  o.image = "y";
  await w.tick();
  assert.equal(o.scene, "Autre");
  assert.equal(w.state, "ok");
});

test("backup : déjà sur la scène de secours, ne bascule pas et ne mémorise rien", async () => {
  const { o, req } = fakeObs("BRB");
  const w = new BackupWatcher(req);
  w.set({ enabled: true, source: "SRT", scene: "BRB", freezeSeconds: 1, recoverSeconds: 1, trigger: "cut" });
  await w.tick(); await w.tick();
  assert.deepEqual(o.switches, []);
});

test("client OBS : identification avec mot de passe, requête, erreur", async () => {
  const server = createServer();
  const wss = new WebSocketServer({ server, handleProtocols: () => "obswebsocket.json" });
  let sawAuth = "";
  wss.on("connection", (ws) => {
    ws.send(JSON.stringify({ op: 0, d: { obsWebSocketVersion: "5.5.0", rpcVersion: 1, authentication: { challenge: "c", salt: "s" } } }));
    ws.on("message", (raw) => {
      const m = JSON.parse(String(raw));
      if (m.op === 1) {
        sawAuth = m.d.authentication;
        ws.send(JSON.stringify({ op: 2, d: { negotiatedRpcVersion: 1 } }));
      } else if (m.op === 6) {
        const ok = m.d.requestType === "GetVersion";
        ws.send(JSON.stringify({ op: 7, d: { requestType: m.d.requestType, requestId: m.d.requestId, requestStatus: ok ? { result: true, code: 100 } : { result: false, code: 600, comment: "Pas trouvé" }, responseData: ok ? { obsVersion: "31.0" } : undefined } }));
      }
    });
  });
  await new Promise<void>((r) => server.listen(0, "127.0.0.1", r));
  const port = (server.address() as AddressInfo).port;
  const obs = new ObsClient();
  await obs.connect("127.0.0.1", port, "pw");
  assert.equal(sawAuth, await authString("pw", "s", "c"));
  assert.deepEqual(await obs.request("GetVersion"), { obsVersion: "31.0" });
  await assert.rejects(obs.request("Inconnu"), /Pas trouvé/);
  obs.close();
  wss.close();
  server.close();
});

test("déclenchements : coupure seulement ignore le débit ; débit très bas bascule avant que l'image se fige ; sensible bascule en 2 s", async () => {
  const base = { enabled: true, source: "SRT", scene: "BRB", freezeSeconds: 4, recoverSeconds: 2 };
  const run = async (trigger: "cut" | "cut_lowbitrate" | "sensitive", kbps: number | null, ticks: number) => {
    const { o, req } = fakeObs();
    const w = new BackupWatcher(req);
    w.set({ ...base, trigger });
    w.setBitrate(kbps);
    let n = 0;
    for (let i = 0; i < ticks; i++) {
      o.image = `f${++n}`; // l'image bouge toujours
      await w.tick();
    }
    return { state: w.state, scene: o.scene };
  };
  // Image qui bouge, débit effondré (150 kbit/s) :
  assert.deepEqual(await run("cut", 150, 8), { state: "ok", scene: "Live" }); // coupure seulement : rien ne bascule
  assert.deepEqual(await run("cut_lowbitrate", 150, 8), { state: "backup", scene: "BRB" }); // débit sous 300 : bascule après freezeSeconds
  assert.deepEqual(await run("cut_lowbitrate", 500, 8), { state: "ok", scene: "Live" }); // 500 > 300 : normal
  assert.deepEqual(await run("sensitive", 500, 8), { state: "backup", scene: "BRB" }); // sensible : sous 800 = bascule
  assert.deepEqual(await run("sensitive", 1500, 8), { state: "ok", scene: "Live" });
  assert.deepEqual(await run("cut_lowbitrate", null, 8), { state: "ok", scene: "Live" }); // débit inconnu : sans effet
  // « Sensible » bascule dès 2 s d'image figée (alors que le réglage de base attend 4 s)
  const { o, req } = fakeObs();
  const w = new BackupWatcher(req);
  w.set({ ...base, trigger: "sensitive" });
  o.image = "x";
  await w.tick(); // 1re capture
  await w.tick(); // figée 1
  assert.equal(w.state, "frozen");
  await w.tick(); // figée 2
  assert.equal(w.state, "backup");
  // Retour : le débit remonte et l'image repart
  w.setBitrate(2000);
  let n2 = 0;
  for (let i = 0; i < 2; i++) {
    o.image = `g${++n2}`;
    await w.tick();
  }
  assert.equal(w.state, "ok");
  assert.equal(o.scene, "Live");
});
