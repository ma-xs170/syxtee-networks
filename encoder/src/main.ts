import { execFileSync } from "node:child_process";
import { parseArgs } from "node:util";
import { defaultBackend, requiredPlugins, RESOLUTIONS, type Backend, type Resolution } from "./hardware.ts";
import { listLinks } from "./links.ts";
import { Pipeline, parseTarget } from "./pipeline.ts";
import { hasSrtlaSend, startSrtlaSend } from "./srtla.ts";

const USAGE = `SYXTEE Encodeur (agent)
  doctor                       vérifie GStreamer, les plugins, srtla_send et les liens réseau
  start --url <srt|srtla://…>  diffuse vers le Core
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
  const backend = (v.backend ?? defaultBackend()) as Backend;
  const res = (v.res ?? "1080p30") as Resolution;
  if (!(res in RESOLUTIONS)) { console.error(`Résolution inconnue : ${res}`); process.exit(2); }
  const target = parseTarget(v.url, Number(v.latency ?? 1000));
  let srtla: ReturnType<typeof startSrtlaSend> | null = null;
  if (target.kind === "srtla") {
    if (!hasSrtlaSend()) { console.error("srtla_send introuvable : installe-le ou utilise une URL srt://."); process.exit(1); }
    srtla = startSrtlaSend(target, listLinks());
  }
  const p = new Pipeline({ backend, res, bitrateKbps: Number(v.bitrate ?? 4000), device: v.device }, target);
  p.on("state", (s: string, d?: string) => console.log(`[${new Date().toISOString().slice(11, 19)}] ${s}${d ? ` : ${d}` : ""}`));
  const quit = async () => { await p.stop(); srtla?.kill(); process.exit(0); };
  process.on("SIGINT", quit);
  process.on("SIGTERM", quit);
  p.start();
}

const { positionals, values } = parseArgs({
  allowPositionals: true,
  options: { url: { type: "string" }, backend: { type: "string" }, res: { type: "string" }, bitrate: { type: "string" }, latency: { type: "string" }, device: { type: "string" } },
});
const cmd = positionals[0];
if (cmd === "doctor") process.exit(doctor((values.backend ?? defaultBackend()) as Backend));
else if (cmd === "start") await start(values);
else { console.log(USAGE); process.exit(cmd ? 2 : 0); }
