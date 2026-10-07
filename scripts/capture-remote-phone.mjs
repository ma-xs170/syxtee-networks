import { chromium } from "playwright";

// Capture de la vraie interface « Contrôle à distance » sur un téléphone (390x844, x2), pour l'accueil du site et la page /application.
// npm run dev, puis node scripts/capture-remote-phone.mjs public/images/remote/controle-mobile.png
// Faux Core : mêmes messages que le vrai. L'image du programme est un exemple dessiné ici (aperçu en images).
const BASE = process.env.BASE_URL ?? "http://localhost:3000";
const out = process.argv[2] ?? "/tmp/controle-mobile.png";

const scenes = ["⏳ › ON COMMENCE BIENTÔT", "🔴 › EN DIRECT", "🎥 › DRONE", "📶 › CONNEXION PERDUE", "🔚 › FIN DE STREAM"];
const state = { program: scenes[1] };
const inputs = [
  { inputName: "Micro", inputKind: "coreaudio_input_capture", hasAudio: true, inputMuted: false, inputVolumeMul: 0.75, monitorType: "OBS_MONITORING_TYPE_NONE", global: true },
  { inputName: "Flux › OSMO POCKET", inputKind: "ffmpeg_source", hasAudio: true, inputMuted: false, inputVolumeMul: 1, monitorType: "OBS_MONITORING_TYPE_NONE" },
];

function handle(ws, m) {
  const ok = (result = {}) => ws.send(JSON.stringify({ type: "res", id: m.id, ok: true, result }));
  switch (m.method) {
    case "link.getInfo": return ok({ version: "0.4.0" });
    case "GetSceneList": return ok({ scenes: [...scenes].reverse().map((sceneName) => ({ sceneName })), currentProgramSceneName: state.program });
    case "GetStudioModeEnabled": return ok({ studioModeEnabled: false });
    case "GetStreamStatus": return ok({ outputActive: true });
    case "GetRecordStatus": return ok({ outputActive: false, outputPaused: false });
    case "GetInputList": return ok({ inputs });
    case "GetSceneTransitionList": return ok({ transitions: [{ transitionName: "Fondu" }], currentSceneTransitionName: "Fondu" });
    case "link.getBackup": return ok({ enabled: false, source: "", scene: "", freezeSeconds: 4, recoverSeconds: 3, trigger: "cut", liveScene: "", state: "idle" });
    case "GetProfileList": return ok({ profiles: ["IRL : SYXTEE"], currentProfileName: "IRL : SYXTEE" });
    case "GetSceneCollectionList": return ok({ sceneCollections: ["SYXTEE"], currentSceneCollectionName: "SYXTEE" });
    case "link.getPreview": return ok({ enabled: true, mode: "jpeg", reason: "" });
    case "GetMediaInputStatus": return ok({ mediaState: "OBS_MEDIA_INPUT_STATE_PLAYING" });
    case "GetSceneItemList": return ok({ sceneItems: [{ sceneItemId: 1, sourceName: "Flux › OSMO POCKET", sceneItemEnabled: true, inputKind: "ffmpeg_source", sourceType: "OBS_SOURCE_TYPE_INPUT" }, { sceneItemId: 2, sourceName: "Micro", sceneItemEnabled: true, inputKind: "coreaudio_input_capture", sourceType: "OBS_SOURCE_TYPE_INPUT" }] });
    default: return ok();
  }
}

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, colorScheme: "dark", reducedMotion: "reduce", hasTouch: true, isMobile: true });
const page = await ctx.newPage();
// Image d'exemple du programme (dessinée dans la page : ciel, route, silhouette).
const frame = await page.evaluate(() => {
  const c = Object.assign(document.createElement("canvas"), { width: 640, height: 360 });
  const g = c.getContext("2d");
  const sky = g.createLinearGradient(0, 0, 0, 360);
  sky.addColorStop(0, "#35405a");
  sky.addColorStop(0.55, "#a5806a");
  sky.addColorStop(1, "#1b1a1c");
  g.fillStyle = sky;
  g.fillRect(0, 0, 640, 360);
  g.fillStyle = "#101012";
  g.beginPath();
  g.moveTo(0, 360);
  g.lineTo(250, 230);
  g.lineTo(390, 230);
  g.lineTo(640, 360);
  g.fill();
  g.fillStyle = "#0b0b0c";
  g.fillRect(300, 150, 40, 90);
  g.beginPath();
  g.arc(320, 135, 22, 0, 7);
  g.fill();
  return c.toDataURL("image/jpeg", 0.8);
});
await page.routeWebSocket(/\/v1\/link\/remote/, (ws) => {
  ws.onMessage((raw) => {
    const m = JSON.parse(String(raw));
    if (m.type === "hello") {
      ws.send(JSON.stringify({ type: "ready", agent: { online: true, id: "d1", name: "OBS-DJ-SYXTEE.local", platform: "darwin", version: "0.4.0", since: Date.now() - 39000 } }));
      setInterval(() => ws.send(JSON.stringify({ type: "event", name: "link.preview", data: { scene: state.program, image: frame } })), 200);
      setInterval(() => ws.send(JSON.stringify({ type: "event", name: "link.levels", data: { Micro: -17, "Flux › OSMO POCKET": -28 } })), 300);
      setInterval(() => ws.send(JSON.stringify({ type: "event", name: "link.stats", data: { cpuUsage: 11, activeFps: 60, stream: { outputActive: true, outputDuration: 2_460_000, kbps: 4210, encoder: "Apple VT H264", outputCongestion: 0 }, record: { outputActive: false } } })), 1000);
    } else if (m.type === "req") handle(ws, m);
  });
});
await page.goto(`${BASE}/dev/vitrine/controle-obs`, { waitUntil: "load" });
await page.waitForSelector("text=EN DIRECT", { timeout: 15000 });
await page.waitForTimeout(2500);
await page.addStyleTag({ content: "nextjs-portal{display:none!important} section[aria-label=Programme] p[role=status]{display:none}" });
await page.waitForTimeout(300);
await page.screenshot({ path: out });
// Les autres panneaux (même nom de fichier, suffixe de l'onglet) : sources, mixer, contrôles.
for (const [tab, name] of [["Sources", "sources"], ["Mixer", "mixer"], ["Contrôles", "controles"]]) {
  await page.getByRole("tab", { name: tab }).click();
  await page.waitForTimeout(500);
  await page.screenshot({ path: out.replace(/\.png$/, `-${name}.png`) });
}
console.log("capture :", out);
await browser.close();
process.exit(0);
