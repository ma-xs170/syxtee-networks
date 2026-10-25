import { chromium } from "playwright";
import { execFileSync } from "node:child_process";
import { mkdirSync, readdirSync, renameSync, rmSync } from "node:fs";
import { join } from "node:path";

// Vidéos courtes en boucle de la VRAIE interface « Contrôle à distance » (ordinateur et téléphone), pour les maquettes d'appareils de l'accueil.
// Faux Core : mêmes messages que le vrai. Les niveaux audio bougent, le direct est « EN DIRECT », la scène change (EN DIRECT, DRONE, EN DIRECT),
// l'image du programme est dessinée ici (coucher de soleil, drone). Sortie : public/videos/*.mp4 et *.webm, sans son.
// npm run dev, puis node scripts/capture-remote-video.mjs  (ffmpeg requis)
const BASE = process.env.BASE_URL ?? "http://localhost:3000";
const OUT = "public/videos";
const TMP = "/tmp/syxtee-video";
mkdirSync(OUT, { recursive: true });
rmSync(TMP, { recursive: true, force: true });
mkdirSync(TMP, { recursive: true });

const SCENES = ["⏳ › ON COMMENCE BIENTÔT", "🔴 › EN DIRECT", "🎥 › DRONE", "📶 › CONNEXION PERDUE", "🔚 › FIN DE STREAM"];
const ITEMS = {
  [SCENES[1]]: [
    { sceneItemId: 1, sourceName: "Flux › OSMO POCKET", sceneItemEnabled: true, inputKind: "ffmpeg_source", sourceType: "OBS_SOURCE_TYPE_INPUT" },
    { sceneItemId: 2, sourceName: "Micro", sceneItemEnabled: true, inputKind: "coreaudio_input_capture", sourceType: "OBS_SOURCE_TYPE_INPUT" },
    { sceneItemId: 3, sourceName: "Chat en direct", sceneItemEnabled: true, inputKind: "browser_source", sourceType: "OBS_SOURCE_TYPE_INPUT" },
  ],
  [SCENES[2]]: [
    { sceneItemId: 4, sourceName: "Flux › DRONE", sceneItemEnabled: true, inputKind: "ffmpeg_source", sourceType: "OBS_SOURCE_TYPE_INPUT" },
    { sceneItemId: 2, sourceName: "Micro", sceneItemEnabled: true, inputKind: "coreaudio_input_capture", sourceType: "OBS_SOURCE_TYPE_INPUT" },
  ],
};
const INPUTS = [
  { inputName: "Micro", inputKind: "coreaudio_input_capture", hasAudio: true, inputMuted: false, inputVolumeMul: 0.75, monitorType: "OBS_MONITORING_TYPE_NONE", global: true },
  { inputName: "Flux › OSMO POCKET", inputKind: "ffmpeg_source", hasAudio: true, inputMuted: false, inputVolumeMul: 1, monitorType: "OBS_MONITORING_TYPE_NONE" },
  { inputName: "Flux › DRONE", inputKind: "ffmpeg_source", hasAudio: true, inputMuted: false, inputVolumeMul: 0.6, monitorType: "OBS_MONITORING_TYPE_NONE" },
];
// Déroulé d'une boucle de 10,5 s : EN DIRECT, DRONE, EN DIRECT.
const TIMELINE = [[0, 1], [3500, 2], [7000, 1]];

const browser = await chromium.launch();

/** Images du programme, dessinées dans la page : 14 par scène (la silhouette bouge, les nuages défilent). */
async function frames(page) {
  return page.evaluate(() => {
    const out = { 1: [], 2: [] };
    const N = 14;
    for (let i = 0; i < N; i++) {
      const t = i / N;
      const c = Object.assign(document.createElement("canvas"), { width: 640, height: 360 });
      const g = c.getContext("2d");
      // Coucher de soleil : une silhouette marche sur une jetée.
      let sky = g.createLinearGradient(0, 0, 0, 360);
      sky.addColorStop(0, "#2d3a58");
      sky.addColorStop(0.5, "#b78a70");
      sky.addColorStop(0.62, "#e0a870");
      sky.addColorStop(1, "#15141a");
      g.fillStyle = sky;
      g.fillRect(0, 0, 640, 360);
      g.fillStyle = "#0e0d11";
      g.beginPath();
      g.moveTo(0, 360);
      g.lineTo(230, 232);
      g.lineTo(410, 232);
      g.lineTo(640, 360);
      g.fill();
      const x = 270 + Math.sin(t * Math.PI * 2) * 40;
      g.fillRect(x, 160, 22, 70);
      g.beginPath();
      g.arc(x + 11, 150, 14, 0, 7);
      g.fill();
      out[1].push(c.toDataURL("image/jpeg", 0.78));
      // Drone : mer et côte vues d'en haut, les nuages défilent.
      const d = Object.assign(document.createElement("canvas"), { width: 640, height: 360 });
      const h = d.getContext("2d");
      const sea = h.createLinearGradient(0, 0, 0, 360);
      sea.addColorStop(0, "#5f86a8");
      sea.addColorStop(0.55, "#2f5f84");
      sea.addColorStop(1, "#173a56");
      h.fillStyle = sea;
      h.fillRect(0, 0, 640, 360);
      h.fillStyle = "#3b4a3a";
      h.beginPath();
      h.moveTo(0, 360);
      h.lineTo(0, 250);
      h.bezierCurveTo(140, 200, 260, 270, 420, 230);
      h.bezierCurveTo(520, 205, 600, 240, 640, 225);
      h.lineTo(640, 360);
      h.fill();
      h.fillStyle = "rgba(255,255,255,0.35)";
      for (let k = 0; k < 4; k++) {
        const cx = ((k * 190 + t * 640) % 760) - 60;
        h.beginPath();
        h.ellipse(cx, 60 + k * 28, 80, 16, 0, 0, 7);
        h.fill();
      }
      out[2].push(d.toDataURL("image/jpeg", 0.78));
    }
    return out;
  });
}

