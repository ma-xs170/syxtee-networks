import { MockEncoderEngine } from "./mockEngine";
import type { EncoderProvider } from "./provider";
import type { Encoder, StreamStats } from "./types";

// Implémentation simulée de EncoderProvider : valeurs réalistes, événements, scénario automatique.
// Utilisée par la démo publique ET par le dashboard client (NEXT_PUBLIC_ENCODER_BACKEND=mock, par défaut) tant que le backend n'est pas prêt.

const PAIRED_KEY = "syxtee-encoder-paired";

function toStats(e: MockEncoderEngine): StreamStats {
  const { snap } = e.getState();
  return { seconds: snap.seconds, total: snap.total, latency: snap.latency, loss: snap.loss, fps: snap.fps, slate: snap.slate, status: snap.status, dataPerHour: snap.dataPerHour };
}

export class MockEncoderProvider implements EncoderProvider {
  private engines = new Map<string, MockEncoderEngine>();
  private paired: Encoder[] = [];

  engine(id: string) {
    let e = this.engines.get(id);
    if (!e) {
      e = new MockEncoderEngine(id);
      this.engines.set(id, e);
    }
    return e;
  }

  private load(): Encoder[] {
    if (typeof window === "undefined") return this.paired;
    try {
      const raw = window.localStorage.getItem(PAIRED_KEY);
      if (raw) this.paired = JSON.parse(raw) as Encoder[];
    } catch {
      /* stockage indisponible : on garde la liste en mémoire */
    }
    return this.paired;
  }

  async getEncoders(): Promise<Encoder[]> {
    return this.load().map((e) => {
      const { c, snap } = this.engine(e.id).getState();
      return { ...e, status: c.live === "on" ? "live" : "online", signal: Math.max(...Object.values(snap.signal)), firmware: c.update.state === "done" ? "0.2.0" : e.firmware, lastSeen: "à l'instant" };
    });
  }
  async getStats(id: string) {
    return toStats(this.engine(id));
  }
  subscribeStats(id: string, cb: (s: StreamStats) => void) {
    const e = this.engine(id);
    return e.subscribe(() => cb(toStats(e)));
  }
  async setConnectionEnabled(id: string, connId: Parameters<MockEncoderEngine["setConnectionEnabled"]>[0], on: boolean) {
    this.engine(id).setConnectionEnabled(connId, on);
  }
  async startStream(id: string) {
    this.engine(id).startStream();
  }
  async stopStream(id: string) {
    this.engine(id).stopStream();
  }
  async setEncoding(id: string, settings: Parameters<MockEncoderEngine["setEncoding"]>[0]) {
    this.engine(id).setEncoding(settings);
  }
  async setDestination(id: string, destId: string, connected: boolean) {
    this.engine(id).setDestination(destId, connected);
  }
  async switchScene(id: string, scene: Parameters<MockEncoderEngine["switchScene"]>[0]) {
    this.engine(id).switchScene(scene);
  }
  async reboot(id: string) {
    this.engine(id).reboot();
  }
  /** Code à 6 caractères : tout code bien formé est accepté, sauf « ZZZZZZ » (pour montrer l'état d'erreur). */
  async pair(code: string): Promise<Encoder> {
    const c = code.trim().toUpperCase();
    await new Promise((r) => setTimeout(r, 900));
    if (!/^[A-Z0-9]{6}$/.test(c) || c === "ZZZZZZ") throw new Error("Code invalide ou expiré. Vérifie le code affiché sur ton boîtier.");
    const enc: Encoder = { id: `enc-${c.toLowerCase()}`, name: "SYXTEE Encodeur", status: "online", signal: 4, lastSeen: "à l'instant", firmware: "0.1.0", ip: "192.168.1.42" };
    this.paired = [...this.load().filter((e) => e.id !== enc.id), enc];
    try {
      window.localStorage.setItem(PAIRED_KEY, JSON.stringify(this.paired));
    } catch {
      /* stockage indisponible */
    }
    return enc;
  }
  async rename(id: string, name: string) {
    this.paired = this.load().map((e) => (e.id === id ? { ...e, name } : e));
    try {
      window.localStorage.setItem(PAIRED_KEY, JSON.stringify(this.paired));
    } catch {
      /* stockage indisponible */
    }
  }
}

export const mockProvider = new MockEncoderProvider();
