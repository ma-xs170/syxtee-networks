import assert from "node:assert/strict";
import { spawn, type ChildProcessWithoutNullStreams } from "node:child_process";
import { existsSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { ObsIpc } from "../src/obsipc.ts";

// Le VRAI code de pilotage du plugin (plugin/qt/obsctl.cpp) branché sur un faux OBS en mémoire (plugin/qt/test/obs-stub.cpp),
// parlé par le VRAI client de l'agent (obsipc.ts). Ne prouve PAS le comportement de libobs : seulement le protocole, les demandes,
// les formes de réponse et les événements. Lancé seulement si OBSCTL_HOST pointe vers l'exécutable (voir scripts/build-obsctl-host.sh).
const HOST = process.env.OBSCTL_HOST ?? "";
const run = HOST && existsSync(HOST) ? test : test.skip;

function start() {
  const sock = join(mkdtempSync(join(tmpdir(), "slk-ipc-")), "obs.sock");
  const child: ChildProcessWithoutNullStreams = spawn(HOST, [sock], { env: { ...process.env, QT_PLUGIN_PATH: join(process.env.HOME ?? "", "Qt/6.11.1/macos/plugins") } });
  let out = "";
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
  return { sock, child, expect, cmd: (c: string) => child.stdin.write(c + "\n"), state: async () => { const before = out.length; child.stdin.write("state\n"); await new Promise((r) => setTimeout(r, 150)); const m = /STATE (\{.*\})/.exec(out.slice(before)); return m ? JSON.parse(m[1]) : null; } };
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
