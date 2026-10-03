// SYXTEE MIX : types et données SIMULÉES de la maquette (relais fictifs). Le backend (MediaMTX, FFmpeg, API /api/mix)
// remplacera ce fichier étape par étape : même forme `MixRelay`, mêmes champs, alimentés par le serveur média.

export type RelayStatus = "live" | "online" | "unstable" | "offline";
export type Protocol = "srtla" | "rtmp" | "rist";

export type MixRelay = {
  id: string;
  /** Numéro de caméra (CAM 1, CAM 2…), 1 à 8. */
  n: number;
  name: string;
  device: string;
  protocol: Protocol;
  status: RelayStatus;
  /** Illustration de la tuile (simulation seulement). */
  scene: "street" | "desk" | "phone" | "beach" | "streamer" | "home";
  kbps: number;
  fps: number;
  res: string;
  latencyMs: number;
  lossPct: number;
  /** Liens agrégés (SRTLA). */
  links: number;
  /** Secondes depuis la connexion. */
  uptime: number;
  /** Audio : volume en dB (-60 à +6), muet, solo, « audio suit l'image ». */
  volume: number;
  mute: boolean;
  solo: boolean;
  afv: boolean;
  /** Relais réel du compte (et non simulé). */
  real?: boolean;
};

export const INITIAL_RELAYS: MixRelay[] = [
  { id: "r1", n: 1, name: "iPhone 16", device: "Moblin", protocol: "srtla", status: "live", scene: "street", kbps: 5840, fps: 60, res: "1080p", latencyMs: 142, lossPct: 0.1, links: 4, uptime: 5412, volume: 0, mute: false, solo: false, afv: true },
  { id: "r2", n: 2, name: "Osmo Pocket 3", device: "RTMP", protocol: "rtmp", status: "online", scene: "phone", kbps: 4120, fps: 30, res: "1080p", latencyMs: 210, lossPct: 0.4, links: 1, uptime: 3120, volume: -6, mute: false, solo: false, afv: false },
  { id: "r3", n: 3, name: "BELABOX", device: "SRTLA", protocol: "srtla", status: "unstable", scene: "beach", kbps: 2210, fps: 28, res: "720p", latencyMs: 480, lossPct: 3.8, links: 2, uptime: 880, volume: -3, mute: false, solo: false, afv: false },
  { id: "r4", n: 4, name: "OBS PC", device: "RIST", protocol: "rist", status: "online", scene: "desk", kbps: 7980, fps: 60, res: "1080p", latencyMs: 96, lossPct: 0, links: 1, uptime: 9640, volume: -9, mute: false, solo: false, afv: false },
  { id: "r5", n: 5, name: "GoPro", device: "RTMP", protocol: "rtmp", status: "offline", scene: "home", kbps: 0, fps: 0, res: "–", latencyMs: 0, lossPct: 0, links: 0, uptime: 0, volume: 0, mute: true, solo: false, afv: false },
  { id: "r6", n: 6, name: "iPad Moblin", device: "Moblin", protocol: "srtla", status: "offline", scene: "streamer", kbps: 0, fps: 0, res: "–", latencyMs: 0, lossPct: 0, links: 0, uptime: 0, volume: 0, mute: true, solo: false, afv: false },
];

/** Couleur de la caméra (liseré des strips et pastilles), une teinte par numéro. */
export const camColor = (n: number) => `hsl(${(n * 47 + 10) % 360} 70% 62%)`;

export const isOn = (r: MixRelay) => r.status !== "offline";

/** « 01:23:45 ». */
export const tc = (seconds: number) => {
  const s = Math.max(0, Math.floor(seconds));
  const p = (n: number) => String(n).padStart(2, "0");
  return `${p(Math.floor(s / 3600))}:${p(Math.floor((s % 3600) / 60))}:${p(s % 60)}`;
};

/** Variation légère d'un relevé, pour que les chiffres vivent. */
const jitter = (v: number, pct: number) => v * (1 + (Math.random() - 0.5) * 2 * pct);

/** Une seconde de simulation : débit, latence, pertes et durée de connexion bougent un peu. */
export function stepStats(relays: MixRelay[]): MixRelay[] {
  return relays.map((r) => {
    if (!isOn(r)) return r;
    const unstable = r.status === "unstable";
    return {
      ...r,
      uptime: r.uptime + 1,
      kbps: Math.round(jitter(r.kbps, unstable ? 0.12 : 0.03)),
      latencyMs: Math.round(jitter(r.latencyMs, unstable ? 0.15 : 0.04)),
      lossPct: Math.max(0, Math.round(jitter(r.lossPct || 0.05, unstable ? 0.4 : 0.3) * 10) / 10),
    };
  });
}
