// Protocole Bluetooth des caméras DJI (Osmo Action, Osmo 360, Osmo Pocket) pour lancer un live RTMP.
// Porté en TypeScript depuis Moblin (github.com/eerimoq/moblin, Moblin/Integrations/Dji), licence MIT :
//   Copyright (c) 2023 Erik Moqvist. Permission is hereby granted, free of charge, to any person obtaining a copy of
//   this software… (texte complet : THIRD_PARTY_NOTICES.md). Le protocole a été rétro-ingénié par le projet Moblin.
// Aucune dépendance au navigateur ici : trames, CRC et contenus de messages, testés dans protocol.test.ts.

// ───────────── Trames : 0x55, longueur, version 4, CRC8 d'en-tête, cible, transaction, type, contenu, CRC16 ─────────────

const FIRST_BYTE = 0x55;
const VERSION = 0x04;

const reverse8 = (b: number) => {
  let r = 0;
  for (let i = 0; i < 8; i++) r |= ((b >> i) & 1) << (7 - i);
  return r;
};
const reverse16 = (v: number) => (reverse8(v & 0xff) << 8) | reverse8(v >> 8);

/** CRC-8 (poly 0x31, init 0xEE, entrée et sortie réfléchies), comme CrcSwift.computeCrc8. */
export function crc8(data: Uint8Array) {
  let crc = 0xee;
  for (const byte of data) {
    crc ^= reverse8(byte);
    for (let i = 0; i < 8; i++) crc = crc & 0x80 ? ((crc << 1) ^ 0x31) & 0xff : (crc << 1) & 0xff;
  }
  return reverse8(crc);
}

/** CRC-16 (poly 0x1021, init 0x496C, entrée et sortie réfléchies), comme CrcSwift.computeCrc16. */
export function crc16(data: Uint8Array) {
  let crc = 0x496c;
  for (const byte of data) {
    crc ^= reverse8(byte) << 8;
    for (let i = 0; i < 8; i++) crc = crc & 0x8000 ? ((crc << 1) ^ 0x1021) & 0xffff : (crc << 1) & 0xffff;
  }
  return reverse16(crc);
}

export type DjiMessage = { target: number; id: number; type: number; payload: Uint8Array };

const utf8 = (s: string) => new TextEncoder().encode(s);
const concat = (...parts: (Uint8Array | readonly number[])[]) => {
  const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0));
  let o = 0;
  for (const p of parts) {
    out.set(p, o);
    o += p.length;
  }
  return out;
};
const u16le = (v: number) => [v & 0xff, (v >> 8) & 0xff];
const u24le = (v: number) => [v & 0xff, (v >> 8) & 0xff, (v >> 16) & 0xff];

export function encodeMessage(m: DjiMessage): Uint8Array {
  const head = [FIRST_BYTE, (13 + m.payload.length) & 0xff, VERSION];
  const body = concat(head, [crc8(Uint8Array.from(head))], u16le(m.target), u16le(m.id), u24le(m.type), m.payload);
  return concat(body, u16le(crc16(body)));
}

/** Trame reçue de la caméra (notification FFF4) ; null si corrompue. */
export function decodeMessage(data: Uint8Array): DjiMessage | null {
  if (data.length < 13 || data[0] !== FIRST_BYTE || data[1] !== data.length || data[2] !== VERSION) return null;
  if (data[3] !== crc8(data.subarray(0, 3))) return null;
  const crc = data[data.length - 2] | (data[data.length - 1] << 8);
  if (crc !== crc16(data.subarray(0, data.length - 2))) return null;
  return {
    target: data[4] | (data[5] << 8),
    id: data[6] | (data[7] << 8),
    type: data[8] | (data[9] << 8) | (data[10] << 16),
    payload: data.slice(11, data.length - 2),
  };
}

