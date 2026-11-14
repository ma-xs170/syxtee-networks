import { execFile, spawn, type ChildProcess } from "node:child_process";
import { mkdirSync } from "node:fs";
import { join } from "node:path";
import type { Readable } from "node:stream";
import type { Relay } from "./relays.ts";
import { supervise, type Supervised } from "./supervisor.ts";

// Aperçu : une vignette JPEG toutes les N secondes par flux live. ffmpeg ne décode que les images-clés
// (-skip_frame nokey) : quelques % de CPU par flux, quelle que soit la définition.

export function previewArgs(o: { host: string; port: number; playId: string; out: string; intervalS: number }) {
  return [
    "-hide_banner", "-loglevel", "error",
    "-skip_frame", "nokey",
    "-i", `srt://${o.host}:${o.port}?streamid=${o.playId}&mode=caller&latency=200000`,
    "-map", "0:v:0", "-an",
    "-vf", `fps=1/${o.intervalS},scale=640:-2`,
    "-q:v", "6",
    "-f", "image2", "-update", "1", "-y", o.out,
  ];
}

// Informations du flux pour le centre de contrôle : format (ffprobe, une fois) et niveau audio (RMS en dB, deux relevés par seconde).
export type MediaInfo = { width: number | null; height: number | null; codec: string | null; fps: number | null; audio_db: number | null; audio: AudioLevels | null };
/** Niveaux par canal en dB : RMS (corps de la barre) et crête (trait). Mono : les deux canaux ont la même valeur. */
export type AudioLevels = { l: number; r: number; peak_l: number; peak_r: number };

export function audioArgs(o: { host: string; port: number; playId: string }) {
  return [
    "-hide_banner", "-loglevel", "error", "-nostats",
    "-i", `srt://${o.host}:${o.port}?streamid=${o.playId}&mode=caller&latency=200000`,
    "-map", "0:a:0", "-vn",
    "-af", "aresample=48000,asetnsamples=n=24000:p=0,astats=metadata=1:reset=1:measure_perchannel=RMS_level+Peak_level:measure_overall=none,ametadata=mode=print:file=-",
    "-f", "null", "-",
  ];
}

/** Lit « lavfi.astats.1.RMS_level=-21.09 » : canal, mesure et niveau ; « -inf » (silence) vaut -90. */
export function parseLevel(line: string): { ch: 1 | 2; kind: "rms" | "peak"; v: number } | null {
  const m = /astats\.([12])\.(RMS|Peak)_level=(-?inf|-?[0-9.]+)/.exec(line);
  if (!m) return null;
  const v = m[3].includes("inf") ? -90 : Number(m[3]);
  if (!Number.isFinite(v)) return null;
  return { ch: m[1] === "1" ? 1 : 2, kind: m[2] === "RMS" ? "rms" : "peak", v: Math.max(-90, Math.min(0, v)) };
}

export function parseProbe(out: string): Pick<MediaInfo, "width" | "height" | "codec" | "fps"> {
  try {
    const st = (JSON.parse(out) as { streams?: { width?: number; height?: number; codec_name?: string; avg_frame_rate?: string; r_frame_rate?: string }[] }).streams?.[0];
    const [a, b] = (st?.avg_frame_rate && st.avg_frame_rate !== "0/0" ? st.avg_frame_rate : (st?.r_frame_rate ?? "0/1")).split("/").map(Number);
    return { width: st?.width ?? null, height: st?.height ?? null, codec: st?.codec_name ?? null, fps: b ? Math.round((a / b) * 100) / 100 : null };
  } catch {
    return { width: null, height: null, codec: null, fps: null };
  }
}

