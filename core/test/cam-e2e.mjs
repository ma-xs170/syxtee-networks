// Test de bout en bout de SYXTEE Cam, en local :
//   Chrome (fausse caméra) → page /cam du serveur de dev (:3000) → WHIP → MediaMTX local → Core local
//   → relais ffmpeg → sortie UDP vérifiée avec ffprobe (H.264 + AAC). Puis coupure/reprise de MediaMTX et GPS.
// Prérequis : `next dev` sur :3000, `brew install mediamtx`, ffmpeg/ffprobe. Utilise le VRAI projet Supabase
// (utilisateur temporaire supprimé à la fin).
//   node test/cam-e2e.mjs ../.env.local
import { spawn, execFileSync } from "node:child_process";
import { mkdtempSync, writeFileSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import { startFakeSls } from "./fake-sls.mjs";

process.loadEnvFile(process.argv[2] ?? "../.env.local");
const E = process.env;
const TOKEN = "t".repeat(48);
const CORE = "http://127.0.0.1:18787";
const PROD_CORE = (E.CORE_URL ?? "").trim().replace(/\/$/, "");
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const ok = (cond, msg) => {
  console.log(`${cond ? "✔" : "✖"} ${msg}`);
  if (!cond) process.exitCode = 1;
};

const dir = mkdtempSync(join(tmpdir(), "syxtee-cam-"));
const yml = readFileSync(new URL("../deploy/mediamtx.yml", import.meta.url), "utf8")
  .replace("http://127.0.0.1:8787/internal/mediamtx/auth", `${CORE}/internal/mediamtx/auth`)
  .replace("127.0.0.1:9997", "127.0.0.1:19997")
  .replace("127.0.0.1:8554", "127.0.0.1:18554")
  .replace("127.0.0.1:8889", "127.0.0.1:18889")
  .replaceAll(":8189", ":18189");
writeFileSync(join(dir, "mediamtx.yml"), yml);
const startMtx = () => spawn("mediamtx", [join(dir, "mediamtx.yml")], { stdio: "ignore" });

const sls = startFakeSls(18080, "sls-test-key");
const core = spawn(process.execPath, ["src/index.ts"], {
  cwd: fileURLToPath(new URL("..", import.meta.url)),
  env: {
    ...E, PORT: "18787", HOST: "127.0.0.1", CORE_API_TOKEN: TOKEN, SUPABASE_URL: E.NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SECRET_KEY: E.SUPABASE_SECRET_KEY,
    SLS_API_URL: "http://127.0.0.1:18080", SLS_API_KEY: "sls-test-key", RELAY_PUBLIC_HOST: "relais.test", DATA_DIR: join(dir, "data"),
    PREVIEW_ENABLED: "false", CORS_ORIGINS: "http://localhost:3000", CAM_WHIP_BASE: "http://127.0.0.1:18889",
    MEDIAMTX_API_URL: "http://127.0.0.1:19997", MEDIAMTX_RTSP_URL: "rtsp://127.0.0.1:18554", CAM_RELAY_URL: "udp://127.0.0.1:19999?pkt_size=1316",
  },
  stdio: ["ignore", "pipe", "pipe"],
});
let logs = "";
core.stdout.on("data", (d) => (logs += d));
core.stderr.on("data", (d) => (logs += d));
let mtx = startMtx();

const admin = createClient(E.NEXT_PUBLIC_SUPABASE_URL, E.SUPABASE_SECRET_KEY, { auth: { persistSession: false } });
const { data: u } = await admin.auth.admin.createUser({ email: `cam+${Date.now()}@syxtee.test`, email_confirm: true });
const uid = u.user.id;
const browser = await chromium.launch({ args: ["--use-fake-device-for-media-stream", "--use-fake-ui-for-media-stream"] });
try {
  for (let i = 0; i < 40 && !logs.includes("prêt"); i++) await sleep(250);
  const cam = await (await fetch(`${CORE}/v1/users/${uid}/cam`, { headers: { Authorization: `Bearer ${TOKEN}` } })).json();
  ok(/^cam_[0-9a-f]{32}$/.test(cam.cam_key ?? ""), "clé caméra créée");
  ok((await fetch(`${CORE}/v1/cam/me`, { headers: { Authorization: "Bearer cam_" + "0".repeat(32) } })).status === 401, "clé inconnue refusée");
  const refused = await fetch(`http://127.0.0.1:18889/cam_${"0".repeat(32)}/whip`, { method: "POST", headers: { "Content-Type": "application/sdp" }, body: "v=0" });
  ok(refused.status === 401 || refused.status === 400, `WHIP avec une clé inconnue refusé (HTTP ${refused.status})`);

  const ctx = await browser.newContext({ permissions: ["camera", "microphone", "geolocation"], geolocation: { latitude: 16.2411, longitude: -61.5331 } });
  // La page parle au Core de prod (CORE_URL) : on redirige vers le Core local.
  if (PROD_CORE)
    await ctx.route(`${PROD_CORE}/**`, async (r) => {
      const res = await r.fetch({ url: r.request().url().replace(PROD_CORE, CORE) });
      await r.fulfill({ response: res });
    });
  const page = await ctx.newPage();
  await page.goto(`http://localhost:3000/cam?k=${cam.cam_key}`);
  const go = page.getByRole("button", { name: "● DIFFUSER" });
  await go.waitFor({ timeout: 30000 });
  await page.waitForFunction(() => !!document.querySelector("video")?.srcObject, null, { timeout: 15000 });
  ok(!page.url().includes("k=cam_"), "la clé disparaît de l'adresse");
  await go.click();
  await page.getByText("EN DIRECT").waitFor({ timeout: 20000 });
  ok(true, "diffusion WHIP acceptée (EN DIRECT)");

  await sleep(4000);
  let probe = "";
  try {
    probe = execFileSync("ffprobe", ["-v", "error", "-show_entries", "stream=codec_name", "-of", "csv=p=0", "-i", "udp://127.0.0.1:19999?timeout=8000000"], { timeout: 15000 }).toString();
  } catch (e) {
    probe = String(e.stdout ?? "");
  }
  ok(/h264/.test(probe) && /aac/.test(probe), `sortie du relais : ${probe.trim().split("\n").join(" + ") || "rien"}`);
  await page.screenshot({ path: join(dir, "cam-live.png") });

  // Position GPS reçue par le Core
  const { data: link } = await admin.auth.admin.generateLink({ type: "magiclink", email: u.user.email });
  const anon = createClient(E.NEXT_PUBLIC_SUPABASE_URL, E.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, { auth: { persistSession: false } });
  const { data: sess } = await anon.auth.verifyOtp({ type: "email", token_hash: link.properties.hashed_token });
  const pos = await (await fetch(`${CORE}/v1/me/positions?range=15m`, { headers: { Authorization: `Bearer ${sess.session.access_token}` } })).json();
  ok(pos.positions?.length > 0 && Math.abs(pos.positions[0].lat - 16.2411) < 0.001, `GPS : ${pos.positions?.length ?? 0} position(s) reçue(s)`);

  // Coupure du serveur puis reprise : l'app doit se reconnecter seule.
  mtx.kill("SIGKILL");
  await page.getByText("RECONNEXION…").waitFor({ timeout: 15000 });
  ok(true, "coupure détectée (RECONNEXION…)");
  await sleep(3000);
  mtx = startMtx();
  await page.getByText("EN DIRECT").waitFor({ timeout: 40000 });
  ok(true, "reconnexion automatique (EN DIRECT)");
  console.log(`capture : ${join(dir, "cam-live.png")}`);
} catch (e) {
  ok(false, String(e).split("\n")[0]);
  console.log(logs.slice(-1500));
} finally {
  await browser.close();
  await admin.auth.admin.deleteUser(uid);
  mtx.kill("SIGKILL");
  core.kill("SIGINT");
  sls.server.close();
}