const packString = (s: string) => {
  const b = utf8(s);
  return concat([b.length & 0xff], b);
};
const packUrl = (s: string) => {
  const b = utf8(s);
  return concat([b.length & 0xff, 0], b);
};

// ───────────── Modèles (données constructeur de l'annonce Bluetooth) ─────────────

export type DjiModel = "osmoAction2" | "osmoAction3" | "osmoAction4" | "osmoAction5Pro" | "osmoAction6" | "osmo360" | "osmoPocket3" | "osmoPocket4" | "unknown";

export const DJI_MODELS: { id: DjiModel; name: string }[] = [
  { id: "osmoPocket3", name: "Osmo Pocket 3" },
  { id: "osmoPocket4", name: "Osmo Pocket 4" },
  { id: "osmoAction6", name: "Osmo Action 6" },
  { id: "osmoAction5Pro", name: "Osmo Action 5 Pro" },
  { id: "osmoAction4", name: "Osmo Action 4" },
  { id: "osmoAction3", name: "Osmo Action 3" },
  { id: "osmoAction2", name: "Osmo Action 2" },
  { id: "osmo360", name: "Osmo 360" },
];

/** Identifiants Bluetooth SIG de DJI (0x08AA) et Xtra (0xF7AA), comme octets « AA 08 » / « AA F7 » en tête. */
export const DJI_COMPANY_IDS = [0x08aa, 0xf7aa];

const MODEL_BYTES: Record<string, DjiModel> = {
  "10": "osmoAction2",
  "12": "osmoAction3",
  "14": "osmoAction4",
  "15": "osmoAction5Pro",
  "17": "osmo360",
  "18": "osmoAction6",
  "20": "osmoPocket3",
  "21": "osmoPocket4",
};

/** Modèle d'après les données constructeur SANS l'identifiant (Web Bluetooth les sépare) : octets 0-1 = modèle. */
export function modelFromManufacturerData(data: Uint8Array): DjiModel {
  if (data.length < 2 || data[1] !== 0x00) return "unknown";
  return MODEL_BYTES[data[0].toString(16).padStart(2, "0")] ?? "unknown";
}

const NEW_PROTOCOL: DjiModel[] = ["osmoAction5Pro", "osmoAction6", "osmo360", "osmoPocket4"];
export const hasNewProtocol = (m: DjiModel) => NEW_PROTOCOL.includes(m);
/** Modèles qui reçoivent le codec (contenu JSON de démarrage). Les autres gardent le codec réglé sur la caméra. */
export const supportsCodecChoice = (m: DjiModel) => m === "osmoPocket4" || m === "osmoAction6";
/** Modèles avec réglage de stabilisation avant le live. */
export const supportsStabilization = (m: DjiModel) => m === "osmoAction4" || m === "osmoAction6" || m === "osmoAction5Pro" || m === "osmo360";

// ───────────── Messages ─────────────

export const T = {
  pair: { target: 0x0702, id: 0x8092, type: 0x450740 },
  stop: { target: 0x0802, id: 0xeac8, type: 0x8e0240 },
  prepare: { target: 0x0802, id: 0x8c12, type: 0xe10240 },
  wifi: { target: 0x0702, id: 0x8c19, type: 0x470740 },
  configure: { target: 0x0102, id: 0x8c2d, type: 0x8e0240 },
  start: { target: 0x0802, id: 0x8c2c, type: 0x780840 },
  statusType: 0x020d00,
} as const;

const PAIR_PREFIX = Uint8Array.from([
  0x20, 0x32, 0x38, 0x34, 0x61, 0x65, 0x35, 0x62, 0x38, 0x64, 0x37, 0x36, 0x62, 0x33, 0x33, 0x37, 0x35, 0x61, 0x30, 0x34, 0x61, 0x36, 0x34, 0x31, 0x37, 0x61,
  0x64, 0x37, 0x31, 0x62, 0x65, 0x61, 0x33,
]);
/** Code d'appairage : le même que Moblin, pour qu'une caméra déjà appairée avec Moblin ne redemande pas de validation. */
export const PAIR_PIN = "mbln";

