import assert from "node:assert/strict";
import { createServer } from "node:http";
import type { AddressInfo } from "node:net";
import { test } from "node:test";
import { WebSocketServer } from "ws";
import { BackupWatcher, cleanAuto, cleanBackup, DEFAULT_AUTO, DEFAULT_BACKUP } from "../src/backup.ts";
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
  w.setLive("Live");
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

test("backup : patiente (jusqu'au double du délai) quand une autre caméra peut prendre le relais, puis coupe vers le secours si personne ne reprend", async () => {
  const { o, req } = fakeObs();
  const w = new BackupWatcher(req);
  w.setLive("Live");
  w.defer = () => true;
  w.set({ enabled: true, source: "SRT", scene: "BRB", freezeSeconds: 3, recoverSeconds: 1, trigger: "cut" });
  o.image = "x";
  for (let i = 0; i < 5; i++) await w.tick(); // figée depuis 4 s : au-delà de 3 s, mais le secours patiente
  assert.equal(o.scene, "Live");
  for (let i = 0; i < 4; i++) await w.tick(); // au-delà de 2 x 3 s : le secours prend la main
  assert.equal(o.scene, "BRB");
});

test("backup : capture en échec (flux coupé) = figée ; désactivé = aucune action", async () => {
  const { o, req } = fakeObs();
  const w = new BackupWatcher(req);
  w.setLive("Live");
  w.set({ enabled: false, source: "SRT", scene: "BRB", freezeSeconds: 1, recoverSeconds: 1, trigger: "cut" });
  o.fail = true;
  await w.tick(); await w.tick();
  assert.equal(o.scene, "Live");
  w.set({ enabled: true, source: "SRT", scene: "BRB", freezeSeconds: 2, recoverSeconds: 1, trigger: "cut" });
  // Flux jamais arrivé : on laisse d'abord 8 secondes au flux pour se connecter, puis le secours prend la main.
  for (let i = 0; i < 8; i++) await w.tick();
  assert.equal(o.scene, "Live");
  await w.tick();
  assert.equal(o.scene, "BRB");
});

test("backup : si l'utilisateur change de scène à la main pendant le secours, on ne la remplace pas", async () => {
  const { o, req } = fakeObs();
  const w = new BackupWatcher(req);
  w.setLive("Live");
  w.set({ enabled: true, source: "SRT", scene: "BRB", freezeSeconds: 1, recoverSeconds: 1, trigger: "cut" });
  o.image = "x";
  await w.tick();
  await w.tick(); // figée → BRB
  assert.equal(w.state, "backup");
  o.scene = "Autre"; // choix manuel
  o.image = "y";
  await w.tick();
  assert.equal(o.scene, "Autre");
  assert.equal(w.state, "idle"); // scène hors Live : la régie se désarme et ne touche plus à rien
});

