import { chromium } from "playwright";

// Essai de l'interface Contrôle à distance (npm run dev, puis node scripts/remote-ui-check.mjs [dossier-des-captures]).
// Faux Core : même protocole que le vrai (hello / req / res / event) et mêmes formes de réponse que le plugin (voir obsctl.cpp).
const BASE = process.env.BASE_URL ?? "http://localhost:3000";
const out = process.argv[2] ?? "/tmp";
const mixerTick = setInterval(() => {}, 1 << 30);

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
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, colorScheme: process.env.SCHEME ?? "dark", reducedMotion: "reduce" });
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

const check = (name, cond) => {
  console.log(cond ? "✔" : "✖", name);
  if (!cond) process.exitCode = 1;
};
await page.goto(`${BASE}/dev/vitrine/controle-obs`, { waitUntil: "load" });
await page.waitForSelector("text=ON COMMENCE BIENTÔT", { timeout: 20000 });
await page.waitForTimeout(1500);
await page.screenshot({ path: `${out}/remote-1-desktop.png` });
check("scènes réelles (emoji inclus)", (await page.locator('section[aria-label="Scènes"] ul button').count()) === 5);
check("profil et collection chargés", (await page.locator('select[aria-label="Profil OBS"]').inputValue()) === "Sans titre" && (await page.locator('select[aria-label="Collection de scènes"]').inputValue()) === "SYXTEE");
check("état du flux : flux reçu avec son nom", (await page.getByText("Flux › IPHONE 16").count()) >= 1);

await page.locator('section[aria-label="Scènes"] button', { hasText: "DRONE" }).click();
await page.waitForTimeout(400);
check("clic scène → OBS suit (appel)", calls.some((c) => c.startsWith("SetCurrentProgramScene") && c.includes("DRONE")));
check("événement → programme mis à jour", (await page.locator('section[aria-label="Programme"] p').first().textContent())?.includes("DRONE"));
socket.send(JSON.stringify({ type: "event", name: "CurrentProgramSceneChanged", data: { sceneName: "🔴 › EN DIRECT" } }));
await page.waitForTimeout(500);
check("changement dans OBS → le site suit", (await page.locator('section[aria-label="Programme"] p').first().textContent())?.includes("EN DIRECT"));
await page.waitForTimeout(600);
check("sources de la scène active", (await page.locator('section[aria-label="Sources de la scène"] ul li').count()) === 3);
check("type de source en français", (await page.locator('section[aria-label="Sources de la scène"]').textContent())?.includes("Média"));

await page.locator('button[aria-label="Masquer Titre"]').click();
await page.waitForTimeout(300);
check("œil → SetSceneItemEnabled", calls.some((c) => c.startsWith("SetSceneItemEnabled") && c.includes('"sceneItemEnabled":false')));
check("mixeur : 2 pistes audio (pas le texte)", (await page.locator('section[aria-label="Mélangeur audio"] ul li').count()) === 2);
await page.getByRole("button", { name: "Couper Micro" }).click();
await page.waitForTimeout(300);
check("mute → bouton « Réactiver »", (await page.getByRole("button", { name: "Réactiver Micro" }).count()) === 1);
// volume : un seul ordre toutes les 200 ms, le dernier toujours envoyé
const before = calls.filter((c) => c.startsWith("SetInputVolume")).length;
const fader = page.getByRole("slider", { name: "Volume Micro" });
for (const v of ["-30", "-25", "-20", "-12"]) await fader.fill(v);
await page.waitForTimeout(500);
const vols = calls.filter((c) => c.startsWith("SetInputVolume")).slice(before);
check("volume : ordres limités, le dernier envoyé", vols.length >= 1 && vols.length <= 3 && vols.at(-1).includes("-12"));

