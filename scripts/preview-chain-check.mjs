// Essai de la chaîne de l'aperçu vidéo, avec un VRAI MediaMTX (binaire installé : `brew install mediamtx`, même version que le serveur) :
//   éditeur WHIP (Chromium, caméra et micro factices : fait le travail du plugin) ──► MediaMTX ──► WHEP dans la page Contrôle à distance
// Vérifie : autorisation par le Core (chemin secret), simple transmission par MediaMTX, lecture dans le VRAI composant ProgramVideo, image ET son.
// Ne prouve PAS la sortie WHIP d'OBS elle-même (voir link/plugin/qt/obsctl.cpp, testée sur un faux OBS).
// Usage : npm run dev (port 3000), puis node --experimental-strip-types scripts/preview-chain-check.mjs
import { spawn } from "node:child_process";
import { mkdtempSync, writeFileSync } from "node:fs";
import { createServer } from "node:http";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { chromium } from "playwright";
import { createObsPreview } from "../core/src/obspreview.ts";

const BASE = process.env.BASE_URL ?? "http://localhost:3000";
const MEDIAMTX = process.env.MEDIAMTX ?? "/opt/homebrew/bin/mediamtx";
const P = { auth: 18787, whip: 18889, api: 19997, media: 18189 };
const USER = "00000000-0000-4000-8000-000000000001";
const check = (name, ok) => (console.log(ok ? "✔" : "✖", name), ok || (process.exitCode = 1));

// Le Core, en petit : seulement ce qui décide des droits.
const preview = createObsPreview({ whipBase: `http://127.0.0.1:${P.whip}`, apiUrl: `http://127.0.0.1:${P.api}`, log: () => {} });
const server = createServer(async (req, res) => {
  const chunks = [];
  for await (const c of req) chunks.push(c);
  const body = Buffer.concat(chunks).toString();
  const json = (code, v) => (res.writeHead(code, { "content-type": "application/json", "access-control-allow-origin": "*" }), res.end(JSON.stringify(v)));
  if (req.url === "/auth") return res.writeHead(preview.authorize(JSON.parse(body)) ? 200 : 401).end();
  if (req.url === "/watch") return json(200, await preview.watch(USER));
  if (req.url === "/pub") return res.writeHead(200, { "content-type": "text/html" }).end("<!doctype html><title>pub</title>");
  res.writeHead(404).end();
});
await new Promise((r) => server.listen(P.auth, "127.0.0.1", r));

const dir = mkdtempSync(join(tmpdir(), "mtx-"));
writeFileSync(
  join(dir, "mediamtx.yml"),
  `logLevel: warn
authMethod: http
authHTTPAddress: http://127.0.0.1:${P.auth}/auth
authHTTPExclude: [{ action: api }, { action: metrics }, { action: pprof }]
api: true
apiAddress: 127.0.0.1:${P.api}
rtsp: false
rtmp: false
hls: false
srt: false
playback: false
webrtc: true
webrtcAddress: 127.0.0.1:${P.whip}
webrtcAllowOrigins: ["*"]
webrtcLocalUDPAddress: 127.0.0.1:${P.media}
webrtcLocalTCPAddress: ""
webrtcIPsFromInterfaces: false
webrtcAdditionalHosts: [127.0.0.1]
paths:
  all_others:
`,
);
const mtx = spawn(MEDIAMTX, [join(dir, "mediamtx.yml")], { stdio: "ignore" });
await new Promise((r) => setTimeout(r, 1500));