async function record(name, viewport, mobile, size) {
  const ctx = await browser.newContext({
    viewport,
    deviceScaleFactor: 1,
    colorScheme: "dark",
    reducedMotion: "no-preference",
    isMobile: mobile,
    hasTouch: mobile,
    recordVideo: { dir: TMP, size },
  });
  const page = await ctx.newPage();
  const pics = await frames(page);
  const st = { program: SCENES[1], start: Date.now() };
  let frameN = 0;
  await page.routeWebSocket(/\/v1\/link\/remote/, (ws) => {
    const send = (o) => ws.send(JSON.stringify(o));
    const ev = (name, data) => send({ type: "event", name, data });
    ws.onMessage((raw) => {
      const m = JSON.parse(String(raw));
      if (m.type === "hello") {
        send({ type: "ready", agent: { online: true, id: "d1", name: "OBS-DJ-SYXTEE.local", platform: "darwin", version: "0.4.0", since: Date.now() - 39000 } });
        setInterval(() => ev("link.preview", { scene: st.program, image: pics[st.program === SCENES[2] ? 2 : 1][frameN++ % 14] }), 90);
        setInterval(() => {
          const lvl = () => -30 + Math.round(Math.random() * 14);
          ev("link.levels", { Micro: lvl() + 4, "Flux › OSMO POCKET": lvl() - 4, "Flux › DRONE": lvl() - 8 });
        }, 70);
        setInterval(() => ev("link.stats", { cpuUsage: 11, activeFps: 60, stream: { outputActive: true, outputDuration: 2_460_000 + (Date.now() - st.start), kbps: 4000 + Math.round(Math.random() * 400), encoder: "Apple VT H264", outputCongestion: 0 }, record: { outputActive: false } }), 1000);
        // Changements de scène, sur la boucle de 10,5 s (la première image de la vidéo est coupée au montage : 3 s).
        const loop = () => {
          const t0 = Date.now();
          for (const [at, idx] of TIMELINE) setTimeout(() => ((st.program = SCENES[idx]), ev("CurrentProgramSceneChanged", { sceneName: st.program })), at);
          setTimeout(loop, 10500 - (Date.now() - t0) + 0);
        };
        loop();
      } else if (m.type === "req") {
        const ok = (result = {}) => send({ type: "res", id: m.id, ok: true, result });
        switch (m.method) {
          case "link.getInfo": return ok({ version: "0.4.0" });
          case "GetSceneList": return ok({ scenes: [...SCENES].reverse().map((sceneName) => ({ sceneName })), currentProgramSceneName: st.program });
          case "GetStudioModeEnabled": return ok({ studioModeEnabled: false });
          case "GetStreamStatus": return ok({ outputActive: true });
          case "GetRecordStatus": return ok({ outputActive: false, outputPaused: false });
          case "GetInputList": return ok({ inputs: INPUTS });
          case "GetSceneTransitionList": return ok({ transitions: [{ transitionName: "Fondu" }], currentSceneTransitionName: "Fondu" });
          case "link.getBackup": return ok({ enabled: false, source: "", scene: "", freezeSeconds: 4, recoverSeconds: 3, trigger: "cut", liveScene: "", state: "idle" });
          case "GetProfileList": return ok({ profiles: ["IRL : SYXTEE"], currentProfileName: "IRL : SYXTEE" });
          case "GetSceneCollectionList": return ok({ sceneCollections: ["SYXTEE"], currentSceneCollectionName: "SYXTEE" });
          case "link.getPreview": return ok({ enabled: true, mode: "jpeg", reason: "" });
          case "GetMediaInputStatus": return ok({ mediaState: "OBS_MEDIA_INPUT_STATE_PLAYING" });
          case "GetSceneItemList": return ok({ sceneItems: ITEMS[m.params?.sceneName] ?? ITEMS[SCENES[1]] });
          default: return ok();
        }
      }
    });
  });
  await page.goto(`${BASE}/dev/vitrine/controle-obs`, { waitUntil: "load" });
  await page.addStyleTag({ content: "nextjs-portal{display:none!important} section[aria-label=Programme] p[role=status]{display:none}" });
  // 3 s de chargement (coupées), puis 10,5 s de boucle
  await page.waitForTimeout(3000 + 10500 + 400);
  await page.close();
  await ctx.close();
  const file = readdirSync(TMP).filter((f) => f.endsWith(".webm")).sort().at(-1);
  const raw = join(TMP, `${name}-raw.webm`);
  renameSync(join(TMP, file), raw);
  const vf = `scale=${size.width}:${size.height},fps=30`;
  execFileSync("ffmpeg", ["-y", "-loglevel", "error", "-ss", "3", "-t", "10.5", "-i", raw, "-an", "-vf", vf, "-c:v", "libx264", "-preset", "slow", "-crf", "29", "-pix_fmt", "yuv420p", "-movflags", "+faststart", join(OUT, `${name}.mp4`)]);
  execFileSync("ffmpeg", ["-y", "-loglevel", "error", "-ss", "3", "-t", "10.5", "-i", raw, "-an", "-vf", vf, "-c:v", "libvpx-vp9", "-crf", "38", "-b:v", "0", join(OUT, `${name}.webm`)]);
  console.log(name);
}

await record("controle-bureau", { width: 1280, height: 800 }, false, { width: 1280, height: 800 });
await record("controle-mobile", { width: 390, height: 844 }, true, { width: 584, height: 1266 });
await browser.close();
process.exit(0);
