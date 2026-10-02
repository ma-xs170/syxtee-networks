import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { Relay } from "./relays.ts";
import { CLOCK, mireSvg } from "./mire.ts";
import { sessionCode } from "./ids.ts";
import { supervise, type Supervised } from "./supervisor.ts";

// Régie : sortie SRT toujours active pour OBS. Le flux du téléphone passe tel quel à l'image ; s'il coupe
// (plus de paquets depuis REGIE_TIMEOUT_MS), fallbackswitch bascule sur la mire SYXTEE, puis revient seul au direct.
// La sortie est republiée dans le SLS (out_publish_id) : OBS la lit avec out_play_id, comme un flux normal.
// Réencodage x264 : ~1,5–2 vCPU par flux en 1080p, ~0,7 en 720p. Validé en local avec GStreamer 1.28 + gst-plugins-rs.

export type RegieOptions = {
  srtHost: string;
  playPort: number;
  publishPort: number;
  width: number;
  height: number;
  fps: number;
  bitrateKbps: number;
  timeoutMs: number;
  beep: boolean;
};

const MS = 1_000_000; // ns

/** Arguments de gst-launch-1.0 (un argument par jeton ; les valeurs avec espaces sont entre guillemets). */
export function regieArgs(o: RegieOptions & { playId: string; outPublishId: string; mireSvgPath: string }) {
  const video = `video/x-raw,format=I420,width=${o.width},height=${o.height},framerate=${o.fps}/1`;
  const audio = "audio/x-raw,format=F32LE,rate=48000,channels=2,layout=interleaved";
  const scale = o.width / 1280;
  const sw = (name: string) => [
    "fallbackswitch", `name=${name}`, `timeout=${o.timeoutMs * MS}`, "immediate-fallback=true", "stop-on-eos=false",
    "sink_0::priority=0", "sink_1::priority=1",
  ];
  return [
    "-e",
    ...sw("vsw"),
    ...sw("asw"),
    // Entrée : le flux du téléphone lu dans le SLS. fallbacksrc réessaie seul tant que le téléphone est absent.
    "fallbacksrc", "name=src", `uri=srt://${o.srtHost}:${o.playPort}?streamid=${o.playId}&latency=200`,
    "enable-dummy=false", "restart-on-eos=true", `timeout=${1000 * MS}`, `restart-timeout=${2000 * MS}`, `retry-timeout=${86_400_000 * MS}`,
    "src.video_0", "!", "videoconvert", "!", "videoscale", "!", "videorate", "!", video, "!", "queue", "!", "vsw.sink_0",
    "src.audio_0", "!", "audioconvert", "!", "audioresample", "!", audio, "!", "queue", "!", "asw.sink_0",
    // Mire : fond + SVG + heure en direct.
    "videotestsrc", "is-live=true", "pattern=black", "!", `video/x-raw,width=${o.width},height=${o.height},framerate=${o.fps}/1`, "!",
    "rsvgoverlay", `location=${o.mireSvgPath}`, "!",
    "clockoverlay", "time-format=%H:%M:%S", "halignment=right", "valignment=top",
    `xpad=${Math.round(CLOCK.right * scale)}`, `ypad=${Math.round(CLOCK.top * scale)}`, `font-desc="${CLOCK.font} ${Math.round(CLOCK.size * scale)}"`,
    "shaded-background=false", "draw-shadow=false", "auto-resize=false", "!",
    "videoconvert", "!", "video/x-raw,format=I420", "!", "queue", "!", "vsw.sink_1",
    // Son de la mire : silence, ou bip 1 kHz discret.
    "audiotestsrc", "is-live=true", ...(o.beep ? ["wave=sine", "freq=1000", "volume=0.05"] : ["wave=silence"]), "!", audio, "!", "queue", "!", "asw.sink_1",
    // Sortie : H.264 + AAC en MPEG-TS, republiée dans le SLS.
    "vsw.", "!", "queue", "!", "x264enc", "tune=zerolatency", "speed-preset=veryfast", `bitrate=${o.bitrateKbps}`, `key-int-max=${o.fps * 2}`, "!",
    "h264parse", "config-interval=-1", "!", "queue", "!", "mux.",
    "asw.", "!", "queue", "!", "audioconvert", "!", "avenc_aac", "bitrate=128000", "!", "aacparse", "!", "queue", "!", "mux.",
    "mpegtsmux", "name=mux", "alignment=7", "!",
    "srtsink", `uri=srt://${o.srtHost}:${o.publishPort}?streamid=${o.outPublishId}`, "wait-for-connection=false",
  ];
}

export function createRegie(o: RegieOptions & { dir: string; tz: string; relay: string; logoPng?: Buffer; log: (m: string) => void; username: (userId: string) => Promise<string> }) {
  mkdirSync(o.dir, { recursive: true });
  const running = new Map<string, { proc: Supervised; outPublishId: string }>();

  async function start(k: Relay) {
    const svgPath = join(o.dir, `${k.id}.svg`);
    const source = await o.username(k.user_id);
    writeFileSync(svgPath, mireSvg({ width: o.width, height: o.height, relay: o.relay, source, session: sessionCode(), logoPng: o.logoPng }));
    const args = regieArgs({ ...o, playId: k.play_id, outPublishId: k.out_publish_id, mireSvgPath: svgPath });
    running.set(k.id, { proc: supervise(`régie ${source}`, "gst-launch-1.0", args, o.log, { TZ: o.tz }), outPublishId: k.out_publish_id });
  }

  return {
    /** Une régie par relais autorisé : la mire est native, pas une option (clé changée : la régie redémarre). */
    async sync(keys: Relay[]) {
      const want = new Map(keys.map((k) => [k.id, k]));
      for (const [id, r] of running) {
        const k = want.get(id);
        if (!k || k.out_publish_id !== r.outPublishId) {
          r.proc.stop();
          running.delete(id);
        }
      }
      for (const [id, k] of want) if (!running.has(id)) await start(k);
    },
    stopAll() {
      for (const r of running.values()) r.proc.stop();
      running.clear();
    },
  };
}
