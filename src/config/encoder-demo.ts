// Données de la démo du tableau de bord de l'Encodeur (aucun backend). Valeurs d'exemple, jamais présentées comme des mesures réelles.
// Seules marques tierces autorisées : YouTube, Twitch, Kick.

import type { ConnId, ModeId, ResolutionId, SceneId } from "@/lib/encoder/types";
export type { ConnId, ModeId, ResolutionId, SceneId };

export type ConnDef = { id: ConnId; label: string; operator: string; base: number; latency: number; signal: number };

export const CONNECTIONS: ConnDef[] = [
  { id: "5g", label: "5G", operator: "Opérateur A", base: 3.6, latency: 38, signal: 4 },
  { id: "4g", label: "4G", operator: "Opérateur B", base: 2.4, latency: 52, signal: 3 },
  { id: "esim", label: "eSIM", operator: "Données voyage", base: 1.4, latency: 66, signal: 3 },
  { id: "wifi", label: "Wi-Fi", operator: "Point d'accès", base: 2.0, latency: 28, signal: 4 },
  { id: "eth", label: "Ethernet", operator: "Câble réseau", base: 3.0, latency: 12, signal: 4 },
  { id: "sat", label: "Satellite", operator: "Terminal compact", base: 1.9, latency: 120, signal: 4 },
];

export const SCENES: { id: SceneId; name: string; key: string }[] = [
  { id: "live", name: "Live IRL", key: "1" },
  { id: "brb", name: "BRB", key: "2" },
  { id: "slate", name: "Slate", key: "3" },
  { id: "chat", name: "Chat", key: "4" },
];

export const RESOLUTIONS = [
  { id: "720p30", label: "720p30", fps: 30, need: 3 },
  { id: "1080p30", label: "1080p30", fps: 30, need: 5 },
  { id: "1080p60", label: "1080p60", fps: 60, need: 8 },
] as const;

export const MODES = [
  { id: "quality", label: "Qualité", latency: 78 },
  { id: "balanced", label: "Équilibré", latency: 52 },
  { id: "latency", label: "Latence", latency: 38 },
] as const;
/** Entrée caméra de la démo. */
export const CAMERA = { type: "HDMI" as const, detected: "1080p60" };

export const CODECS = ["H.264", "H.265"] as const;

export const DESTINATIONS = [
  { id: "youtube", name: "YouTube", connected: true, key: "yt-4f7k-92qd-m3xa" },
  { id: "twitch", name: "Twitch", connected: true, key: "live_839204_aB3dEfGhIjKl" },
  { id: "kick", name: "Kick", connected: false, key: "kk-0000-0000-0000" },
] as const;
export const RELAY_URL = "srtla://relais.syxtee-networks.fr:PORT?streamid=TON_ID";

export const ALERT_THRESHOLDS = [
  { id: "bitrate", label: "Débit bas", detail: "Alerte sous 3 Mb/s", on: true },
  { id: "signal", label: "Perte de signal", detail: "Alerte si une connexion tombe", on: true },
  { id: "loss", label: "Perte de paquets", detail: "Alerte au-dessus de 2 %", on: false },
  { id: "temp", label: "Température", detail: "Alerte au-dessus de 70 °C", on: true },
];

export type DemoEvent = { time: string; text: string; status: "ok" | "warn" | "bad" };
export const INITIAL_EVENTS: DemoEvent[] = [
  { time: "10:12", text: "Direct démarré", status: "ok" },
  { time: "10:31", text: "4G : signal faible, le bonding compense", status: "warn" },
  { time: "10:32", text: "4G : reconnectée", status: "ok" },
  { time: "10:47", text: "Slate affiché pendant 4 s", status: "warn" },
];

export const SYSTEM = { temp: 48, battery: 86, storage: 41, cpu: 34, firmware: "0.1.0", nextFirmware: "0.2.0" };

/** Durée du scénario automatique, en secondes. */
export const LOOP_SECONDS = 20;