await page.getByRole("button", { name: "Passer en direct" }).first().click();
check("confirmation avant de partir en direct", await page.getByRole("heading", { name: "Partir en direct ?" }).isVisible());
await page.screenshot({ path: `${out}/remote-2-confirm.png` });
await page.locator("dialog button", { hasText: "Partir en direct" }).click();
await page.waitForTimeout(1800);
check("StartStream envoyé", calls.includes("StartStream"));
check("état retour : en direct + durée", (await page.getByRole("button", { name: /Arrêter le direct · \d\d:\d\d:\d\d/ }).count()) === 1);
check("mesures : débit 5120 kbit/s", (await page.locator('section[aria-label="Mesures du poste"]').textContent())?.includes("5120 kbit/s"));
await page.screenshot({ path: `${out}/remote-3-live.png` });
await page.locator('select[aria-label="Profil OBS"]').selectOption("Mobile 4G");
await page.waitForTimeout(500);
check("profil refusé pendant le direct : message d'OBS", (await page.getByText("pendant un direct").count()) >= 1);
await page.getByRole("button", { name: /Arrêter le direct ·/ }).click();
check("confirmation avant d'arrêter", await page.getByRole("heading", { name: "Arrêter le direct ?" }).isVisible());
await page.locator("dialog button", { hasText: "Arrêter le direct" }).click();
await page.waitForTimeout(500);
check("StopStream envoyé", calls.includes("StopStream"));
await page.getByRole("button", { name: "Enregistrer", exact: true }).click();
await page.waitForTimeout(400);
check("StartRecord envoyé", calls.includes("StartRecord"));
await page.locator('select[aria-label="Collection de scènes"]').selectOption("LAWCY_TV");
await page.waitForTimeout(500);
check("collection → SetCurrentSceneCollection", calls.some((c) => c.startsWith("SetCurrentSceneCollection") && c.includes("LAWCY_TV")));
await page.getByRole("switch", { name: "Mode Studio" }).click();
await page.waitForTimeout(600);
check("mode studio : aperçu + transition", (await page.getByRole("button", { name: "Transition" }).count()) === 1);
await page.screenshot({ path: `${out}/remote-4-studio.png` });
await page.getByRole("switch", { name: "Mode Studio" }).click();
// Régie
await page.getByRole("button", { name: "Régie automatique" }).click();
await page.waitForTimeout(300);
await page.getByRole("button", { name: /Secours si ta connexion coupe/ }).click();
await page.screenshot({ path: `${out}/remote-5-regie.png` });
check("régie : sensibilité du secours", (await page.getByText("Coupure et débit très bas").count()) === 1);
await page.getByLabel("Sensible", { exact: false }).first().check().catch(() => {});
await page.keyboard.press("Escape");
await page.waitForTimeout(200);
check("régie fermée avec Échap", (await page.locator("dialog[open]").count()) === 0);
await page.getByRole("button", { name: "Couper l'aperçu" }).first().click();
await page.waitForTimeout(400);
check("Couper l'aperçu → link.setPreview", calls.some((c) => c.startsWith("link.setPreview") && c.includes("false")));
check("aperçu coupé affiché", (await page.getByText("Aperçu coupé").count()) === 1);
// OBS fermé puis rouvert
socket.send(JSON.stringify({ type: "agent", online: false }));
await page.waitForTimeout(400);
check("OBS hors ligne : message + boutons désactivés", (await page.getByRole("alert").first().textContent())?.includes("plus en ligne") && (await page.getByRole("button", { name: "Passer en direct" }).first().isDisabled()));
await page.screenshot({ path: `${out}/remote-6-offline.png` });
await page.close();

const mobile = await ctx.newPage();
mobile.on("pageerror", (e) => console.log("pageerror", e.message));
await mobile.setViewportSize({ width: 390, height: 844 });
await mobile.routeWebSocket(/\/v1\/link\/remote/, (ws) => {
  ws.onMessage((raw) => {
    const m = JSON.parse(String(raw));
    if (m.type === "hello") ws.send(JSON.stringify({ type: "ready", agent: { online: true, id: "d1", name: "OBS-DJ-SYXTEE.local", platform: "darwin", version: "0.9.0", since: Date.now() - 39000 } }));
    else if (m.type === "req") handle(ws, m);
  });
  setInterval(() => ws.send(JSON.stringify({ type: "event", name: "link.levels", data: { Micro: -14, "Flux › IPHONE 16": -30 } })), 300);
});
await mobile.goto(`${BASE}/dev/vitrine/controle-obs`, { waitUntil: "load" });
await mobile.waitForSelector("text=ON COMMENCE");
await mobile.waitForTimeout(1200);
await mobile.screenshot({ path: `${out}/remote-7-mobile-scenes.png` });
for (const [tab, file] of [["Sources", "sources"], ["Audio", "audio"], ["Direct", "direct"], ["Multi", "multi"]]) {
  await mobile.getByRole("tab", { name: tab }).click();
  await mobile.waitForTimeout(350);
  await mobile.screenshot({ path: `${out}/remote-8-mobile-${file}.png` });
}
await mobile.getByRole("button", { name: "Régie automatique" }).click();
await mobile.waitForTimeout(400);
await mobile.screenshot({ path: `${out}/remote-9-mobile-regie.png` });
await mobile.keyboard.press("Escape");
await mobile.setViewportSize({ width: 844, height: 390 });
await mobile.waitForTimeout(500);
await mobile.screenshot({ path: `${out}/remote-10-mobile-paysage.png` });
await mobile.setViewportSize({ width: 390, height: 844 });
check("mobile : pas de défilement horizontal", await mobile.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1));
const small = await mobile.evaluate(() => [...document.querySelectorAll("button:not(:disabled), [role=tab], select, input")].filter((b) => b.getBoundingClientRect().width > 0 && b.getBoundingClientRect().height < 38 && !b.closest("[data-nextjs-dev-tools-button], nextjs-portal")).map((b) => `${b.tagName} ${b.getAttribute("aria-label") ?? b.textContent?.slice(0, 20)} ${Math.round(b.getBoundingClientRect().height)}`));
if (small.length) console.log(small.join("\n"));
check("mobile : cibles tactiles >= 38 px", small.length === 0);
clearInterval(mixerTick);
process.exit(process.exitCode ?? 0);
