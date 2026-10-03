// Session Bluetooth avec une caméra DJI (Web Bluetooth : Chrome / Edge sur Android et ordinateur, pas sur iPhone).
// Même enchaînement que Moblin (DjiDevice.swift, licence MIT, voir THIRD_PARTY_NOTICES.md) :
// appairage → arrêt d'un live éventuel → préparation → Wi-Fi → (stabilisation) → démarrage RTMP → live.

import {
  batteryFromStatus,
  configurePayload,
  confirmStartPayload,
  decodeMessage,
  DJI_COMPANY_IDS,
  encodeMessage,
  hasNewProtocol,
  message,
  modelFromManufacturerData,
  pairPayload,
  preparePayload,
  startPayload,
  stopPayload,
  supportsStabilization,
  T,
  wifiPayload,
  type DjiMessage,
  type DjiModel,
  type StartOptions,
  type Stabilization,
} from "./protocol.ts";

// ───────────── Types Web Bluetooth (absents de la lib DOM de TypeScript) ─────────────
type Characteristic = EventTarget & {
  value?: DataView;
  startNotifications(): Promise<Characteristic>;
  writeValueWithoutResponse(v: BufferSource): Promise<void>;
};
type Service = { getCharacteristic(uuid: number | string): Promise<Characteristic> };
type Gatt = { connected: boolean; connect(): Promise<Gatt>; disconnect(): void; getPrimaryService(uuid: number | string): Promise<Service> };
export type BtDevice = EventTarget & { id: string; name?: string; gatt?: Gatt; watchAdvertisements?(o?: { signal?: AbortSignal }): Promise<void> };
type Bluetooth = {
  requestDevice(o: unknown): Promise<BtDevice>;
  getDevices?(): Promise<BtDevice[]>;
  getAvailability?(): Promise<boolean>;
};
const bt = () => (typeof navigator !== "undefined" ? (navigator as Navigator & { bluetooth?: Bluetooth }).bluetooth : undefined);

/** Service GATT des caméras DJI (caractéristiques FFF4 = notifications, FFF5 = écriture). */
const SERVICE = 0xfff0;
const NOTIFY = 0xfff4;
const WRITE = 0xfff5;

export const bluetoothSupported = () => !!bt();

export type DjiState =
  | "idle"
  | "connecting"
  | "pairing"
  | "approve"
  | "preparing"
  | "wifi"
  | "configuring"
  | "starting"
  | "streaming"
  | "detached"
  | "stopping"
  | "error";

export type DjiError = "wifi" | "timeout" | "disconnected" | "service" | "cancelled" | "unsupported" | "relay" | "network";

export type LiveSettings = StartOptions & { ssid: string; password: string; model: DjiModel; stabilization: Stabilization };

/** Choix de la caméra (sélecteur du navigateur, geste de l'utilisateur obligatoire). */
export async function pickCamera(): Promise<BtDevice> {
  const b = bt();
  if (!b) throw new Error("unsupported");
  return b.requestDevice({
    filters: DJI_COMPANY_IDS.map((companyIdentifier) => ({ manufacturerData: [{ companyIdentifier }] })),
    optionalServices: [SERVICE],
  });
}

/** Caméra déjà autorisée sur ce navigateur (pour « Relancer le direct » sans sélecteur), si le navigateur le permet. */
export async function knownCamera(id: string): Promise<BtDevice | null> {
  try {
    return (await bt()?.getDevices?.())?.find((d) => d.id === id) ?? null;
  } catch {
    return null;
  }
}

/** Modèle d'après l'annonce Bluetooth (si le navigateur expose watchAdvertisements), sinon « unknown ». */
export async function detectModel(device: BtDevice, timeoutMs = 4000): Promise<DjiModel> {
  if (!device.watchAdvertisements) return "unknown";
  const abort = new AbortController();
  return new Promise<DjiModel>((resolve) => {
    const done = (m: DjiModel) => {
      abort.abort();
      device.removeEventListener("advertisementreceived", onAd);
      resolve(m);
    };
    const onAd = (e: Event) => {
      const data = (e as Event & { manufacturerData?: Map<number, DataView> }).manufacturerData;
      for (const id of DJI_COMPANY_IDS) {
        const v = data?.get(id);
        if (v) return done(modelFromManufacturerData(new Uint8Array(v.buffer, v.byteOffset, v.byteLength)));
      }
    };
    device.addEventListener("advertisementreceived", onAd);
    setTimeout(() => done("unknown"), timeoutMs);
    device.watchAdvertisements!({ signal: abort.signal }).catch(() => done("unknown"));
  });
}