export function createPreviews(o: { dir: string; host: string; port: number; intervalS: number; log: (m: string) => void }) {
  mkdirSync(o.dir, { recursive: true });
  const running = new Map<string, Supervised>();
  const path = (relayId: string) => join(o.dir, `${relayId}.jpg`);
  type Probe = { info: MediaInfo; at: number; child: ChildProcess | null; stopped: boolean; timer: NodeJS.Timeout | null };
  const probes = new Map<string, Probe>();

  function startProbe(id: string, k: Relay) {
    const pr: Probe = { info: { width: null, height: null, codec: null, fps: null, audio_db: null, audio: null }, at: 0, child: null, stopped: false, timer: null };
    probes.set(id, pr);
    const src = `srt://${o.host}:${o.port}?streamid=${k.play_id}&mode=caller&latency=200000`;
    // Format : ffprobe, jusqu'à 5 essais (le flux vient de démarrer).
    let tries = 0;
    const probe = () => {
      if (pr.stopped || tries++ >= 5) return;
      execFile("ffprobe", ["-v", "error", "-select_streams", "v:0", "-show_entries", "stream=width,height,codec_name,avg_frame_rate,r_frame_rate", "-of", "json", src], { timeout: 15_000 }, (err, out) => {
        const r = err ? null : parseProbe(out);
        if (r?.width) pr.info = { ...pr.info, ...r };
        else setTimeout(probe, 4000).unref();
      });
    };
    probe();
    // Niveau audio : un ffmpeg qui n'écrit que des mesures, relancé s'il s'arrête.
    let delay = 2000;
    const listen = () => {
      if (pr.stopped) return;
      const c = spawn("ffmpeg", audioArgs({ host: o.host, port: o.port, playId: k.play_id }), { stdio: ["ignore", "pipe", "pipe"] });
      pr.child = c;
      let errLogged = false;
      c.stderr.on("data", (d: Buffer) => {
        if (errLogged) return;
        errLogged = true;
        o.log(`vumètre ${id} : ${d.toString().trim().split("\n")[0].slice(0, 200)}`);
      });
      let buf = "";
      let cur = { l: -90, r: -90, peak_l: -90, peak_r: -90 };
      let got = false;
      let stereo = false;
      // ametadata écrit « frame:… » puis les mesures de la trame : un relevé est complet quand la trame suivante commence.
      const publish = () => {
        if (!got) return;
        const a: AudioLevels = stereo ? cur : { ...cur, r: cur.l, peak_r: cur.peak_l };
        pr.info = { ...pr.info, audio: a, audio_db: Math.max(a.l, a.r) };
        pr.at = Date.now();
        delay = 2000;
        cur = { l: -90, r: -90, peak_l: -90, peak_r: -90 };
        got = false;
        stereo = false;
      };
      c.stdout.on("data", (d: Buffer) => {
        buf += d.toString();
        const lines = buf.split("\n");
        buf = lines.pop() ?? "";
        for (const l of lines) {
          if (l.startsWith("frame:")) {
            publish();
            continue;
          }
          const m = parseLevel(l);
          if (!m) continue;
          got = true;
          if (m.ch === 2) stereo = true;
          cur[m.kind === "rms" ? (m.ch === 1 ? "l" : "r") : m.ch === 1 ? "peak_l" : "peak_r"] = m.v;
        }
      });
      c.on("error", () => undefined);
      c.on("exit", () => {
        pr.child = null;
        if (pr.stopped) return;
        pr.timer = setTimeout(listen, delay);
        pr.timer.unref();
        delay = Math.min(delay * 2, 30_000);
      });
    };
    listen();
  }
  function stopProbe(id: string) {
    const pr = probes.get(id);
    if (!pr) return;
    pr.stopped = true;
    if (pr.timer) clearTimeout(pr.timer);
    pr.child?.kill("SIGKILL");
    probes.delete(id);
  }

  return {
    path,
    /** Format et niveau audio du flux (le niveau est null s'il n'a pas été mesuré depuis 5 s : pas de son, ou flux en panne). */
    info(relayId: string): MediaInfo | null {
      const pr = probes.get(relayId);
      if (!pr) return null;
      const fresh = Date.now() - pr.at < 5000;
      return { ...pr.info, audio_db: fresh ? pr.info.audio_db : null, audio: fresh ? pr.info.audio : null };
    },
    /** Aligne les processus sur la liste des flux live. */
    sync(live: Relay[]) {
      const want = new Map(live.map((k) => [k.id, k]));
      for (const [id, p] of running) {
        if (!want.has(id)) {
          p.stop();
          running.delete(id);
        }
      }
      for (const id of [...probes.keys()]) if (!want.has(id)) stopProbe(id);
      for (const [id, k] of want) {
        if (running.has(id)) continue;
        const args = previewArgs({ host: o.host, port: o.port, playId: k.play_id, out: path(id), intervalS: o.intervalS });
        running.set(id, supervise(`aperçu ${id.slice(0, 8)}`, "ffmpeg", args, o.log));
        startProbe(id, k);
      }
    },
    stopAll() {
      for (const p of running.values()) p.stop();
      running.clear();
      for (const id of [...probes.keys()]) stopProbe(id);
    },
  };
}

// Aperçu vidéo en direct : le flux du relais remuxé en MPEG-TS (sans réencodage, CPU quasi nul),
// lu par le navigateur avec mpegts.js. Un ffmpeg par spectateur, tué à la fermeture de la connexion.

export function liveArgs(o: { host: string; port: number; playId: string }) {
  return [
    "-hide_banner", "-loglevel", "error",
    "-fflags", "nobuffer",
    "-i", `srt://${o.host}:${o.port}?streamid=${o.playId}&mode=caller&latency=200000`,
    "-map", "0:v:0", "-map", "0:a:0?",
    "-c", "copy",
    "-f", "mpegts", "-muxdelay", "0", "-flush_packets", "1",
    "pipe:1",
  ];
}

export type LiveFeed = { stream: Readable; stop: () => void };

export function openLive(o: { host: string; port: number; playId: string }): LiveFeed {
  const child = spawn("ffmpeg", liveArgs(o), { stdio: ["ignore", "pipe", "ignore"] });
  child.on("error", () => child.stdout.destroy());
  return {
    stream: child.stdout,
    stop: () => void (child.exitCode === null && child.kill("SIGKILL")),
  };
}
