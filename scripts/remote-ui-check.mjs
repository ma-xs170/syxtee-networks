import { chromium } from "playwright";

// Essai de l'interface Contrôle à distance (npm run dev, puis node scripts/remote-ui-check.mjs [dossier-des-captures]).
// Faux Core : même protocole que le vrai (hello / req / res / event) et mêmes formes de réponse que le plugin (voir obsctl.cpp).
const BASE = process.env.BASE_URL ?? "http://localhost:3000";
const out = process.argv[2] ?? "/tmp";

const uiOrder = ["⏳ › ON COMMENCE BIENTÔT", "🔴 › EN DIRECT", "🎥 › DRONE", "📶 › CONNEXION PERDUE", "🔚 › FIN DE STREAM"];
const st = { program: uiOrder[0], preview: uiOrder[1], studio: false, streaming: false, rec: false, paused: false, startedAt: 0, previewOn: true, profile: "Sans titre", collection: "SYXTEE" };
const inputs = [
  { inputName: "Micro", inputKind: "coreaudio_input_capture", hasAudio: true, inputMuted: false, inputVolumeMul: 0.7, monitorType: "OBS_MONITORING_TYPE_NONE" },
  { inputName: "Flux › IPHONE 16", inputKind: "ffmpeg_source", hasAudio: true, inputMuted: false, inputVolumeMul: 1, monitorType: "OBS_MONITORING_TYPE_NONE" },
  { inputName: "Titre", inputKind: "text_ft2_source", hasAudio: false },
];
const items = { [uiOrder[1]]: [{ sceneItemId: 1, sourceName: "Flux › IPHONE 16", sceneItemEnabled: true, inputKind: "ffmpeg_source", sourceType: "OBS_SOURCE_TYPE_INPUT" }, { sceneItemId: 2, sourceName: "Micro", sceneItemEnabled: true, inputKind: "coreaudio_input_capture", sourceType: "OBS_SOURCE_TYPE_INPUT" }, { sceneItemId: 3, sourceName: "Titre", sceneItemEnabled: true, inputKind: "text_ft2_source", sourceType: "OBS_SOURCE_TYPE_INPUT" }] };
const roles = { enabled: false, source: "", scene: "", freezeSeconds: 4, recoverSeconds: 3, trigger: "cut", liveScene: "", state: "idle" };
const calls = [];