export class DjiSession {
  private write: Characteristic | null = null;
  private state: DjiState = "idle";
  private settings: LiveSettings | null = null;
  private startTimer: ReturnType<typeof setTimeout> | null = null;
  private stopTimer: ReturnType<typeof setTimeout> | null = null;
  private prepareSent = false;
  battery: number | null = null;

  constructor(
    private device: BtDevice,
    private onChange: (s: { state: DjiState; error?: DjiError; battery: number | null }) => void,
  ) {
    device.addEventListener("gattserverdisconnected", () => {
      // Déjà en direct : la caméra garde son URL RTMP et continue de diffuser sans le téléphone (comme avec Moblin).
      if (this.state === "streaming") {
        this.write = null;
        this.set("detached");
        return;
      }
      if (this.state !== "idle" && this.state !== "error" && this.state !== "detached") this.fail(this.state === "stopping" ? undefined : "disconnected");
    });
  }

  get current() {
    return this.state;
  }

  private set(state: DjiState, error?: DjiError) {
    this.state = state;
    this.onChange({ state, error, battery: this.battery });
  }

  private clearTimers() {
    if (this.startTimer) clearTimeout(this.startTimer);
    if (this.stopTimer) clearTimeout(this.stopTimer);
    this.startTimer = this.stopTimer = null;
  }

  private fail(error?: DjiError) {
    this.clearTimers();
    try {
      this.device.gatt?.disconnect();
    } catch {
      // déjà déconnecté
    }
    this.write = null;
    this.set(error ? "error" : "idle", error);
  }

  private async send(t: { target: number; id: number; type: number }, payload: Uint8Array) {
    const frame = encodeMessage(message(t, payload));
    await this.write?.writeValueWithoutResponse(frame as unknown as BufferSource);
  }

  /** Connexion, appairage (validation sur l'écran de la caméra), Wi-Fi puis démarrage du live RTMP. 60 s au plus. */
  async start(settings: LiveSettings) {
    this.settings = settings;
    this.clearTimers();
    this.startTimer = setTimeout(() => this.fail("timeout"), 60_000);
    this.set("connecting");
    try {
      const gatt = await this.device.gatt!.connect();
      const service = await gatt.getPrimaryService(SERVICE);
      const notify = await service.getCharacteristic(NOTIFY);
      this.write = await service.getCharacteristic(WRITE);
      notify.addEventListener("characteristicvaluechanged", () => {
        const v = notify.value;
        if (!v) return;
        const m = decodeMessage(new Uint8Array(v.buffer, v.byteOffset, v.byteLength));
        if (m) void this.onMessage(m);
      });
      await notify.startNotifications();
      await this.send(T.pair, pairPayload());
      this.set("pairing");
    } catch (e) {
      console.error("dji start", e);
      this.fail((e as Error).name === "NotFoundError" ? "service" : "disconnected");
    }
  }

  /** Relance le live avec d'autres réglages (qualité adaptée) : arrêt, attente du retour à « Prête », puis démarrage. */
  async restart(patch: Partial<StartOptions>) {
    if (!this.settings) return;
    const next = { ...this.settings, ...patch };
    await this.stop();
    for (let i = 0; i < 100 && this.state !== "idle" && this.state !== "error"; i++) await new Promise((r) => setTimeout(r, 200));
    await this.start(next);
  }

  /** Lâche le Bluetooth sans arrêter le live (fermeture de la page) : la caméra continue de diffuser. */
  release() {
    if (this.state !== "streaming") return;
    this.clearTimers();
    try {
      this.device.gatt?.disconnect();
    } catch {
      // déjà déconnecté
    }
  }

