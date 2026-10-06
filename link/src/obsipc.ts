import { createConnection, type Socket } from "node:net";
import { ObsError, type ObsEvent } from "./obs.ts";

// Pilotage d'OBS par le plugin lui-même : socket local (lignes JSON) servi par le plugin (voir plugin/qt/obsctl.cpp).
// Mêmes noms de demandes et mêmes formes de réponse que obs-websocket, donc le reste de l'agent est inchangé.
// L'utilisateur n'a rien à activer dans OBS : pas de serveur WebSocket, pas de port, pas de mot de passe.

/** Chemin du socket (Unix) ou nom du tube (Windows) donné par le plugin dans SYXTEE_LINK_OBS_IPC. */
export const ipcPath = () => process.env.SYXTEE_LINK_OBS_IPC || "";

type Pending = { resolve: (v: Record<string, unknown>) => void; reject: (e: Error) => void; timer: ReturnType<typeof setTimeout> };

export class ObsIpc {
  private sock: Socket | null = null;
  private pending = new Map<number, Pending>();
  private seq = 0;
  private buf = "";
  onEvent: ObsEvent = () => {};
  onClose: () => void = () => {};
  connected = false;
  private path: string;

  constructor(path: string) {
    this.path = path;
  }

  connect(): Promise<{ wsVersion: string }> {
    return new Promise((resolve, reject) => {
      const target = process.platform === "win32" && !this.path.startsWith("\\\\") ? `\\\\.\\pipe\\${this.path}` : this.path;
      const sock = createConnection(target);
      this.sock = sock;
      let hello = false;
      sock.setEncoding("utf8");
      sock.on("error", () => {
        if (!hello) reject(new ObsError("OBS n'est pas prêt. Ouvre OBS avec le plugin SYXTEE installé."));
      });
      sock.on("close", () => {
        this.sock = null;
        this.connected = false;
        for (const p of this.pending.values()) {
          clearTimeout(p.timer);
          p.reject(new ObsError("Connexion à OBS fermée."));
        }
        this.pending.clear();
        if (!hello) reject(new ObsError("OBS n'est pas prêt."));
        else this.onClose();
      });
      sock.on("data", (chunk: string) => {
        this.buf += chunk;
        let nl: number;
        while ((nl = this.buf.indexOf("\n")) >= 0) {
          const line = this.buf.slice(0, nl);
          this.buf = this.buf.slice(nl + 1);
          let m: { id?: number; ok?: boolean; data?: Record<string, unknown>; error?: string; event?: string };
          try {
            m = JSON.parse(line);
          } catch {
            continue;
          }
          if (m.event === "hello" && !hello) {
            hello = true;
            this.connected = true;
            resolve({ wsVersion: String(m.data?.obsVersion ?? "") });
          } else if (m.event) {
            this.onEvent(m.event, m.data ?? {});
          } else if (typeof m.id === "number") {
            const p = this.pending.get(m.id);
            if (!p) continue;
            this.pending.delete(m.id);
            clearTimeout(p.timer);
            if (m.ok) p.resolve(m.data ?? {});
            else p.reject(new ObsError(m.error ?? "Erreur OBS."));
          }
        }
      });
    });
  }

  request<T = Record<string, unknown>>(type: string, data?: Record<string, unknown>): Promise<T> {
    return new Promise((resolve, reject) => {
      if (!this.sock || !this.connected) return reject(new ObsError("OBS n'est pas connecté."));
      const id = ++this.seq;
      const timer = setTimeout(() => {
        this.pending.delete(id);
        reject(new ObsError("OBS ne répond pas."));
      }, 8000);
      this.pending.set(id, { resolve: resolve as (v: Record<string, unknown>) => void, reject, timer });
      this.sock.write(JSON.stringify({ id, type, data: data ?? {} }) + "\n");
    });
  }

  close() {
    this.sock?.destroy();
  }
}