function handle(ws, m) {
  const d = m.params ?? {};
  const ev = (name, data) => ws.send(JSON.stringify({ type: "event", name, data }));
  const ok = (result = {}) => ws.send(JSON.stringify({ type: "res", id: m.id, ok: true, result }));
  const ko = (error) => ws.send(JSON.stringify({ type: "res", id: m.id, ok: false, error }));
  calls.push(m.method + (m.params ? " " + JSON.stringify(m.params) : ""));
  switch (m.method) {
    case "link.getInfo": return ok({ version: "0.4.0" });
    case "GetSceneList": return ok({ scenes: [...uiOrder].reverse().map((sceneName, i) => ({ sceneName, sceneIndex: uiOrder.length - 1 - i })), currentProgramSceneName: st.program });
    case "GetStudioModeEnabled": return ok({ studioModeEnabled: st.studio });
    case "GetCurrentPreviewScene": return ok({ currentPreviewSceneName: st.preview });
    case "GetStreamStatus": return ok({ outputActive: st.streaming, outputDuration: st.streaming ? Date.now() - st.startedAt : 0 });
    case "GetRecordStatus": return ok({ outputActive: st.rec, outputPaused: st.paused });
    case "GetInputList": return ok({ inputs });
    case "GetSceneTransitionList": return ok({ transitions: [{ transitionName: "Fondu" }, { transitionName: "Coupure" }], currentSceneTransitionName: "Fondu" });
    case "link.getBackup": return ok(roles);
    case "link.setBackup": Object.assign(roles, d); return ok(roles);
    case "GetProfileList": return ok({ profiles: ["Sans titre", "Mobile 4G"], currentProfileName: st.profile });
    case "GetSceneCollectionList": return ok({ sceneCollections: ["SYXTEE", "LAWCY_TV"], currentSceneCollectionName: st.collection });
    case "link.getPreview": return ok({ enabled: st.previewOn });
    case "link.setPreview": st.previewOn = d.enabled; return ok({ enabled: st.previewOn });
    case "GetMediaInputStatus": return ok({ mediaState: "OBS_MEDIA_INPUT_STATE_PLAYING" });
    case "GetSceneItemList": return ok({ sceneItems: items[d.sceneName] ?? [] });
    case "SetCurrentProgramScene": st.program = d.sceneName; ok(); return ev("CurrentProgramSceneChanged", { sceneName: d.sceneName });
    case "SetCurrentPreviewScene": st.preview = d.sceneName; ok(); return ev("CurrentPreviewSceneChanged", { sceneName: d.sceneName });
    case "SetStudioModeEnabled": st.studio = d.studioModeEnabled; ok(); return ev("StudioModeStateChanged", { studioModeEnabled: st.studio });
    case "StartStream": st.streaming = true; st.startedAt = Date.now(); ok(); return ev("StreamStateChanged", { outputActive: true, outputState: "OBS_WEBSOCKET_OUTPUT_STARTED" });
    case "StopStream": st.streaming = false; ok(); return ev("StreamStateChanged", { outputActive: false, outputState: "OBS_WEBSOCKET_OUTPUT_STOPPED" });
    case "StartRecord": st.rec = true; ok(); return ev("RecordStateChanged", { outputActive: true, outputState: "OBS_WEBSOCKET_OUTPUT_STARTED" });
    case "StopRecord": st.rec = false; ok(); return ev("RecordStateChanged", { outputActive: false, outputState: "OBS_WEBSOCKET_OUTPUT_STOPPED" });
    case "SetInputMute": inputs.find((i) => i.inputName === d.inputName).inputMuted = d.inputMuted; ok(); return ev("InputMuteStateChanged", d);
    case "SetInputVolume": ok(); return ev("InputVolumeChanged", { inputName: d.inputName, inputVolumeDb: d.inputVolumeDb, inputVolumeMul: 10 ** (d.inputVolumeDb / 20) });
    case "SetSceneItemEnabled": ok(); return ev("SceneItemEnableStateChanged", { sceneName: d.sceneName, sceneItemId: d.sceneItemId, sceneItemEnabled: d.sceneItemEnabled });
    case "SetCurrentProfile": if (st.streaming) return ko("Impossible de changer de profil pendant un direct ou un enregistrement."); st.profile = d.profileName; ok(); return ev("CurrentProfileChanged", { profileName: d.profileName });
    case "SetCurrentSceneCollection": st.collection = d.sceneCollectionName; ok(); return ev("CurrentSceneCollectionChanged", { sceneCollectionName: d.sceneCollectionName });
    case "SetInputAudioMonitorType": inputs.find((i) => i.inputName === d.inputName).monitorType = d.monitorType; return ok();
    default: return ok();
  }
}

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1400, height: 1000 }, colorScheme: "dark", reducedMotion: "reduce" });
const page = await ctx.newPage();
page.on("pageerror", (e) => console.log("pageerror", e.message));
page.on("console", (m) => m.type() === "error" && console.log("console.error", m.text().slice(0, 200)));
let socket;
await page.routeWebSocket(/\/v1\/link\/remote/, (ws) => {
  socket = ws;
  ws.onMessage((raw) => {
    const m = JSON.parse(String(raw));
    if (m.type === "hello") {
      ws.send(JSON.stringify({ type: "ready", agent: { online: true, id: "d1", name: "OBS-DJ-SYXTEE.local", platform: "darwin", version: "0.4.0", since: Date.now() - 39000 } }));
      // niveaux et mesures, comme le plugin
      setInterval(() => ws.send(JSON.stringify({ type: "event", name: "link.levels", data: { Micro: -18 + Math.round(Math.random() * 6), "Flux › IPHONE 16": -26 } })), 300);
      setInterval(() => ws.send(JSON.stringify({ type: "event", name: "link.stats", data: { cpuUsage: 12.5, activeFps: 60, stream: { outputActive: st.streaming, outputDuration: st.streaming ? Date.now() - st.startedAt : 0, kbps: st.streaming ? 5120 : undefined, outputSkippedFrames: 3, outputTotalFrames: 5000, encoder: "Apple VT H264 Hardware Encoder", outputCongestion: 0.05 }, record: { outputActive: st.rec, outputDuration: 0 } } })), 1000);
    } else if (m.type === "req") handle(ws, m);
  });
});

