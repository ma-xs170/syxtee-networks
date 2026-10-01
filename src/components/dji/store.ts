// Caméras DJI et réseaux mémorisés sur CE téléphone (localStorage) : l'identifiant Bluetooth d'une caméra n'a de sens
// que dans ce navigateur, et le mot de passe Wi-Fi ne doit jamais partir vers le serveur.

import type { Codec, DjiModel, Resolution, Stabilization } from "@/lib/dji/protocol";

export type Network = { id: string; kind: "hotspot" | "wifi"; ssid: string; password: string; remember: boolean };

export type Camera = {
  id: string;
  name: string;
  deviceId?: string;
  deviceName?: string;
  /** Marque : DJI (lancée en Bluetooth) ou GoPro (RTMP, lancée depuis l'app GoPro). Absent = DJI. */
  brand?: "dji" | "gopro";
  /** GoPro : modèle (texte libre parmi la liste). */
  gopro?: string;
  model: DjiModel;
  relayId: string;
  networkId: string;
  resolution: Resolution;
  fps: 25 | 30;
  bitrateKbps: number;
  codec: Codec;
  stabilization: Stabilization;
};

export type DjiStore = { cameras: Camera[]; networks: Network[] };

const KEY = "syxtee:dji:v2";
const OLD_KEY = "syxtee:dji";

export const newId = () => (typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`);

export const defaultCamera = (relayId: string, networkId = ""): Camera => ({
  id: newId(),
  name: "",
  brand: "dji",
  model: "osmoPocket3",
  relayId,
  networkId,
  resolution: "720p",
  fps: 30,
  bitrateKbps: 2000,
  codec: "h264",
  stabilization: "rockSteady",
});

/** Lecture (et reprise de l'ancien format à une caméra). Ne lève jamais. */
export function loadStore(): DjiStore {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return JSON.parse(raw) as DjiStore;
    const old = JSON.parse(localStorage.getItem(OLD_KEY) ?? "null") as (Partial<Camera> & { ssid?: string; password?: string; network?: "hotspot" | "wifi"; remember?: boolean }) | null;
    if (old?.relayId) {
      const net: Network = { id: newId(), kind: old.network ?? "hotspot", ssid: old.ssid ?? "", password: old.password ?? "", remember: old.remember ?? true };
      const cam: Camera = { ...defaultCamera(old.relayId, net.id), ...old, id: newId(), name: old.deviceName ?? "Ma caméra DJI", networkId: net.id } as Camera;
      return { cameras: [cam], networks: net.ssid ? [net] : [] };
    }
  } catch {
    // Stockage illisible ou indisponible : on repart de zéro.
  }
  return { cameras: [], networks: [] };
}

/** Écriture : le mot de passe n'est gardé que pour les réseaux où « Mémoriser » est coché. */
export function saveStore(s: DjiStore) {
  try {
    const safe: DjiStore = { cameras: s.cameras, networks: s.networks.map((n) => (n.remember ? n : { ...n, password: "" })) };
    localStorage.setItem(KEY, JSON.stringify(safe));
    localStorage.removeItem(OLD_KEY);
  } catch {
    // Navigation privée : rien n'est mémorisé, la page marche quand même.
  }
}
