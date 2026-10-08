// Types du produit SYXTEE Encodeur : le boîtier où l'on branche sa caméra (entrée vidéo) et qui diffuse en bondant plusieurs connexions.
// Partagés par la démo publique et le dashboard client. Aucune marque tierce hors YouTube, Twitch et Kick.

/** Connexions de l'Encodeur : trois intégrées (Wi-Fi, Ethernet, 4G ou 5G) plus une clé 4G USB qui ajoute une connexion. */
export type ConnId = "wifi" | "eth" | "cell" | "usb";
export type SceneId = "live" | "brb" | "slate" | "chat";
export type ResolutionId = "720p30" | "1080p30" | "1080p60";
export type ModeId = "quality" | "balanced" | "latency";
export type Status = "stable" | "unstable" | "offline";
export type LiveState = "off" | "starting" | "on";
export type EncoderStatus = "live" | "online" | "offline";

export type Encoder = {
  id: string;
  name: string;
  status: EncoderStatus;
  /** Nombre de barres de signal, 0 à 4. */
  signal: number;
  lastSeen: string;
  firmware: string;
  ip: string;
};

export type Connection = {
  id: ConnId;
  label: string;
  operator: string;
  enabled: boolean;
  /** Débit mesuré en Mb/s. */
  rate: number;
  latency: number;
  signal: number;
  /** Rang de priorité, 1 = prioritaire. */
  priority: number;
};

export type Destination = { id: "youtube" | "twitch" | "kick"; name: string; connected: boolean; key: string };
export type Scene = { id: SceneId; name: string; key: string };

export type StreamStats = {
  seconds: number;
  total: number;
  latency: number;
  loss: number;
  fps: number;
  slate: boolean;
  status: Status;
  dataPerHour: number;
};

export type Alert = { id: string; label: string; detail: string; enabled: boolean };
export type EventLog = { time: string; text: string; status: "ok" | "warn" | "bad" };
export type FirmwareInfo = { current: string; available: string | null; state: "idle" | "installing" | "done"; progress: number };

export type EncodingSettings = { res: ResolutionId; maxBitrate: number; mode: ModeId; codec: string };

/** Entrée caméra : le cœur du produit. */
export type CameraInput = {
  state: "connected" | "nosignal";
  type: "HDMI" | "USB";
  /** Résolution et fréquence détectées, ex. « 1080p60 ». */
  detected: string;
  audioLevel: number;
  test: "idle" | "testing" | "ok";
  framing: "frame" | "full";
};

export type SystemInfo = { temp: number; battery: number; storage: number; cpu: number; gpu: number; ram: number };
