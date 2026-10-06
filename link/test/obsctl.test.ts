import assert from "node:assert/strict";
import { spawn, type ChildProcessWithoutNullStreams } from "node:child_process";
import { existsSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { createServer } from "node:http";
import type { AddressInfo } from "node:net";
import { ObsIpc } from "../src/obsipc.ts";

// Le VRAI code de pilotage du plugin (plugin/qt/obsctl.cpp) branché sur un faux OBS en mémoire (plugin/qt/test/obs-stub.cpp),
// parlé par le VRAI client de l'agent (obsipc.ts). Ne prouve PAS le comportement de libobs : seulement le protocole, les demandes,
// les formes de réponse et les événements. Lancé seulement si OBSCTL_HOST pointe vers l'exécutable (voir scripts/build-obsctl-host.sh).
const HOST = process.env.OBSCTL_HOST ?? "";
if (process.env.TRACE_IPC) { const orig = ObsIpc.prototype.request; ObsIpc.prototype.request = function (this: ObsIpc, t: string, d?: Record<string, unknown>) { console.log("req", t, JSON.stringify(d ?? {}).slice(0, 120)); return orig.call(this, t, d); } as typeof orig; }
const run = HOST && existsSync(HOST) ? test : test.skip;

function start() {
  const sock = join(mkdtempSync(join(tmpdir(), "slk-ipc-")), "obs.sock");
  const child: ChildProcessWithoutNullStreams = spawn(HOST, [sock], { env: { ...process.env, QT_PLUGIN_PATH: join(process.env.HOME ?? "", "Qt/6.11.1/macos/plugins") } });
  let out = "";
  child.on("exit", (code, sig) => { if (code || (sig && sig !== "SIGTERM")) console.log("hôte arrêté", code, sig); });
  child.stderr.on("data", (d) => console.log("hôte stderr", String(d).slice(0, 300)));
  const waiters: { re: RegExp; ok: (m: string) => void }[] = [];
  child.stdout.on("data", (d) => {
    out += String(d);
    for (const w of [...waiters]) {
      const m = w.re.exec(out);
      if (m) {
        waiters.splice(waiters.indexOf(w), 1);
        w.ok(m[0]);
      }
    }
  });
  const expect = (re: RegExp) => new Promise<string>((ok, ko) => {
    const m = re.exec(out);
    if (m) return ok(m[0]);
    waiters.push({ re, ok });
    setTimeout(() => ko(new Error(`attendu ${re} dans « ${out} »`)), 5000).unref();
  });
  const whip = async () => { const before = out.length; child.stdin.write("whipinfo\n"); await new Promise((r) => setTimeout(r, 150)); const m = /WHIP (\{.*\})/.exec(out.slice(before)); return m ? JSON.parse(m[1]) : null; };
  /** Envoie une commande au faux OBS et attend la ligne de réponse qui commence par `tag` (JSON). */
  const grab = async (c: string, tag: string) => {
    const before = out.length;
    child.stdin.write(c + "\n");
    const re = new RegExp(`${tag} (.*)`);
    for (let i = 0; i < 40; i++) {
      const m = re.exec(out.slice(before));
      if (m) return m[1];
      await new Promise((r) => setTimeout(r, 50));
    }
    throw new Error(`pas de réponse ${tag}`);
  };
  return { sock, child, expect, whip, grab, cmd: (c: string) => child.stdin.write(c + "\n"), state: async () => { const before = out.length; child.stdin.write("state\n"); await new Promise((r) => setTimeout(r, 150)); const m = /STATE (\{.*\})/.exec(out.slice(before)); return m ? JSON.parse(m[1]) : null; } };
}

/** Attend l'événement `name` (le premier reçu à partir de maintenant). */
function nextEvent(obs: ObsIpc, name: string, ms = 4000) {
  return new Promise<Record<string, any>>((ok, ko) => {
    const prev = obs.onEvent;
    const t = setTimeout(() => { obs.onEvent = prev; ko(new Error(`événement ${name} jamais reçu`)); }, ms);
    obs.onEvent = (n, d) => {
      prev(n, d);
      if (n === name) { clearTimeout(t); obs.onEvent = prev; ok(d); }
    };
  });
}

run("plugin : demandes, formes de réponse et événements d'OBS, sans obs-websocket", async () => {
  const h = start();
  try {
    await h.expect(/READY/);
    const obs = new ObsIpc(h.sock);
    const hello = await obs.connect();
    assert.match(hello.wsVersion, /stub/);

    // Avant la fin du chargement d'OBS : refus clair, pas de plantage.
    await assert.rejects(obs.request("GetSceneList"), /démarre/);
    const ready = nextEvent(obs, "link.ready");
    h.cmd("loaded");
    await ready;

    // Lectures
    assert.match(String((await obs.request("GetVersion")).obsVersion), /stub/);
    const sl = await obs.request<any>("GetSceneList");
    assert.deepEqual(sl.scenes.map((s: any) => s.sceneName), ["📶 › CONNEXION PERDUE", "🎥 › DRONE", "🔴 › EN DIRECT", "⏳ › ON COMMENCE BIENTÔT"]); // ordre d'obs-websocket, emoji compris
    assert.equal(sl.currentProgramSceneName, "⏳ › ON COMMENCE BIENTÔT");
    const items = (await obs.request<any>("GetSceneItemList", { sceneName: "🔴 › EN DIRECT" })).sceneItems;
    assert.deepEqual(items.map((i: any) => [i.sceneItemId, i.sourceName, i.inputKind, i.sceneItemEnabled]), [[1, "Flux › IPHONE 16", "ffmpeg_source", true], [2, "Micro", "coreaudio_input_capture", true], [3, "Texte", "text_ft2_source", true]]);
    const inputs = (await obs.request<any>("GetInputList")).inputs;
    const mic = inputs.find((i: any) => i.inputName === "Micro");
    assert.equal(mic.hasAudio, true);
    assert.equal(mic.inputMuted, false);
    assert.equal(inputs.find((i: any) => i.inputName === "Texte").hasAudio, false);
    assert.equal((await obs.request<any>("GetVideoSettings")).baseWidth, 1920);
    await assert.rejects(obs.request("RemoveScene", { sceneName: "x" }), /inconnue/);
    await assert.rejects(obs.request("SetCurrentProgramScene", { sceneName: "n'existe pas" }), /introuvable/);

    // Changer de scène depuis le site, puis depuis OBS : l'événement part dans les deux cas
    let ev = nextEvent(obs, "CurrentProgramSceneChanged");
    await obs.request("SetCurrentProgramScene", { sceneName: "🔴 › EN DIRECT" });
    assert.equal((await ev).sceneName, "🔴 › EN DIRECT");
    ev = nextEvent(obs, "CurrentProgramSceneChanged");
    h.cmd("scene 🎥 › DRONE");
    assert.equal((await ev).sceneName, "🎥 › DRONE");
    assert.equal((await obs.request<any>("GetCurrentProgramScene")).currentProgramSceneName, "🎥 › DRONE");

    // Œil d'une source
    ev = nextEvent(obs, "SceneItemEnableStateChanged");
    await obs.request("SetSceneItemEnabled", { sceneName: "🔴 › EN DIRECT", sceneItemId: 1, sceneItemEnabled: false });
    assert.deepEqual(await ev, { sceneName: "🔴 › EN DIRECT", sceneItemId: 1, sceneItemEnabled: false });
    assert.equal((await h.state()).liveItem1, false);

    // Audio : mute, volume, niveaux, renommage
    ev = nextEvent(obs, "InputMuteStateChanged");
    await obs.request("SetInputMute", { inputName: "Micro", inputMuted: true });
    assert.deepEqual(await ev, { inputName: "Micro", inputMuted: true });
    ev = nextEvent(obs, "InputMuteStateChanged");
    h.cmd("mute Micro 0");
    assert.equal((await ev).inputMuted, false);
    ev = nextEvent(obs, "InputVolumeChanged");
    await obs.request("SetInputVolume", { inputName: "Micro", inputVolumeMul: 0.5 });
    const v = await ev;
    assert.equal(v.inputVolumeMul, 0.5);
    assert.ok(Math.abs(v.inputVolumeDb + 6.02) < 0.05);
    assert.equal((await obs.request<any>("GetInputVolume", { inputName: "Micro" })).inputVolumeMul, 0.5);
    await obs.request("SetInputAudioMonitorType", { inputName: "Micro", monitorType: "OBS_MONITORING_TYPE_MONITOR_AND_OUTPUT" });
    assert.equal((await obs.request<any>("GetInputAudioMonitorType", { inputName: "Micro" })).monitorType, "OBS_MONITORING_TYPE_MONITOR_AND_OUTPUT");
    ev = nextEvent(obs, "InputVolumeMeters");
    h.cmd("meter Micro 0.5");
    const meters = await ev;
    assert.ok(meters.inputs.some((i: any) => i.inputName === "Micro" && i.inputLevelsMul.length === 2));
    ev = nextEvent(obs, "SourceRenamed");
    await obs.request("SetInputName", { inputName: "Texte", newInputName: "Titre" });
    assert.deepEqual(await ev, { oldName: "Texte", name: "Titre" });
    await obs.request("SetInputName", { inputName: "Titre", newInputName: "Texte" });

    // Direct : lancer, mesures chaque seconde (débit calculé), arrêter
    await assert.rejects(obs.request("StopStream"), /Aucun direct/);
    ev = nextEvent(obs, "StreamStateChanged");
    await obs.request("StartStream");
    assert.equal((await ev).outputActive, true);
    assert.equal((await obs.request<any>("GetStreamStatus")).outputActive, true);
    await assert.rejects(obs.request("StartStream"), /déjà/);
    await assert.rejects(obs.request("SetCurrentProfile", { profileName: "Mobile 4G" }), /pendant un direct/);
    h.cmd("bytes 750000");
    await new Promise((r) => setTimeout(r, 1100));
    h.cmd("bytes 750000");
    const stats = await nextEvent(obs, "link.stats", 3000);
    assert.equal(stats.stream.outputActive, true);
    assert.ok(stats.stream.kbps > 0, `débit ${JSON.stringify(stats.stream)}`);
    assert.equal(stats.stream.encoder, "Encodeur matériel (stub)");
    assert.equal(stats.stream.encoderBitrate, 6000);
    assert.equal(stats.cpuUsage, 12.5);
    assert.equal(stats.activeFps, 60);
    ev = nextEvent(obs, "StreamStateChanged");
    await obs.request("StopStream");
    await ev;
    assert.equal((await h.state()).streaming, false);

    // Enregistrement
    await obs.request("StartRecord");
    await obs.request("PauseRecord");
    assert.equal((await obs.request<any>("GetRecordStatus")).outputPaused, true);
    await obs.request("ResumeRecord");
    await obs.request("StopRecord");
    assert.equal((await h.state()).recording, false);

    // Mode Studio : aperçu, transition
    assert.equal((await obs.request<any>("GetStudioModeEnabled")).studioModeEnabled, false);
    await assert.rejects(obs.request("GetCurrentPreviewScene"), /mode Studio/);
    ev = nextEvent(obs, "StudioModeStateChanged");
    await obs.request("SetStudioModeEnabled", { studioModeEnabled: true });
    assert.equal((await ev).studioModeEnabled, true);
    await obs.request("SetCurrentPreviewScene", { sceneName: "🔴 › EN DIRECT" });
    ev = nextEvent(obs, "CurrentProgramSceneChanged");
    await obs.request("TriggerStudioModeTransition");
    assert.equal((await ev).sceneName, "🔴 › EN DIRECT");
    await obs.request("SetStudioModeEnabled", { studioModeEnabled: false });

    // Profils et collections : le changement est réel (le faux OBS les compte)
    const pl = await obs.request<any>("GetProfileList");
    assert.deepEqual(pl.profiles, ["Sans titre", "Mobile 4G"]);
    ev = nextEvent(obs, "CurrentProfileChanged");
    await obs.request("SetCurrentProfile", { profileName: "Mobile 4G" });
    assert.equal((await ev).profileName, "Mobile 4G");
    assert.equal((await h.state()).profile, "Mobile 4G");
    ev = nextEvent(obs, "CurrentSceneCollectionChanged");
    await obs.request("SetCurrentSceneCollection", { sceneCollectionName: "Collection B" });
    assert.equal((await ev).sceneCollectionName, "Collection B");
    assert.equal((await obs.request<any>("GetSceneCollectionList")).currentSceneCollectionName, "Collection B");

    // Transitions
    const tl = await obs.request<any>("GetSceneTransitionList");
    assert.deepEqual(tl.transitions.map((t: any) => t.transitionName), ["Fondu", "Coupure"]);
    await obs.request("SetCurrentSceneTransition", { transitionName: "Coupure" });
    assert.equal((await obs.request<any>("GetCurrentSceneTransition")).transitionName, "Coupure");

    // Aperçu de secours : image JPEG
    const shot = (await obs.request<any>("GetSourceScreenshot", { sourceName: "🔴 › EN DIRECT", imageWidth: 320, imageCompressionQuality: 50 })).imageData as string;
    assert.ok(shot.startsWith("/9j/"), "JPEG en base64");
    assert.ok(Buffer.from(shot, "base64").length > 500);

    // Créer la source « Flux SYXTEE » (ce que fait « Corriger »), la rattacher à une autre scène, mettre à jour son adresse
    const created = await obs.request<any>("CreateInput", { sceneName: "🔴 › EN DIRECT", inputName: "Flux › SYXTEE", inputKind: "ffmpeg_source", inputSettings: { input: "srt://a", is_local_file: false }, sceneItemEnabled: true });
    assert.ok(created.sceneItemId > 0);
    assert.equal((await h.state()).flux, "srt://a");
    await obs.request("SetInputSettings", { inputName: "Flux › SYXTEE", inputSettings: { input: "srt://b" }, overlay: true });
    assert.equal((await h.state()).flux, "srt://b");
    await obs.request("CreateSceneItem", { sceneName: "🎥 › DRONE", sourceName: "Flux › SYXTEE", sceneItemEnabled: true });
    const drone = (await obs.request<any>("GetSceneItemList", { sceneName: "🎥 › DRONE" })).sceneItems.map((i: any) => i.sourceName);
    assert.ok(drone.includes("Flux › SYXTEE"));
    // La nouvelle entrée est branchée : son niveau et son nom sont suivis
    ev = nextEvent(obs, "InputCreated");
    await obs.request("CreateInput", { sceneName: "🔴 › EN DIRECT", inputName: "Autre", inputKind: "ffmpeg_source", inputSettings: {} });
    assert.equal((await ev).inputName, "Autre");

    // Le socket est fermé proprement quand OBS s'arrête
    const closed = new Promise<void>((ok) => { obs.onClose = ok; });
    h.cmd("quit");
    await closed;
  } finally {
    h.child.kill();
  }
});

run("agent : se relie à OBS par le plugin (aucune configuration d'OBS), suit les changements, jamais de WebSocket", async () => {
  const h = start();
  process.env.SYXTEE_LINK_HOME = mkdtempSync(join(tmpdir(), "slk-home-"));
  process.env.SYXTEE_LINK_OBS_IPC = h.sock;
  try {
    await h.expect(/READY/);
    h.cmd("loaded");
    const { Agent } = await import("../src/agent.ts");
    const { defaults } = await import("../src/config.ts");
    // Aucun serveur SYXTEE joignable, et un port obs-websocket absurde : seul le socket du plugin peut fonctionner.
    const agent = new Agent({ ...defaults(), core: "http://127.0.0.1:9", obs: { host: "127.0.0.1", port: 1, password: "" } });
    agent.start();
    for (let i = 0; i < 50 && agent.status.obs !== "on"; i++) await new Promise((r) => setTimeout(r, 100));
    assert.equal(agent.status.obs, "on");
    assert.match(agent.status.obsVersion, /stub/);
    const sl = await agent.obsRequest("GetSceneList");
    assert.equal((sl.scenes as unknown[]).length, 4);
    assert.ok(!agent.status.lastError.toLowerCase().includes("websocket"));
    agent.stop();
  } finally {
    delete process.env.SYXTEE_LINK_OBS_IPC;
    h.child.kill();
  }
});

run("aperçu vidéo : sortie WHIP native d'OBS, encodeur matériel, vidéo réduite, Opus, démarre et s'arrête à la demande", async () => {
  const h = start();
  try {
    await h.expect(/READY/);
    const obs = new ObsIpc(h.sock);
    await obs.connect();
    h.cmd("loaded");
    await nextEvent(obs, "link.ready");

    await assert.rejects(obs.request("link.whipStart", { server: "http://pas-securise/whip" }), /invalide/); // HTTPS obligatoire
    assert.equal((await obs.request<any>("link.whipStatus")).active, false);
    const started = nextEvent(obs, "link.whip");
    const r = await obs.request<any>("link.whipStart", { server: "https://cam.example/obs_abc/whip" });
    assert.equal((await started).active, true);
    // Encodeur matériel Apple choisi (pas x264, pas HEVC), 960×540 (16:9), 1200 kbit/s, une image sur deux (OBS à 60 i/s), Opus
    assert.equal(r.encoder, "com.apple.videotoolbox.videoencoder.ave.avc");
    assert.deepEqual([r.width, r.height, r.kbps], [960, 540, 1200]);
    const info = await h.whip();
    assert.equal(info.serviceKind, "whip_custom");
    assert.equal(info.outputKind, "whip_output");
    assert.equal(info.server, "https://cam.example/obs_abc/whip");
    assert.equal(info.videoEncoder, "com.apple.videotoolbox.videoencoder.ave.avc");
    assert.equal(info.audioEncoder, "ffmpeg_opus");
    assert.equal(info.divisor, 2);
    assert.equal(info.videoSettings.bf, 0); // pas d'image B : exigé par WebRTC
    assert.equal(info.videoSettings.bitrate, 1200);
    assert.equal(info.videoSettings.rate_control, "CBR");
    assert.equal(info.audioSettings.bitrate, 64);
    assert.equal(info.videoSettings.keyint_sec, 1); // image clé chaque seconde
    assert.equal(info.videoSettings.allow_frame_reordering, false);
    assert.equal((await obs.request<any>("link.whipStatus")).active, true);

    // L'envoi s'interrompt côté OBS : l'agent en est prévenu avec la raison
    const dropped = nextEvent(obs, "link.whip");
    h.cmd("whipdrop");
    assert.deepEqual(await dropped, { active: false, error: "réseau coupé" });

    // Arrêt demandé (plus personne ne regarde)
    await obs.request("link.whipStart", { server: "https://cam.example/obs_def/whip", kbps: 900, height: 360 });
    assert.equal((await h.whip()).server, "https://cam.example/obs_def/whip");
    await obs.request("link.whipStop");
    assert.equal((await h.whip()).stopped, true);
    assert.equal((await obs.request<any>("link.whipStatus")).active, false);
    obs.close();
  } finally {
    h.child.kill();
  }
});

run("aperçu vidéo : sans obs-webrtc ou si le serveur refuse, message clair (l'agent retombe sur les images)", async () => {
  const h = start();
  try {
    await h.expect(/READY/);
    const obs = new ObsIpc(h.sock);
    await obs.connect();
    h.cmd("loaded");
    await nextEvent(obs, "link.ready");
    h.cmd("whipfail");
    await new Promise((r) => setTimeout(r, 150));
    await assert.rejects(obs.request("link.whipStart", { server: "https://cam.example/obs_abc/whip" }), /HTTP 401/);
    assert.equal((await obs.request<any>("link.whipStatus")).active, false);
    h.cmd("nowhip");
    await new Promise((r) => setTimeout(r, 150));
    await assert.rejects(obs.request("link.whipStart", { server: "https://cam.example/obs_abc/whip" }), /ne sait pas envoyer en WHIP/);
    obs.close();
  } finally {
    h.child.kill();
  }
});

run("agent : l'aperçu vidéo ne démarre que si quelqu'un regarde, s'arrête avec lui, se replie sur les images si le serveur refuse", async () => {
  const h = start();
  const calls: string[] = [];
  let refuse = false;
  const core = createServer((req, res) => {
    calls.push(`${req.method} ${req.url}`);
    const send = (code: number, v: unknown) => (res.writeHead(code, { "content-type": "application/json" }), res.end(JSON.stringify(v)));
    if (req.url === "/v1/link/preview/start") return refuse ? send(503, { error: "off" }) : send(200, { path: "obs_x", whip_url: "https://cam.example/obs_x/whip" });
    return send(200, { ok: true });
  });
  await new Promise<void>((r) => core.listen(0, "127.0.0.1", r));
  process.env.SYXTEE_LINK_HOME = mkdtempSync(join(tmpdir(), "slk-home-"));
  process.env.SYXTEE_LINK_OBS_IPC = h.sock;
  let agent: InstanceType<typeof import("../src/agent.ts").Agent> | undefined;
  try {
    await h.expect(/READY/);
    h.cmd("loaded");
    const { Agent } = await import("../src/agent.ts");
    const { defaults } = await import("../src/config.ts");
    const cfg = { ...defaults(), core: `http://127.0.0.1:${(core.address() as AddressInfo).port}`, token: `slk_${"a".repeat(48)}` };
    const a = (agent = new Agent(cfg));
    const events: { name: string; data: any }[] = [];
    (a as any).send = (m: any) => m.type === "event" && events.push({ name: m.name, data: m.data });
    a.start();
    for (let i = 0; i < 50 && a.status.obs !== "on"; i++) await new Promise((r) => setTimeout(r, 100));
    a.status.core = "on"; // le Core de l'essai n'a pas de WebSocket : on simule la liaison établie

    // Personne ne regarde : rien ne part
    await a.managePreview();
    assert.equal(a.previewMode, "idle");
    assert.ok(!calls.includes("POST /v1/link/preview/start"));
    // Quelqu'un ouvre la page : session demandée au serveur, WHIP lancé dans OBS
    a.status.viewers = 1;
    await a.managePreview();
    assert.equal(a.previewMode, "video");
    assert.ok(calls.includes("POST /v1/link/preview/start"));
    assert.equal((await h.whip()).server, "https://cam.example/obs_x/whip");
    const lastMode = () => events.filter((e) => e.name === "link.previewMode").at(-1);
    assert.equal(lastMode()?.data.mode, "video");
    // Plus personne : l'envoi s'arrête, le serveur rend la session
    a.status.viewers = 0;
    await a.managePreview();
    assert.equal(a.previewMode, "idle");
    assert.equal((await h.whip()).stopped, true);
    assert.ok(calls.includes("POST /v1/link/preview/stop"));
    // « Couper l'aperçu » : même avec des spectateurs, rien ne part
    a.status.viewers = 2;
    cfg.previewEnabled = false;
    (a as any).whip.failedAt = 0;
    await a.managePreview();
    assert.equal(a.previewMode, "idle");
    // Le serveur refuse : repli sur les images, avec la raison
    cfg.previewEnabled = true;
    refuse = true;
    await a.managePreview();
    assert.equal(a.previewMode, "jpeg");
    assert.match(String(lastMode()?.data.reason), /n'accepte pas/);
    // Pas de nouvel essai avant 30 s
    const before = calls.filter((c) => c === "POST /v1/link/preview/start").length;
    refuse = false;
    await a.managePreview();
    assert.equal(calls.filter((c) => c === "POST /v1/link/preview/start").length, before);
  } finally {
    agent?.stop();
    delete process.env.SYXTEE_LINK_OBS_IPC;
    core.close();
    h.child.kill();
  }
});

run("sources « Flux SYXTEE » : assistant à cases à cocher, une source par flux réutilisée dans plusieurs scènes, noms synchronisés avec le compte", async () => {
  const h = start();
  try {
    await h.expect(/READY/);
    const obs = new ObsIpc(h.sock);
    await obs.connect();
    h.cmd("loaded");
    await nextEvent(obs, "link.ready");
    // Le faux OBS a déjà une source « Flux › IPHONE 16 » à lui (cas réel : une autre extension). On n'y touche pas : la nôtre prend « (2) ».
    const IPH = "Flux › IPHONE 16 (2)";
    const dump = async () => JSON.parse((await h.grab("dump", "DUMP")).replace(/ ALIVE \d$/, ""));
    const relays = (extra: Record<string, unknown>[] = []) => ({
      relays: [
        { id: "r-iphone", name: "IPHONE 16", url: "srt://relais:9000?streamid=A", live: true },
        { id: "r-dji", name: "DJI POCKET", url: "srt://relais:9000?streamid=B", live: false },
        { id: "r-gopro", name: "GOPRO", url: "srt://relais:9000?streamid=C", live: false },
        ...extra,
      ],
    });

    // Liste des flux pas encore chargée : message clair
    await assert.rejects(obs.request("link.addRelaySources", { relayIds: ["r-iphone"], scenes: ["🎥 › DRONE"] }), /pas encore chargée/);
    assert.deepEqual(await obs.request("link.syncRelays", relays()), { renamed: 0, updated: 0, removed: 0 });
    await assert.rejects(obs.request("link.addRelaySources", { relayIds: ["r-inconnu"], scenes: ["🎥 › DRONE"] }), /Flux inconnu/);

    // Ajouter une source : le type « Flux SYXTEE » existe et liste TOUS les flux, avec leur état
    const needs = nextEvent(obs, "link.needRelays");
    assert.equal((await h.grab("wizard", "WIZARD")), "syxtee_flux");
    await needs; // l'assistant demande à l'agent de rafraîchir la liste
    const props = JSON.parse(await h.grab("wizardprops", "PROPS")) as { name: string; label: string; kind: number }[];
    const relayBoxes = props.filter((p) => p.name.startsWith("relay:"));
    assert.deepEqual(relayBoxes.map((p) => p.label), ["IPHONE 16 · en ligne", "DJI POCKET · hors ligne", "GOPRO · hors ligne"]);
    assert.ok(props.some((p) => p.name === "createRelay" && p.kind === 2), "bouton Créer un relais");
    assert.ok(props.some((p) => p.name === "add" && p.kind === 2), "bouton d'ajout");
    assert.deepEqual(props.filter((p) => p.name.startsWith("scene:")).map((p) => p.label), ["⏳ › ON COMMENCE BIENTÔT", "🔴 › EN DIRECT", "🎥 › DRONE", "📶 › CONNEXION PERDUE"]); // choix multiple de scènes

    // Cocher deux flux et deux scènes, valider : une source par flux, la MÊME source dans les deux scènes
    h.cmd("wizardset relay:r-iphone 1");
    h.cmd("wizardset relay:r-dji 1");
    h.cmd("wizardset scene:🎥 › DRONE 1");
    h.cmd("wizardset scene:🔴 › EN DIRECT 1");
    await new Promise((r) => setTimeout(r, 150));
    assert.equal(await h.grab("wizardclick add", "CLICK"), "1");
    await new Promise((r) => setTimeout(r, 200)); // l'assistant se retire (tâche différée)
    const d1 = await dump();
    const flux = d1.sources.filter((x: any) => x.settings.syxtee_relay_id);
    assert.deepEqual(flux.map((x: any) => x.name).sort(), ["Flux › DJI POCKET", IPH]);
    assert.ok(flux.every((x: any) => x.id === "ffmpeg_source" && x.settings.is_local_file === false && x.enabled));
    assert.equal(flux.find((x: any) => x.name === IPH).settings.input, "srt://relais:9000?streamid=A");
    assert.equal(d1.scenes["🎥 › DRONE"].filter((n: string) => n === IPH).length, 1);
    assert.ok(d1.scenes["🔴 › EN DIRECT"].includes(IPH) && d1.scenes["🔴 › EN DIRECT"].includes("Flux › DJI POCKET"));
    assert.equal(d1.sources.filter((x: any) => x.name === "Flux SYXTEE").length, 0, "l'assistant a disparu");

    // Même flux ajouté une 2e fois : pas de doublon (source ni élément de scène)
    await obs.request("link.addRelaySources", { relayIds: ["r-iphone"], scenes: ["🎥 › DRONE", "📶 › CONNEXION PERDUE"] });
    const d2 = await dump();
    assert.equal(d2.sources.filter((x: any) => x.settings.syxtee_relay_id === "r-iphone").length, 1);
    assert.equal(d2.scenes["🎥 › DRONE"].filter((n: string) => n === IPH).length, 1);
    assert.ok(d2.scenes["📶 › CONNEXION PERDUE"].includes(IPH));
    const items = (await obs.request<any>("GetSceneItemList", { sceneName: "🎥 › DRONE" })).sceneItems;
    assert.ok(items.some((i: any) => i.sourceName === IPH && i.syxteeRelayId === "r-iphone")); // reconnaissable par le diagnostic « Corriger »

    // Renommer la caméra sur le site : la source suit dans OBS ; adresse mise à jour ; relais supprimé : marqué et désactivé
    const renamed = relays();
    renamed.relays[0] = { id: "r-iphone", name: "IPHONE 17", url: "srt://relais:9000?streamid=A2", live: true };
    renamed.relays.splice(1, 1); // DJI POCKET supprimé du compte
    assert.deepEqual(await obs.request("link.syncRelays", renamed), { renamed: 1, updated: 1, removed: 1 });
    const d3 = await dump();
    const iphone = d3.sources.find((x: any) => x.settings.syxtee_relay_id === "r-iphone");
    assert.equal(iphone.name, "Flux › IPHONE 17");
    assert.equal(iphone.settings.input, "srt://relais:9000?streamid=A2");
    const dji = d3.sources.find((x: any) => x.settings.syxtee_relay_id === "r-dji");
    assert.equal(dji.name, "Flux › DJI POCKET (relais supprimé)");
    assert.equal(dji.enabled, false);
    assert.equal(dji.settings.syxtee_deleted, true);
    assert.deepEqual(await obs.request("link.syncRelays", renamed), { renamed: 0, updated: 0, removed: 0 }); // idempotent

    // Le relais revient (recréé, même identifiant) : la source se réactive et retrouve son nom
    assert.deepEqual(await obs.request("link.syncRelays", relays([{ id: "r-iphone", name: "IPHONE 17", url: "srt://relais:9000?streamid=A2", live: true }]).relays.length ? { relays: [{ id: "r-iphone", name: "IPHONE 17", url: "srt://relais:9000?streamid=A2", live: true }, { id: "r-dji", name: "DJI POCKET", url: "srt://relais:9000?streamid=B", live: true }] } : relays()), { renamed: 0, updated: 0, removed: 0 });
    const d4 = await dump();
    const back = d4.sources.find((x: any) => x.settings.syxtee_relay_id === "r-dji");
    assert.equal(back.name, "Flux › DJI POCKET");
    assert.equal(back.enabled, true);
    assert.equal(back.settings.syxtee_deleted, false);

    // Un nom donné à la main est respecté
    await obs.request("SetInputName", { inputName: "Flux › IPHONE 17", newInputName: "Ma caméra" });
    await obs.request("link.syncRelays", { relays: [{ id: "r-iphone", name: "IPHONE 18", url: "srt://relais:9000?streamid=A2", live: true }, { id: "r-dji", name: "DJI POCKET", url: "srt://relais:9000?streamid=B", live: true }] });
    assert.ok((await dump()).sources.some((x: any) => x.name === "Ma caméra" && x.settings.syxtee_relay_id === "r-iphone"));
    obs.close();
  } finally {
    h.child.kill();
  }
});

run("agent : les flux du compte vont au plugin (sources), le déclenchement du flux pilote la bascule, le débit est surveillé", async () => {
  const h = start();
  const calls: { m: string; url: string; body: string }[] = [];
  let kbps = 123;
  const core = createServer(async (req, res) => {
    const parts: Buffer[] = [];
    for await (const c of req) parts.push(c as Buffer);
    calls.push({ m: String(req.method), url: String(req.url), body: Buffer.concat(parts).toString() });
    const send = (code: number, v: unknown) => (res.writeHead(code, { "content-type": "application/json" }), res.end(JSON.stringify(v)));
    if (req.url === "/v1/link/streams") return send(200, { streams: [{ id: "r1", name: "IPHONE 16", protocol: "srtla", live: true, switch_trigger: "sensitive", obs_srt_url: "srt://relais:9000?streamid=play" }] });
    if (req.url === "/v1/link/streams/r1" && req.method === "PATCH") return send(200, { ok: true });
    if (req.url === "/v1/link/streams/r1/status") return send(200, { live: true, kbps });
    return send(200, { ok: true });
  });
  await new Promise<void>((r) => core.listen(0, "127.0.0.1", r));
  process.env.SYXTEE_LINK_HOME = mkdtempSync(join(tmpdir(), "slk-home-"));
  process.env.SYXTEE_LINK_OBS_IPC = h.sock;
  let agent: InstanceType<typeof import("../src/agent.ts").Agent> | undefined;
  try {
    await h.expect(/READY/);
    h.cmd("loaded");
    const { Agent } = await import("../src/agent.ts");
    const { defaults } = await import("../src/config.ts");
    const cfg = { ...defaults(), core: `http://127.0.0.1:${(core.address() as AddressInfo).port}`, token: `slk_${"a".repeat(48)}`, destination: "r1" };
    cfg.backup = { ...cfg.backup, enabled: true, source: "Flux › IPHONE 16", scene: "📶 › CONNEXION PERDUE", trigger: "cut" };
    const a = (agent = new Agent(cfg));
    a.start();
    for (let i = 0; i < 50 && a.status.obs !== "on"; i++) await new Promise((r) => setTimeout(r, 100));
    assert.equal(await a.syncRelays(true), true);
    assert.equal(a.relays.length, 1);
    // Le déclenchement choisi sur le flux (« Mes relais ») devient celui de la bascule
    assert.equal(cfg.backup.trigger, "sensitive");
    // Le plugin connaît le flux : « Corriger » peut créer sa source
    const other = new ObsIpc(h.sock);
    await other.connect();
    const added = await other.request<any>("link.addRelaySources", { relayIds: ["r1"], scenes: ["🎥 › DRONE"] });
    assert.deepEqual(added.created, ["Flux › IPHONE 16 (2)"]); // le faux OBS a déjà une source de ce nom, qu'on ne touche pas
    other.close();
    // Changer le déclenchement depuis le panneau Appareil : écrit sur le flux du compte
    assert.equal(await a.setTrigger("cut_lowbitrate"), "cut_lowbitrate");
    const patch = calls.find((c) => c.m === "PATCH");
    assert.equal(patch?.url, "/v1/link/streams/r1");
    assert.equal(JSON.parse(patch!.body).switch_trigger, "cut_lowbitrate");
    assert.equal(cfg.backup.trigger, "cut_lowbitrate");
    // Débit surveillé seulement avec un déclenchement au débit
    await (a as any).pollBitrate();
    assert.equal((a as any).watcher.bitrate, 123);
    kbps = 40;
    await (a as any).pollBitrate();
    assert.equal((a as any).watcher.bitrate, 40);
    await a.setTrigger("cut");
    const n = calls.filter((c) => c.url.endsWith("/status")).length;
    await (a as any).pollBitrate();
    assert.equal(calls.filter((c) => c.url.endsWith("/status")).length, n); // « coupure seulement » : aucun appel inutile
    assert.equal((a as any).watcher.bitrate, null);
  } finally {
    agent?.stop();
    delete process.env.SYXTEE_LINK_OBS_IPC;
    core.close();
    h.child.kill();
  }
});