const browser = await chromium.launch({ args: ["--use-fake-device-for-media-stream", "--use-fake-ui-for-media-stream", "--autoplay-policy=no-user-gesture-required"] });
try {
  // Droits : sans session, personne ne publie ni ne lit.
  const rogue = `obs_${"a".repeat(32)}`;
  check("sans session : publication refusée (401)", (await fetch(`http://127.0.0.1:${P.whip}/${rogue}/whip`, { method: "POST", headers: { "content-type": "application/sdp" }, body: "v=0" })).status === 401);
  check("sans session : lecture refusée (401)", (await fetch(`http://127.0.0.1:${P.whip}/${rogue}/whep`, { method: "POST", headers: { "content-type": "application/sdp" }, body: "v=0" })).status === 401);
  check("aucune session : le navigateur n'a pas d'adresse", (await preview.watch(USER)).whep_url === null);

  // L'agent ouvre la session ; le « plugin » (Chromium) publie en WHIP.
  const { path, whip_url } = preview.start(USER, "dev");
  const pub = await browser.newPage();
  await pub.goto(`http://127.0.0.1:${P.auth}/pub`);
  const published = await pub.evaluate(async (url) => {
    const media = await navigator.mediaDevices.getUserMedia({ video: { width: 960, height: 540 }, audio: true });
    const pc = new RTCPeerConnection();
    media.getTracks().forEach((t) => pc.addTrack(t, media));
    await pc.setLocalDescription(await pc.createOffer());
    await new Promise((ok) => (pc.iceGatheringState === "complete" ? ok() : (pc.onicegatheringstatechange = () => pc.iceGatheringState === "complete" && ok())));
    const res = await fetch(url, { method: "POST", headers: { "content-type": "application/sdp" }, body: pc.localDescription.sdp });
    if (res.status !== 201) return { status: res.status };
    await pc.setRemoteDescription({ type: "answer", sdp: await res.text() });
    return { status: 201 };
  }, whip_url);
  check("publication WHIP acceptée avec le chemin de la session (201)", published.status === 201);
  await new Promise((r) => setTimeout(r, 2000));
  const w = await preview.watch(USER);
  check("MediaMTX confirme : le flux est prêt", w.ready === true && w.whep_url === `http://127.0.0.1:${P.whip}/${path}/whep`);

  // Lecture dans la VRAIE page Contrôle à distance (composant ProgramVideo).
  const ctx = await browser.newContext({ viewport: { width: 1300, height: 900 } });
  const page = await ctx.newPage();
  page.on("pageerror", (e) => console.log("pageerror", e.message));
  await page.route("**/v1/me/link/preview/watch", async (route) => {
    const r = await fetch(`http://127.0.0.1:${P.auth}/watch`);
    await route.fulfill({ status: 200, contentType: "application/json", headers: { "access-control-allow-origin": "*" }, body: await r.text() });
  });
  await page.routeWebSocket(/\/v1\/link\/remote/, (ws) => {
    ws.onMessage((raw) => {
      const m = JSON.parse(String(raw));
      if (m.type === "hello") ws.send(JSON.stringify({ type: "ready", agent: { online: true, id: "d1", name: "OBS-DJ-SYXTEE.local", version: "0.4.0", since: Date.now() } }));
      else if (m.type === "req") {
        const ok = (result) => ws.send(JSON.stringify({ type: "res", id: m.id, ok: true, result }));
        if (m.method === "GetSceneList") ok({ scenes: [{ sceneName: "🔴 › EN DIRECT" }], currentProgramSceneName: "🔴 › EN DIRECT" });
        else if (m.method === "link.getPreview") ok({ enabled: true, mode: "video", reason: "" });
        else ok({});
      }
    });
  });
  await page.goto(`${BASE}/dev/vitrine/controle-obs`, { waitUntil: "load" });
  await page.waitForSelector("video", { timeout: 20000 });
  const played = await page
    .waitForFunction(() => {
      const v = document.querySelector("video");
      return v && v.videoWidth > 0 && v.currentTime > 0.5;
    }, null, { timeout: 25000 })
    .then(() => true)
    .catch(() => false);
  check("le composant affiche l'image du flux (WHEP)", played);
  const info = await page.evaluate(() => {
    const v = document.querySelector("video");
    const s = v?.srcObject;
    return { w: v?.videoWidth, h: v?.videoHeight, audio: s?.getAudioTracks().length ?? 0, video: s?.getVideoTracks().length ?? 0, muted: v?.muted, label: document.querySelector("section[aria-label='Programme'] video")?.getAttribute("aria-label") };
  });
  console.log("   flux reçu :", JSON.stringify(info));
  check("image 16:9 reçue", info.w > 0 && Math.abs(info.w / info.h - 16 / 9) < 0.05);
  check("piste audio reçue (son)", info.audio === 1 && info.video === 1);
  check("son coupé par défaut (autoplay)", info.muted === true);
  await page.getByRole("button", { name: "Muet" }).click();
  await page.waitForTimeout(300);
  check("bouton Son : le son se remet, volume local", (await page.evaluate(() => document.querySelector("video")?.muted)) === false && (await page.getByLabel("Volume de l'aperçu").count()) === 1);
  await page.screenshot({ path: process.env.SHOT ?? join(dir, "preview.png") });

  // Fin de session : le flux est coupé, plus aucune lecture possible.
  preview.stop(USER);
  await new Promise((r) => setTimeout(r, 1500));
  check("session arrêtée : plus d'adresse de lecture", (await preview.watch(USER)).whep_url === null);
  check("session arrêtée : nouvelle lecture refusée (401)", (await fetch(`http://127.0.0.1:${P.whip}/${path}/whep`, { method: "POST", headers: { "content-type": "application/sdp" }, body: "v=0" })).status === 401);
} finally {
  await browser.close();
  mtx.kill();
  server.close();
}
process.exit(process.exitCode ?? 0);