test("backup : déjà sur la scène de secours, ne bascule pas et ne mémorise rien", async () => {
  const { o, req } = fakeObs("BRB");
  const w = new BackupWatcher(req);
  w.setLive("Live");
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
    w.setLive("Live");
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
  w.setLive("Live");
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

/** Faux OBS à deux sources : le flux (SRT) et le drone. Une image de drone « belle » est longue (plus de 3000 caractères) et change. */
function fakeObs2(initial: string) {
  const o = { scene: initial, srt: "a", drone: "", cam2: "", switches: [] as string[] };
  const beau = (n: number) => `${n}`.padEnd(3200, "x");
  const req = async (t: string, d?: Record<string, unknown>) => {
    if (t === "GetSourceScreenshot") {
      const img = d?.sourceName === "DRONE" ? o.drone : d?.sourceName === "CAM2" ? o.cam2 : o.srt;
      if (img === "") throw new Error("source absente");
      return { imageData: img };
    }
    if (t === "GetCurrentProgramScene") return { currentProgramSceneName: o.scene };
    if (t === "SetCurrentProgramScene") {
      o.scene = String(d?.sceneName);
      o.switches.push(o.scene);
      return {};
    }
    return {};
  };
  return { o, req, beau };
}

test("régie : rien ne bascule tant que la scène Live n'est pas à l'antenne", async () => {
  const { o, req } = fakeObs2("On commence bientôt");
  const w = new BackupWatcher(req);
  w.setLive("Live");
  w.set({ enabled: true, source: "SRT", scene: "BRB", freezeSeconds: 1, recoverSeconds: 1, trigger: "cut" });
  w.setAuto({ enabled: true, droneScene: "Drone", droneSource: "DRONE", rules: [] });
  o.srt = "";
  let n = 0;
  for (let i = 0; i < 20; i++) {
    o.drone = `${++n}`.padEnd(3200, "x");
    await w.tick();
  }
  assert.deepEqual(o.switches, []);
  assert.equal(w.state, "idle");
});

test("auto-gérance : belle prise de drone → scène drone, prise perdue → retour sur Live", async () => {
  const { o, req, beau } = fakeObs2("Live");
  const w = new BackupWatcher(req);
  w.setLive("Live");
  w.setAuto({ enabled: true, droneScene: "Scène quelconque", droneSource: "DRONE", rules: [] });
  o.srt = "a";
  let n = 0;
  for (let i = 0; i < 4; i++) {
    o.drone = beau(++n);
    await w.tick();
  }
  assert.equal(o.scene, "Scène quelconque");
  assert.equal(w.state, "drone");
  // Le drone se fige (image identique) pendant 4 secondes : retour sur Live.
  for (let i = 0; i < 5; i++) await w.tick();
  assert.equal(o.scene, "Live");
  assert.equal(w.state, "ok");
  assert.deepEqual(o.switches, ["Scène quelconque", "Live"]);
});

test("auto-gérance : image noire ou trop pauvre = pas une belle prise ; retour manuel sur Live = pause", async () => {
  const { o, req, beau } = fakeObs2("Live");
  const w = new BackupWatcher(req);
  w.setLive("Live");
  w.setAuto({ enabled: true, droneScene: "Drone", droneSource: "DRONE", rules: [] });
  let n = 0;
  for (let i = 0; i < 8; i++) {
    o.drone = `${++n}`; // image noire : quelques octets seulement
    await w.tick();
  }
  assert.deepEqual(o.switches, []);
  for (let i = 0; i < 4; i++) {
    o.drone = beau(++n);
    await w.tick();
  }
  assert.equal(o.scene, "Drone");
  // L'utilisateur reprend la main et revient sur Live : l'auto-gérance attend avant de rebasculer.
  o.scene = "Live";
  for (let i = 0; i < 10; i++) {
    o.drone = beau(++n);
    await w.tick();
  }
  assert.equal(o.scene, "Live");
  assert.deepEqual(o.switches, ["Drone"]);
});

test("cleanAuto : valeurs par défaut et bornes", () => {
  assert.deepEqual(cleanAuto(undefined), DEFAULT_AUTO);
  assert.deepEqual(cleanAuto({ enabled: true, droneScene: "D", droneSource: 4 }, { ...DEFAULT_AUTO, droneSource: "S" }), { enabled: true, droneScene: "D", droneSource: "S", rules: [] });
  const r = cleanAuto({ rules: [{ source: "CAM2", scene: "Plan 2" }, { source: 3 }, {}] });
  assert.deepEqual(r.rules, [{ source: "CAM2", scene: "Plan 2" }, { source: "", scene: "" }, { source: "", scene: "" }]);
  assert.equal(cleanAuto({ rules: Array.from({ length: 20 }, () => ({ source: "a", scene: "b" })) }).rules.length, 8);
  assert.deepEqual(cleanAuto({ enabled: true }, { ...DEFAULT_AUTO, rules: [{ source: "A", scene: "B" }] }).rules, [{ source: "A", scene: "B" }]);
});

test("auto-gérance : règle supplémentaire (caméra 2) bascule et revient ; le drone garde la priorité", async () => {
  const { o, req, beau } = fakeObs2("Live");
  const w = new BackupWatcher(req);
  w.setLive("Live");
  w.setAuto({ enabled: true, droneScene: "Drone", droneSource: "DRONE", rules: [{ source: "CAM2", scene: "Plan 2" }] });
  o.srt = "a";
  let n = 0;
  for (let i = 0; i < 4; i++) {
    o.cam2 = beau(++n);
    await w.tick();
  }
  assert.equal(o.scene, "Plan 2");
  assert.equal(w.state, "drone");
  // La caméra 2 se fige : retour sur Live.
  for (let i = 0; i < 5; i++) await w.tick();
  assert.equal(o.scene, "Live");
  // Les deux sont belles en même temps : le drone passe en premier.
  for (let i = 0; i < 4; i++) {
    o.cam2 = beau(++n);
    o.drone = beau(++n);
    await w.tick();
  }
  assert.equal(o.scene, "Drone");
});
