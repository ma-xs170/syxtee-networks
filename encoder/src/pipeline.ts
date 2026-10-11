import { spawn, type ChildProcess } from "node:child_process";
import { EventEmitter } from "node:events";
import { videoElements, type CaptureOptions } from "./hardware.ts";

export type Target =
  | { kind: "srt"; host: string; port: number; streamid?: string; latencyMs: number }
  // SRTLA : GStreamer envoie en SRT à srtla_send (local), qui répartit sur les liens.
  | { kind: "srtla"; host: string; port: number; streamid?: string; latencyMs: number; localPort: number };

/** Lit srt://, srtla:// (URL du Core) et renvoie la cible d'envoi. Lève une erreur claire si l'URL est invalide. */
export function parseTarget(raw: string, latencyMs = 1000, localPort = 5000): Target {
  const u = new URL(raw);
  if (u.protocol !== "srt:" && u.protocol !== "srtla:") throw new Error(`Protocole non pris en charge : ${u.protocol} (srt ou srtla attendu)`);
  if (!u.hostname || !u.port) throw new Error("L'URL doit contenir un hôte et un port.");
  const base = { host: u.hostname, port: Number(u.port), streamid: u.searchParams.get("streamid") ?? undefined, latencyMs };
  return u.protocol === "srt:" ? { kind: "srt", ...base } : { kind: "srtla", ...base, localPort };
}

/** URI du srtsink GStreamer. En SRTLA, il vise srtla_send sur 127.0.0.1. */
export function sinkUri(t: Target): string {
  const host = t.kind === "srtla" ? "127.0.0.1" : t.host;
  const port = t.kind === "srtla" ? t.localPort : t.port;
  const q = new URLSearchParams({ mode: "caller", latency: String(t.latencyMs) });
  if (t.streamid) q.set("streamid", t.streamid);
  return `srt://${host}:${port}?${q.toString()}`;
}

/** Arguments complets de gst-launch-1.0 (sans shell : chaque jeton est un argument). */
export function gstArgs(o: CaptureOptions, t: Target): string[] {
  return [
    "-e", "-q",
    ...videoElements(o), "!",
    "mpegtsmux", "alignment=7", "!",
    "srtsink", `uri=${sinkUri(t)}`, "wait-for-connection=false", "sync=false",
  ];
}

export type PipelineState = "idle" | "starting" | "live" | "error";

/** Lance gst-launch-1.0 et le relance avec attente croissante s'il s'arrête seul. */
export class Pipeline extends EventEmitter {
  state: PipelineState = "idle";
  private child: ChildProcess | null = null;
  private stopping = false;
  private retry = 0;
  private timer: NodeJS.Timeout | null = null;
  private opts: CaptureOptions;
  private target: Target;
  private bin: string;

  constructor(opts: CaptureOptions, target: Target, bin = "gst-launch-1.0") {
    super();
    this.opts = opts;
    this.target = target;
    this.bin = bin;
  }

  start(): void {
    this.stopping = false;
    this.spawnOnce();
  }

  private set(s: PipelineState, detail?: string): void {
    this.state = s;
    this.emit("state", s, detail);
  }

  private spawnOnce(): void {
    this.set("starting");
    const child = spawn(this.bin, gstArgs(this.opts, this.target), { stdio: ["ignore", "pipe", "pipe"] });
    this.child = child;
    let err = "";
    child.stderr.on("data", (b: Buffer) => { err = (err + b.toString()).slice(-2000); });
    // Sans -v, gst-launch reste silencieux tant que tout va bien : après 2 s sans arrêt, le flux est considéré en direct.
    const ok = setTimeout(() => { this.retry = 0; this.set("live"); }, 2000);
    child.on("error", (e) => { clearTimeout(ok); this.set("error", `Impossible de lancer ${this.bin} : ${e.message}`); });
    child.on("exit", (code) => {
      clearTimeout(ok);
      this.child = null;
      if (this.stopping) return this.set("idle");
      this.set("error", err.trim().split("\n").pop() || `arrêt (code ${code})`);
      const wait = Math.min(15_000, 1000 * 2 ** this.retry++);
      this.timer = setTimeout(() => this.spawnOnce(), wait);
    });
  }

  stop(): Promise<void> {
    this.stopping = true;
    if (this.timer) clearTimeout(this.timer);
    const c = this.child;
    if (!c) { this.set("idle"); return Promise.resolve(); }
    return new Promise((resolve) => {
      c.once("exit", () => resolve());
      c.kill("SIGINT"); // -e : laisse GStreamer fermer proprement le flux
      setTimeout(() => c.kill("SIGKILL"), 3000).unref();
    });
  }
}
