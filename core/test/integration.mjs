// Test d'intégration : Core réel + faux SLS + VRAI projet Supabase (utilisateur temporaire supprimé à la fin).
// node test/integration.mjs ../.env.local
import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { startFakeSls } from "./fake-sls.mjs";

process.loadEnvFile(process.argv[2]);
const URL_ = process.env.NEXT_PUBLIC_SUPABASE_URL, SECRET = process.env.SUPABASE_SECRET_KEY, PUB = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const TOKEN = "t".repeat(48), SLS_KEY = "sls-test-key", PORT = 18787;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const ok = (cond, msg) => { console.log(`${cond ? "✔" : "✖"} ${msg}`); if (!cond) process.exitCode = 1; };

const sls = startFakeSls(18080, SLS_KEY);
const core = spawn("node", ["src/index.ts"], {
  env: { ...process.env, PORT: String(PORT), HOST: "127.0.0.1", CORE_API_TOKEN: TOKEN, SUPABASE_URL: URL_, SUPABASE_SECRET_KEY: SECRET, SLS_API_URL: "http://127.0.0.1:18080", SLS_API_KEY: SLS_KEY, RELAY_PUBLIC_HOST: "relais.test", RELAY_KEYS_SECRET: "a".repeat(64), GUARD_URL: "", DATA_DIR: "./data-test", PREVIEW_ENABLED: "false", RTMP_ENABLED: "true", CORS_ORIGINS: "http://localhost:3000" },
  stdio: ["ignore", "pipe", "pipe"],
});
let logs = ""; core.stdout.on("data", (d) => (logs += d)); core.stderr.on("data", (d) => (logs += d));
const admin = createClient(URL_, SECRET, { auth: { persistSession: false } });
const { data: u } = await admin.auth.admin.createUser({ email: `core+${Date.now()}@syxtee.test`, email_confirm: true });
const uid = u.user.id;
try {
  for (let i = 0; i < 40 && !logs.includes("prêt"); i++) await sleep(250);
  const api = (path, init = {}) => fetch(`http://127.0.0.1:${PORT}${path}`, { ...init, headers: { Authorization: `Bearer ${TOKEN}`, "Content-Type": "application/json", ...(init.headers ?? {}) } });

  ok((await api(`/v1/users/${uid}/relays`, { headers: { Authorization: "Bearer mauvais" } })).status === 401, "jeton de service invalide → 401");
  ok((await (await api(`/v1/users/${uid}/relays`)).json()).relays.length === 0, "aucun relais créé d'office");
  const create = (body) => api(`/v1/users/${uid}/relays`, { method: "POST", body: JSON.stringify({ server: "nyc1", limit: 2, ...body }) });
  const k1 = await (await create({ name: "iPhone 16", protocol: "srtla" })).json();
  ok(/^srtla:\/\/relais\.test:5000\?streamid=live_[0-9a-f]{32}$/.test(k1.urls.srtla_url), `URL Moblin : ${k1.urls.srtla_url.replace(/[0-9a-f]{32}/, "…")}`);
  ok(/^srt:\/\/relais\.test:4000\?streamid=play_[0-9a-f]{32}$/.test(k1.obs_srt_url), "URL OBS (mode Direct)");
  ok(sls.ids.size === 2, "2 paires déclarées dans le SLS (direct + régie)");
  const { data: row } = await admin.from("relays").select("*").eq("id", k1.id).single();
  const sha = (k) => createHash("sha256").update(k).digest("hex");
  const pub1 = k1.urls.srtla_url.split("streamid=")[1];
  const play1 = k1.obs_srt_url.split("streamid=")[1];
  ok(row && row.user_id === uid && row.publish_hash === sha(pub1) && row.play_hash === sha(play1), "relais enregistré dans Supabase (empreintes SHA-256)");
  ok(!JSON.stringify(row).includes(pub1) && !JSON.stringify(row).includes(play1) && /^v1\./.test(row.keys_enc), "aucune clé en clair en base (AES-256-GCM)");
  const k3 = await (await create({ name: "Osmo Pocket 3", protocol: "rtmp" })).json();
  ok(k3.urls.rtmp_server === "rtmp://relais.test:1935/live" && /^live_/.test(k3.urls.rtmp_key), "relais RTMP : serveur + clé");
  ok((await create({ name: "Trop", protocol: "srtla" })).status === 403, "quota atteint → 403");
  const arch = await api(`/v1/users/${uid}/relays/${k3.id}`, { method: "PATCH", body: JSON.stringify({ archived: true }) });
  ok(arch.status === 200 && sls.ids.size === 2, "archivage : paire retirée du SLS");

  const k2 = await (await api(`/v1/users/${uid}/relays/${k1.id}/rotate`, { method: "POST" })).json();
  ok(k2.urls.srtla_url !== k1.urls.srtla_url, "régénération : nouvelle clé");
  ok(sls.ids.size === 2 && !sls.ids.has(play1), "ancienne paire retirée du SLS");
  ok((await api(`/v1/users/${uid}/relays/${k1.id}`, { method: "PATCH", body: JSON.stringify({ mode: "regie" }) })).status === 409, "mode Régie refusé tant qu'elle est désactivée");

  // Jeton de session d'un vrai utilisateur (lien magique généré par l'API admin).
  const { data: link } = await admin.auth.admin.generateLink({ type: "magiclink", email: u.user.email });
  const anon = createClient(URL_, PUB, { auth: { persistSession: false } });
  const { data: sess } = await anon.auth.verifyOtp({ type: "email", token_hash: link.properties.hashed_token });
  const jwt = sess.session.access_token;
  ok((await fetch(`http://127.0.0.1:${PORT}/v1/me/relays/${k1.id}/health`)).status === 401, "santé sans jeton → 401");

  // Le téléphone se connecte : SSE doit recevoir live=true avec le débit.
  const row2 = { play_id: k2.obs_srt_url.split("streamid=")[1] };
  const ctrl = new AbortController();
  const res = await fetch(`http://127.0.0.1:${PORT}/v1/me/relays/${k1.id}/health/stream`, { headers: { Authorization: `Bearer ${jwt}`, Origin: "http://localhost:3000" }, signal: ctrl.signal });
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
  const hist = await (await fetch(`http://127.0.0.1:${PORT}/v1/me/relays/${k1.id}/health?range=15m`, { headers: { Authorization: `Bearer ${jwt}` } })).json();
  ok(hist.samples.length >= 1, `historique : ${hist.samples.length} point(s) enregistré(s)`);
  // Compte supprimé : plus rien dans le relais pour cet utilisateur.
  ok((await api(`/v1/users/${uid}/relays`, { method: "DELETE" })).status === 204, "suppression des relais → 204");
  ok(sls.ids.size === 0, "paires retirées du relais");
  ok((await (await api(`/v1/users/${uid}/relays`)).json()).relays.length === 0, "relais effacés de la base");
} finally {
  await admin.auth.admin.deleteUser(uid);
  const { data: left } = await admin.from("relays").select("id").eq("user_id", uid);
  ok(left?.length === 0, "utilisateur supprimé → relais supprimés (cascade)");
  core.kill("SIGINT");
  sls.server.close();
  if (process.exitCode) console.log(logs.slice(-1500));
}