export const pairPayload = (pin = PAIR_PIN) => concat(PAIR_PREFIX, packString(pin));
export const stopPayload = () => Uint8Array.from([0x01, 0x01, 0x1a, 0x00, 0x01, 0x02]);
/** Confirmation de démarrage (nouveaux modèles) : même message que l'arrêt, dernier octet à 1. */
export const confirmStartPayload = () => Uint8Array.from([0x01, 0x01, 0x1a, 0x00, 0x01, 0x01]);
export const preparePayload = () => Uint8Array.from([0x1a]);
export const wifiPayload = (ssid: string, password: string) => concat(packString(ssid), packString(password));

export type Stabilization = "off" | "rockSteady" | "rockSteadyPlus" | "horizonBalancing" | "horizonSteady";
const STAB: Record<Stabilization, number> = { off: 0, rockSteady: 1, horizonSteady: 2, rockSteadyPlus: 3, horizonBalancing: 4 };
export const configurePayload = (stab: Stabilization, oa5: boolean) => Uint8Array.from([0x01, 0x01, oa5 ? 0x1a : 0x08, 0x00, 0x01, STAB[stab]]);

export type Resolution = "480p" | "720p" | "1080p";
const RES: Record<Resolution, number> = { "480p": 0x47, "720p": 0x04, "1080p": 0x0a };
const FPS = (fps: number) => (fps === 25 ? 2 : fps === 30 ? 3 : 0);
export type Codec = "h264" | "h265";

export type StartOptions = { rtmpUrl: string; resolution: Resolution; fps: 25 | 30; bitrateKbps: number; codec: Codec };

/** Ancien format (Osmo Action 2-5, Osmo 360, Osmo Pocket 3). */
export function startPayloadV1(o: StartOptions, oa5: boolean) {
  return concat([0x00, oa5 ? 0x2a : 0x2e, 0x00, RES[o.resolution]], u16le(o.bitrateKbps & 0xffff), [0x02, 0x00, FPS(o.fps), 0x00, 0x00, 0x00], packUrl(o.rtmpUrl));
}

const V2 = {
  osmoPocket4: { header: [0x01, 0xb5, 0x00], middle: [0x02, 0x01] },
  osmoAction6: { header: [0x01, 0x9c, 0x00], middle: [0xfe, 0x00] },
} as const;

/** Nouveau format JSON (Osmo Pocket 4, Osmo Action 6) : codec et RTMP amélioré (HEVC). */
export function startPayloadV2(o: StartOptions, model: "osmoPocket4" | "osmoAction6") {
  // Identique à Moblin (JSONEncoder Swift) : même ordre de clés, et « / » échappé en « \/ ».
  const json = utf8(
    JSON.stringify({ codec: o.codec === "h265" ? "HEVC" : "AVC", EnhancedRTMP: o.codec === "h265", supportStopLive: false, watermark: 0, rtmpAddress: o.rtmpUrl, orientation: "landscape" }).replace(
      /\//g,
      "\\/",
    ),
  );
  const v = V2[model];
  return concat(v.header, [RES[o.resolution]], u16le(o.bitrateKbps & 0xffff), v.middle, [FPS(o.fps), 0x00, 0x00, 0x00], u16le(json.length), json);
}

export function startPayload(o: StartOptions, model: DjiModel) {
  if (model === "osmoPocket4" || model === "osmoAction6") return startPayloadV2(o, model);
  return startPayloadV1(o, hasNewProtocol(model));
}

/** Batterie (%) dans un message d'état reçu pendant le live. */
export const batteryFromStatus = (payload: Uint8Array) => (payload.length >= 21 ? payload[20] : null);

export const message = (t: { target: number; id: number; type: number }, payload: Uint8Array): DjiMessage => ({ ...t, payload });