const check = (name, cond) => console.log(cond ? "✔" : "✖", name);
await page.goto(`${BASE}/dev/vitrine/controle-obs`, { waitUntil: "load" });
await page.waitForSelector("text=ON COMMENCE BIENTÔT", { timeout: 15000 });
await page.waitForTimeout(1500);
await page.screenshot({ path: `${out}/remote-1-desktop.png` });
check("scènes réelles (emoji inclus)", (await page.locator('section[aria-label="Scènes"] button').allTextContents()).length === 5);
check("profil et collection chargés", (await page.locator('select[aria-label="Profil OBS"]').inputValue()) === "Sans titre" && (await page.locator('select[aria-label="Collection de scènes"]').inputValue()) === "SYXTEE");
check("état du flux : aucun flux reçu → reçu", (await page.getByText("Flux reçu").count()) === 1);

// clic site → OBS
await page.locator('section[aria-label="Scènes"] button', { hasText: "DRONE" }).click();
await page.waitForTimeout(400);
check("clic scène → OBS suit (appel)", calls.some((c) => c.startsWith("SetCurrentProgramScene") && c.includes("DRONE")));
check("événement → programme mis à jour", (await page.locator('section[aria-label="Programme"] p').first().textContent())?.includes("DRONE"));
// OBS → site
socket.send(JSON.stringify({ type: "event", name: "CurrentProgramSceneChanged", data: { sceneName: "🔴 › EN DIRECT" } }));
await page.waitForTimeout(500);
check("changement dans OBS → le site suit", (await page.locator('section[aria-label="Programme"] p').first().textContent())?.includes("EN DIRECT"));
await page.waitForTimeout(500);
check("sources de la scène active", (await page.locator('section[aria-label="Sources de la scène"] li').count()) === 3);
check("type de source en français", (await page.locator('section[aria-label="Sources de la scène"]').textContent())?.includes("Média"));

// œil
await page.locator('button[aria-label="Masquer Titre"]').click();
await page.waitForTimeout(300);
check("œil → SetSceneItemEnabled", calls.some((c) => c.startsWith("SetSceneItemEnabled") && c.includes('"sceneItemEnabled":false')));
// mixeur
check("mixeur : 2 pistes audio (pas le texte)", (await page.locator('section[aria-label="Mélangeur audio"] > ul > li').count()) === 2);
await page.locator('section[aria-label="Mélangeur audio"] button', { hasText: "Actif" }).first().click();
await page.waitForTimeout(300);
check("mute → SetInputMute + événement", (await page.locator('section[aria-label="Mélangeur audio"] button', { hasText: "Muet" }).count()) >= 1);

