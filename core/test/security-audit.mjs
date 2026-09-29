// Audit de sécurité RÉEL du relais, à lancer sur le VPS (vrai SLS, vrai MediaMTX, vrai Supabase, vrai ffmpeg) :
//   cd /opt/syxtee && docker compose exec -T core node --input-type=module - < core/test/security-audit.mjs
// Crée un compte temporaire + ses relais via l'API du Core, tente chaque attaque avec ffmpeg vers l'IP publique,
// puis efface tout. Chaque ligne : ✅ protégé / ❌ vulnérable.
import { spawn } from "node:child_process";
import { randomBytes } from "node:crypto";
import { createClient } from "@supabase/supabase-js";

const env = process.env;
const HOST = env.RELAY_PUBLIC_HOST;
const CORE = `http://127.0.0.1:${env.PORT ?? 8787}`;
const SRT_PUB = env.SRT_PUBLISH_PORT ?? 4001;
const SRT_PLAY = env.SRT_PLAY_PORT ?? 4000;
const RTMP = env.RTMP_PORT ?? 1935;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const rnd = (p) => `${p}_${randomBytes(16).toString("hex")}`;
let failures = 0;
const check = (ok, label) => {
  console.log(`${ok ? "✅ protégé   " : "❌ VULNÉRABLE"}  ${label}`);
  if (!ok) failures++;
};

const SRC = ["-hide_banner", "-loglevel", "error", "-re", "-f", "lavfi", "-i", "testsrc=size=320x240:rate=25", "-f", "lavfi", "-i", "sine=f=440", "-c:v", "libx264", "-preset", "ultrafast", "-tune", "zerolatency", "-g", "25", "-c:a", "aac"];
/** Lance ffmpeg ; `alive(ms)` = toujours connecté après ms (accepté), sinon refusé / coupé. */
function ffmpeg(args) {
  const p = spawn("ffmpeg", args, { stdio: ["ignore", "ignore", "pipe"] });
  let exited = null;
  p.on("exit", (c) => (exited = Date.now()));
  return {
    async alive(ms) {
      const until = Date.now() + ms;
      while (Date.now() < until && exited === null) await sleep(200);
      return exited === null;
    },
    /** Secondes avant la coupure (null si toujours connecté après maxMs). */
    async cutAfter(maxMs) {
      const t0 = Date.now();
      while (Date.now() - t0 < maxMs && exited === null) await sleep(200);
      return exited === null ? null : Math.round((exited - t0) / 1000);
    },
    stop: () => exited === null && p.kill("SIGKILL"),
  };
}
const publishSrt = (key) => ffmpeg([...SRC, "-f", "mpegts", `srt://${HOST}:${SRT_PUB}?streamid=${key}&latency=200000`]);
const playSrt = (key) => ffmpeg(["-hide_banner", "-loglevel", "error", "-i", `srt://${HOST}:${SRT_PLAY}?streamid=${key}&latency=200000`, "-f", "null", "-"]);
const publishRtmp = (key) => ffmpeg([...SRC, "-f", "flv", `rtmp://${HOST}:${RTMP}/live/${key}`]);

const api = async (path, init = {}) => {
  const res = await fetch(`${CORE}${path}`, { ...init, headers: { Authorization: `Bearer ${env.CORE_API_TOKEN}`, "Content-Type": "application/json" } });
  return { status: res.status, body: res.status === 204 ? null : await res.json().catch(() => null) };
};
const keyOf = (url) => url.split("streamid=")[1]?.split("&")[0] ?? url.split("/").pop();

