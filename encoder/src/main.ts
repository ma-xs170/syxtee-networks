import { execFileSync } from "node:child_process";
import { parseArgs } from "node:util";
import { defaultBackend, requiredPlugins, RESOLUTIONS, type Backend, type Resolution } from "./hardware.ts";
import { listLinks } from "./links.ts";
import { Controller } from "./controller.ts";
import { createUiServer } from "./server.ts";
import { hasSrtlaSend } from "./srtla.ts";

const USAGE = `SYXTEE Encodeur (agent)
  doctor                       vérifie GStreamer, les plugins, srtla_send et les liens réseau
  serve [--port 8080]          interface locale du boîtier (http://127.0.0.1:8080)
    --host <ip> --pin <code>   écouter sur le réseau local (PIN obligatoire)
    --data <dossier>           réglages (défaut ~/.syxtee-encoder)
  start --url <srt|srtla://…>  diffuse vers le Core, sans interface
    --backend mac|test|rk3588  (défaut selon le système)
    --res 720p30|1080p30|1080p60  (défaut 1080p30)
    --bitrate <kbps>           (défaut 4000)
    --latency <ms>             (défaut 1000)
    --device <id>              caméra (index sur Mac, /dev/videoN sur le boîtier)`;

function has(bin: string, args: string[]): boolean {
  try { execFileSync(bin, args, { stdio: "ignore" }); return true; } catch { return false; }
}

function doctor(backend: Backend): number {
  let bad = 0;
  const line = (ok: boolean, what: string, hint = "") => { console.log(`${ok ? "OK " : "MANQUE"}  ${what}${ok ? "" : hint ? `  → ${hint}` : ""}`); if (!ok) bad++; };
  console.log(`Backend : ${backend}`);
  const gst = has("gst-launch-1.0", ["--version"]);
  line(gst, "gst-launch-1.0", "brew install gstreamer");
  if (gst) for (const p of requiredPlugins(backend)) line(has("gst-inspect-1.0", [p]), `plugin ${p}`);
  const srtla = hasSrtlaSend();
  console.log(`${srtla ? "OK " : "info "}  srtla_send${srtla ? "" : " absent : seul l'envoi SRT direct (srt://) fonctionne"}`);
  const links = listLinks();
  console.log(`Liens réseau (${links.length}) :`);
  for (const l of links) console.log(`  ${l.name.padEnd(8)} ${l.kind.padEnd(6)} ${l.address}`);
  return bad ? 1 : 0;
}

async function start(v: Record<string, string | undefined>): Promise<void> {
  if (!v.url) { console.error("--url manquant.\n\n" + USAGE); process.exit(2); }
  const res = (v.res ?? "1080p30") as Resolution;
  if (!(res in RESOLUTIONS)) { console.error(`Résolution inconnue : ${res}`); process.exit(2); }
  const ctl = new Controller({ dataDir: null, overrides: { url: v.url, res, backend: (v.backend ?? defaultBackend()) as Backend, bitrateKbps: Number(v.bitrate ?? 4000), latencyMs: Number(v.latency ?? 1000), device: v.device } });
  const err = ctl.start();
  if (err) { console.error(err); process.exit(1); }
  let seen = 0;
  const tick = setInterval(() => { for (const e of ctl.events.slice(seen)) console.log(`[${new Date(e.at).toISOString().slice(11, 19)}] ${e.text}`); seen = ctl.events.length; }, 300);
  const quit = async () => { clearInterval(tick); await ctl.stop(); process.exit(0); };
  process.on("SIGINT", quit);
  process.on("SIGTERM", quit);
}

async function serve(v: Record<string, string | undefined>): Promise<void> {
  const host = v.host ?? "127.0.0.1";
  const port = Number(v.port ?? 8080);
  const local = host === "127.0.0.1" || host === "localhost" || host === "::1";
  if (!local && !v.pin) { console.error("Écouter sur le réseau demande un PIN : ajoute --pin <code>."); process.exit(2); }
  const ctl = new Controller({ dataDir: v.data, overrides: v.backend ? { backend: v.backend as Backend } : {} });
  createUiServer(ctl, { pin: v.pin }).listen(port, host, () => console.log(`Interface du boîtier : http://${host}:${port}${v.pin ? " (PIN requis)" : ""}`));
  const quit = async () => { await ctl.stop(); process.exit(0); };
  process.on("SIGINT", quit);
  process.on("SIGTERM", quit);
}

const { positionals, values } = parseArgs({
  allowPositionals: true,
  options: { url: { type: "string" }, backend: { type: "string" }, res: { type: "string" }, bitrate: { type: "string" }, latency: { type: "string" }, device: { type: "string" }, host: { type: "string" }, port: { type: "string" }, pin: { type: "string" }, data: { type: "string" } },
});
const cmd = positionals[0];
if (cmd === "doctor") process.exit(doctor((values.backend ?? defaultBackend()) as Backend));
else if (cmd === "start") await start(values);
else if (cmd === "serve") await serve(values);
else { console.log(USAGE); process.exit(cmd ? 2 : 0); }