  /** Arrête le live (la caméra coupe le RTMP), puis se déconnecte. Sans Bluetooth, il faut d'abord se reconnecter. */
  async stop() {
    if (this.state === "idle" || this.state === "error") return;
    if (this.state === "detached") return this.reconnectAndStop();
    this.clearTimers();
    this.stopTimer = setTimeout(() => this.fail(), 10_000);
    this.set("stopping");
    try {
      await this.send(T.stop, stopPayload());
    } catch {
      this.fail();
    }
  }

  /** Live lancé mais Bluetooth perdu : reconnexion + appairage, puis arrêt. */
  private async reconnectAndStop() {
    this.clearTimers();
    this.stopTimer = setTimeout(() => this.fail(), 20_000);
    this.set("stopping");
    try {
      const gatt = await this.device.gatt!.connect();
      const service = await gatt.getPrimaryService(SERVICE);
      const notify = await service.getCharacteristic(NOTIFY);
      this.write = await service.getCharacteristic(WRITE);
      notify.addEventListener("characteristicvaluechanged", () => {
        const v = notify.value;
        const m = v && decodeMessage(new Uint8Array(v.buffer, v.byteOffset, v.byteLength));
        if (m) void this.onMessage(m);
      });
      await notify.startNotifications();
      await this.send(T.stop, stopPayload());
    } catch {
      this.fail("disconnected");
    }
  }

  private async onMessage(m: DjiMessage) {
    const s = this.settings!;
    switch (this.state) {
      case "pairing":
        // Réponse à l'appairage : [0, 1] = déjà appairé, on continue. Sinon la caméra demande une validation sur son écran.
        if (m.id !== T.pair.id) return;
        if (m.payload.length >= 2 && m.payload[0] === 0 && m.payload[1] === 1) return this.afterPairing();
        this.set("approve");
        return;
      case "approve":
        // Validée sur la caméra : le message suivant, quel qu'il soit, confirme l'appairage (comme Moblin).
        return this.afterPairing();
      case "preparing":
        if (m.id === T.stop.id) return this.sendPrepare();
        if (m.id === T.prepare.id) {
          this.set("wifi");
          await this.send(T.wifi, wifiPayload(s.ssid, s.password));
        }
        return;
      case "wifi":
        if (m.id !== T.wifi.id) return;
        if (m.payload.length < 2 || m.payload[0] !== 0 || m.payload[1] !== 0) return this.fail("wifi");
        if (supportsStabilization(s.model)) {
          this.set("configuring");
          await this.send(T.configure, configurePayload(s.stabilization, s.model === "osmoAction5Pro" || s.model === "osmo360"));
        } else await this.sendStart();
        return;
      case "configuring":
        if (m.id === T.configure.id) await this.sendStart();
        return;
      case "starting":
        if (m.id !== T.start.id) return;
        this.clearTimers();
        this.set("streaming");
        return;
      case "streaming":
        if (m.type === T.statusType) {
          const b = batteryFromStatus(m.payload);
          if (b !== null && b !== this.battery) {
            this.battery = b;
            this.set("streaming");
          }
        }
        return;
      case "stopping":
        if (m.id === T.stop.id) this.fail();
        return;
    }
  }

  /** Appairé : on arrête un éventuel live en cours, puis préparation (réponse attendue à l'arrêt). */
  private async afterPairing() {
    // L'état passe à « preparing » AVANT l'envoi : la caméra peut répondre avant la fin de l'écriture Bluetooth, et la
    // réponse serait alors ignorée (état encore « pairing »), ce qui bloquait la préparation.
    this.set("preparing");
    this.prepareSent = false;
    await this.send(T.stop, stopPayload());
    // Secours : si la caméra ne répond pas à l'arrêt (aucun live en cours), on enchaîne quand même la préparation.
    setTimeout(() => void this.sendPrepare(), 3000);
  }

  private async sendPrepare() {
    if (this.state !== "preparing" || this.prepareSent) return;
    this.prepareSent = true;
    await this.send(T.prepare, preparePayload());
  }

  private async sendStart() {
    const s = this.settings!;
    this.set("starting");
    await this.send(T.start, startPayload(s, s.model));
    // Nouveaux modèles : confirmation nécessaire pour lancer réellement le flux (voir Moblin).
    if (hasNewProtocol(s.model)) await this.send(T.stop, confirmStartPayload());
  }
}
