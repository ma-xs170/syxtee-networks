// Test d'intégration : Core réel + faux SLS + VRAI projet Supabase (utilisateur temporaire supprimé à la fin).
// node test/integration.mjs ../.env.local
import { spawn } from "node:child_process";
import { createClient } from "@supabase/supabase-js";
import { startFakeSls } from "./fake-sls.mjs";

process.loadEnvFile(process.argv[2]);
const URL_ = process.env.NEXT_PUBLIC_SUPABASE_URL, SECRET = process.env.SUPABASE_SECRET_KEY, PUB = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const TOKEN = "t".repeat(48), SLS_KEY = "sls-test-key", PORT = 18787;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const ok = (cond, msg) => { console.log(`${cond ? "✔" : "✖"} ${msg}`); if (!cond) process.exitCode = 1; };

const sls = startFakeSls(18080, SLS_KEY);
const core = spawn("node", ["src/index.ts"], {
  env: { ...process.env, PORT: String(PORT), HOST: "127.0.0.1", CORE_API_TOKEN: TOKEN, SUPABASE_URL: URL_, SUPABASE_SECRET_KEY: SECRET, SLS_API_URL: "http://127.0.0.1:18080", SLS_API_KEY: SLS_KEY, RELAY_PUBLIC_HOST: "relais.test", DATA_DIR: "./data-test", PREVIEW_ENABLED: "false", CORS_ORIGINS: "http://localhost:3000" },
  stdio: ["ignore", "pipe", "pipe"],
});
let logs = ""; core.stdout.on("data", (d) => (logs += d)); core.stderr.on("data", (d) => (logs += d));
const admin = createClient(URL_, SECRET, { auth: { persistSession: false } });
const { data: u } = await admin.auth.admin.createUser({ email: `core+${Date.now()}@syxtee.test`, email_confirm: true });
const uid = u.user.id;
try {
  for (let i = 0; i < 40 && !logs.includes("prêt"); i++) await sleep(250);
  const api = (path, init = {}) => fetch(`http://127.0.0.1:${PORT}${path}`, { ...init, headers: { Authorization: `Bearer ${TOKEN}`, "Content-Type": "application/json", ...(init.headers ?? {}) } });

  ok((await api(`/v1/users/${uid}/keys`, { headers: { Authorization: "Bearer mauvais" } })).status === 401, "jeton de service invalide → 401");
  ok((await api(`/v1/users/${uid}/keys`)).status === 404, "pas encore de clé → 404");
  const k1 = await (await api(`/v1/users/${uid}/keys`, { method: "POST" })).json();
  ok(/^srtla:\/\/relais\.test:5000\?streamid=live_[0-9a-f]{32}$/.test(k1.moblin_srtla_url), `URL Moblin : ${k1.moblin_srtla_url.replace(/[0-9a-f]{32}/, "…")}`);
  ok(/^srt:\/\/relais\.test:4000\?streamid=play_[0-9a-f]{32}$/.test(k1.obs_srt_url), "URL OBS (mode Direct)");
  ok(sls.ids.size === 2, "2 paires déclarées dans le SLS (direct + régie)");
  const { data: row } = await admin.from("stream_keys").select("*").eq("user_id", uid).single();
  ok(row && k1.moblin_srtla_url.endsWith(row.publish_id), "clé enregistrée dans Supabase");
  const k1b = await (await api(`/v1/users/${uid}/keys`, { method: "POST" })).json();
  ok(k1b.moblin_srtla_url === k1.moblin_srtla_url, "2e appel : même clé (idempotent)");

  const k2 = await (await api(`/v1/users/${uid}/keys/rotate`, { method: "POST" })).json();
  ok(k2.moblin_srtla_url !== k1.moblin_srtla_url, "régénération : nouvelle clé");
  ok(sls.ids.size === 2 && !sls.ids.has(row.play_id), "ancienne paire retirée du SLS");
  ok((await api(`/v1/users/${uid}/mode`, { method: "PUT", body: JSON.stringify({ mode: "regie" }) })).status === 409, "mode Régie refusé tant qu'elle est désactivée");

  // Jeton de session d'un vrai utilisateur (lien magique généré par l'API admin).
  const { data: link } = await admin.auth.admin.generateLink({ type: "magiclink", email: u.user.email });
  const anon = createClient(URL_, PUB, { auth: { persistSession: false } });
  const { data: sess } = await anon.auth.verifyOtp({ type: "email", token_hash: link.properties.hashed_token });
  const jwt = sess.session.access_token;
  ok((await fetch(`http://127.0.0.1:${PORT}/v1/me/health`)).status === 401, "santé sans jeton → 401");

  // Le téléphone se connecte : SSE doit recevoir live=true avec le débit.
  const { data: row2 } = await admin.from("stream_keys").select("play_id").eq("user_id", uid).single();
  const ctrl = new AbortController();
  const res = await fetch(`http://127.0.0.1:${PORT}/v1/me/health/stream`, { headers: { Authorization: `Bearer ${jwt}`, Origin: "http://localhost:3000" }, signal: ctrl.signal });
  ok(res.headers.get("access-control-allow-origin") === "http://localhost:3000", "SSE : en-tête CORS pour le dashboard");
  await fetch(`http://127.0.0.1:18080/__live/${row2.play_id}`, { method: "POST" });
  const reader = res.body.getReader();
  let buf = "", live = null;
  const until = Date.now() + 8000;
  while (Date.now() < until && !live) {
    const { value } = await Promise.race([reader.read(), sleep(1000).then(() => ({ value: undefined }))]);
    if (value) buf += new TextDecoder().decode(value);
    for (const m of buf.matchAll(/event: state\ndata: (.*)\n/g)) { const s = JSON.parse(m[1]); if (s.live) live = s; }
  }
  ok(live && live.sample.bitrate > 5000 && live.sample.links === 2, `SSE : flux en live reçu (${live?.sample.bitrate} kbps, ${live?.sample.links} liens)`);
  ctrl.abort();
  await sleep(2500);
  const hist = await (await fetch(`http://127.0.0.1:${PORT}/v1/me/health?range=15m`, { headers: { Authorization: `Bearer ${jwt}` } })).json();
  ok(hist.samples.length >= 1, `historique : ${hist.samples.length} point(s) enregistré(s)`);
  // Suppression des clés (compte supprimé) : plus rien dans le relais pour cet utilisateur.
  ok((await api(`/v1/users/${uid}/keys`, { method: "DELETE" })).status === 204, "suppression des clés → 204");
  ok(sls.ids.size === 0, "paires retirées du relais");
  ok((await api(`/v1/users/${uid}/keys`)).status === 404, "clés effacées de la base");
} finally {
  await admin.auth.admin.deleteUser(uid);
  const { data: left } = await admin.from("stream_keys").select("user_id").eq("user_id", uid);
  ok(left?.length === 0, "utilisateur supprimé → clés supprimées (cascade)");
  core.kill("SIGINT");
  sls.server.close();
  if (process.exitCode) console.log(logs.slice(-1500));
}