const admin = createClient(env.SUPABASE_URL, env.SUPABASE_SECRET_KEY, { auth: { persistSession: false } });
const { data: u, error } = await admin.auth.admin.createUser({ email: `audit+${Date.now()}@syxtee.test`, email_confirm: true });
if (error) throw error;
const uid = u.user.id;
const procs = [];
const run = (p) => (procs.push(p), p);
try {
  await admin.from("profiles").update({ plan: "beta", onboarded_at: new Date().toISOString() }).eq("id", uid);
  const srtla = (await api(`/v1/users/${uid}/relays`, { method: "POST", body: JSON.stringify({ name: "Audit SRTLA", protocol: "srtla", server: env.RELAY_NAME ?? "nyc1", limit: 3 }) })).body;
  const rtmp = (await api(`/v1/users/${uid}/relays`, { method: "POST", body: JSON.stringify({ name: "Audit RTMP", protocol: "rtmp", server: env.RELAY_NAME ?? "nyc1", limit: 3 }) })).body;
  const PUB = keyOf(srtla.urls.srt_url), PLAY = keyOf(srtla.obs_srt_url), RPUB = rtmp.urls.rtmp_key;
  console.log(`Compte temporaire ${uid.slice(0, 8)}, relais SRTLA ${srtla.id.slice(0, 8)} et RTMP ${rtmp.id.slice(0, 8)}, hôte ${HOST}\n`);

  // Contrôles : la clé légitime marche (sinon l'audit ne prouve rien).
  const legit = run(publishSrt(PUB));
  check(await legit.alive(6000), "contrôle : la vraie clé de publication est acceptée");
  const reader = run(playSrt(PLAY));
  check(await reader.alive(5000), "contrôle : la vraie clé de lecture est acceptée");
  reader.stop();

  // a) Publier avec une clé inventée.
  check(!(await run(publishSrt(rnd("live"))).alive(5000)), "a) SRT : publier avec une clé inventée");
  check(!(await run(publishRtmp(rnd("live"))).alive(5000)), "a) RTMP : publier avec une clé inventée");
  // b) Lire sans connaître la clé de lecture.
  check(!(await run(playSrt(rnd("play"))).alive(4000)), "b) lire avec une clé de lecture inventée");
  check(!(await run(playSrt(PUB)).alive(4000)), "b) lire avec la clé de PUBLICATION");
  check(!(await run(publishSrt(PLAY)).alive(4000)), "b) publier avec la clé de LECTURE");
  // c) Deux éditeurs sur la même clé.
  const dups = [];
  for (let i = 0; i < 6; i++) dups.push(!(await run(publishSrt(PUB)).alive(3000)));
  check(dups.every(Boolean) && (await legit.alive(500)), "c) SRT : 2e appareil sur une clé déjà en direct (le 1er reste en ligne)");
  await sleep(6000); // journal → Core → base
  const alerts = (await api(`/v1/users/${uid}/alerts`)).body?.alerts ?? [];
  check(alerts.some((a) => a.relay_id === srtla.id), `c) propriétaire alerté (${alerts.length} alerte(s))`);
  const rtmpLegit = run(publishRtmp(RPUB));
  check(await rtmpLegit.alive(6000), "contrôle : RTMP, la vraie clé est acceptée");
  check(!(await run(publishRtmp(RPUB)).alive(5000)) && (await rtmpLegit.alive(500)), "c) RTMP : 2e appareil sur une clé déjà en direct");
  // d) La clé de publication ne se déduit pas de la clé de lecture.
  check(PUB.slice(5) !== PLAY.slice(5) && !PLAY.includes(PUB.slice(5, 13)), "d) clés de publication et de lecture indépendantes");
  const { data: row } = await admin.from("relays").select("*").eq("id", srtla.id).single();
  check(!JSON.stringify(row).includes(PUB) && !JSON.stringify(row).includes(PLAY), "d) aucune clé en clair dans Supabase");

  // e) Régénérer : l'ancienne clé coupée tout de suite, puis refusée.
  const rot = await api(`/v1/users/${uid}/relays/${srtla.id}/rotate`, { method: "POST" });
  const cut = await legit.cutAfter(20_000);
  check(rot.status === 200 && cut !== null, `e) SRT : régénération, session en cours coupée${cut !== null ? ` en ${cut} s` : ""}`);
  check(!(await run(publishSrt(PUB)).alive(4000)), "e) SRT : ancienne clé refusée ensuite");
  await api(`/v1/users/${uid}/relays/${rtmp.id}/rotate`, { method: "POST" });
  const rcut = await rtmpLegit.cutAfter(10_000);
  check(rcut !== null, `e) RTMP : régénération, caméra coupée${rcut !== null ? ` en ${rcut} s` : ""}`);

  // f) Compte gratuit (ou suspendu) : refusé, même avec une clé valide.
  const NEW = keyOf((await api(`/v1/users/${uid}/relays/${srtla.id}`)).body.urls.srt_url);
  await admin.from("profiles").update({ plan: "free" }).eq("id", uid);
  const free = run(publishSrt(NEW));
  const fcut = await free.cutAfter(35_000);
  check(fcut !== null, `f) compte gratuit : session refusée ou coupée${fcut !== null ? ` en ${fcut} s` : ""}`);
  check(!(await run(publishSrt(NEW)).alive(4000)), "f) compte gratuit : nouvelle tentative refusée");
  check((await api(`/v1/users/${uid}/relays`, { method: "POST", body: JSON.stringify({ name: "x", protocol: "srtla", server: env.RELAY_NAME ?? "nyc1", limit: 3 }) })).status === 403, "f) compte gratuit : création de relais refusée");
} finally {
  for (const p of procs) p.stop();
  await api(`/v1/users/${uid}/relays`, { method: "DELETE" });
  await admin.auth.admin.deleteUser(uid);
  console.log(`\n${failures ? `❌ ${failures} point(s) vulnérable(s)` : "✅ Tout est protégé"}`);
  process.exit(failures ? 1 : 0);
}