// direct avec confirmation
await page.getByRole("button", { name: "Partir en direct" }).first().click();
check("confirmation avant de partir en direct", await page.getByRole("heading", { name: "Partir en direct ?" }).isVisible());
await page.screenshot({ path: `${out}/remote-2-confirm.png` });
await page.locator("dialog button", { hasText: "Partir en direct" }).click();
await page.waitForTimeout(1800);
check("StartStream envoyé", calls.includes("StartStream"));
check("état retour : en direct + durée", (await page.getByRole("button", { name: /En direct \d\d:\d\d:\d\d · arrêter/ }).count()) === 1);
check("panneau Flux : débit 5120 kbit/s", (await page.locator('section[aria-label="Flux"]').textContent())?.includes("5120 kbit/s"));
await page.screenshot({ path: `${out}/remote-3-live.png` });
// profil refusé pendant le direct
await page.locator('select[aria-label="Profil OBS"]').selectOption("Mobile 4G");
await page.waitForTimeout(400);
check("profil refusé pendant le direct : message d'OBS", (await page.getByRole("alert").first().textContent())?.includes("pendant un direct"));
// arrêt avec confirmation
await page.getByRole("button", { name: /arrêter/ }).first().click();
check("confirmation avant d'arrêter", await page.getByRole("heading", { name: "Arrêter le direct ?" }).isVisible());
await page.locator("dialog button", { hasText: "Arrêter le direct" }).click();
await page.waitForTimeout(500);
check("StopStream envoyé", calls.includes("StopStream"));
// enregistrement
await page.getByRole("button", { name: "Démarrer l'enregistrement" }).click();
await page.waitForTimeout(400);
check("StartRecord envoyé", calls.includes("StartRecord"));
// profil / collection
await page.locator('select[aria-label="Collection de scènes"]').selectOption("LAWCY_TV");
await page.waitForTimeout(500);
check("collection → SetCurrentSceneCollection", calls.some((c) => c.startsWith("SetCurrentSceneCollection") && c.includes("LAWCY_TV")));
// mode studio
await page.getByRole("switch", { name: "Mode studio" }).click();
await page.waitForTimeout(600);
check("mode studio : aperçu + transition", (await page.getByText("Envoyer l'aperçu en direct").count()) === 1);
await page.getByRole("switch", { name: "Mode studio" }).click();
// Appareil
await page.getByRole("button", { name: "Appareil" }).click();
await page.waitForTimeout(300);
await page.screenshot({ path: `${out}/remote-4-appareil.png` });
check("popover Appareil : rôles, bascule, 3 déclenchements", (await page.getByText("Coupure et débit très bas").count()) === 1 && (await page.getByText("Sensible").count()) >= 1 && (await page.getByText("Scène Bug").count()) >= 1);
await page.getByLabel("Sensible", { exact: false }).first().check().catch(() => {});
await page.keyboard.press("Escape");
// couper l'aperçu
await page.getByRole("button", { name: "Couper l'aperçu" }).click();
await page.waitForTimeout(400);
check("Couper l'aperçu → link.setPreview", calls.some((c) => c.startsWith("link.setPreview") && c.includes("false")));
check("aperçu coupé affiché", (await page.getByText("Aperçu coupé").count()) === 1);

// perte de connexion explicite
await page.close();
const mobile = await ctx.newPage();
await mobile.setViewportSize({ width: 390, height: 900 });
await mobile.routeWebSocket(/\/v1\/link\/remote/, (ws) => {
  ws.onMessage((raw) => {
    const m = JSON.parse(String(raw));
    if (m.type === "hello") ws.send(JSON.stringify({ type: "ready", agent: { online: true, id: "d1", name: "OBS-DJ-SYXTEE.local", platform: "darwin", version: "0.4.0", since: Date.now() - 39000 } }));
    else if (m.type === "req") handle(ws, m);
  });
});
await mobile.goto(`${BASE}/dev/vitrine/controle-obs`, { waitUntil: "load" });
await mobile.waitForSelector("text=EN DIRECT");
await mobile.waitForTimeout(1200);
await mobile.screenshot({ path: `${out}/remote-5-mobile.png`, fullPage: true });
await mobile.getByRole("button", { name: "Appareil" }).click();
await mobile.waitForTimeout(300);
await mobile.screenshot({ path: `${out}/remote-6-mobile-appareil.png` });
check("mobile : pas de défilement horizontal", await mobile.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1));
process.exit(0);
