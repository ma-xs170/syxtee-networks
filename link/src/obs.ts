// Client obs-websocket v5 (intégré à OBS 28+), sans dépendance : WebSocket global de Node, crypto.subtle pour l'authentification.
// Protocole : https://github.com/obsproject/obs-websocket/blob/master/docs/generated/protocol.md

const OP = { Hello: 0, Identify: 1, Identified: 2, Event: 5, Request: 6, RequestResponse: 7 } as const;

/** General, Config, Scenes, Inputs, Transitions, Filters, Outputs, SceneItems, MediaInputs + niveaux audio (InputVolumeMeters). */
const SUBSCRIPTIONS = 1 | 2 | 4 | 8 | 16 | 32 | 64 | 128 | 256 | (1 << 16);

export class ObsError extends Error {
  code?: number;
  constructor(message: string, code?: number) {
    super(message);
    this.code = code;
  }
}

const b64 = (buf: ArrayBuffer) => Buffer.from(buf).toString("base64");
const sha256 = (s: string) => crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));

/** Chaîne d'authentification obs-websocket : base64(sha256(base64(sha256(mot de passe + sel)) + défi)). */
export async function authString(password: string, salt: string, challenge: string) {
  return b64(await sha256(b64(await sha256(password + salt)) + challenge));
}

type Pending = { resolve: (v: Record<string, unknown>) => void; reject: (e: Error) => void; timer: ReturnType<typeof setTimeout> };
export type ObsEvent = (type: string, data: Record<string, unknown>) => void;

export class ObsClient {
  private ws: WebSocket | null = null;
  private pending = new Map<string, Pending>();
  private seq = 0;
  onEvent: ObsEvent = () => {};
  onClose: () => void = () => {};
  connected = false;

  connect(host: string, port: number, password: string): Promise<{ wsVersion: string }> {
    return new Promise((resolve, reject) => {
      let ws: WebSocket;
      try {
        ws = new WebSocket(`ws://${host}:${port}`, "obswebsocket.json");
      } catch {
        return reject(new ObsError("Adresse OBS invalide."));
      }
      this.ws = ws;
      let identified = false;
      let wsVersion = "";
      ws.onerror = () => {
        if (!identified) reject(new ObsError("OBS injoignable. OBS est-il ouvert, avec le serveur WebSocket activé (Outils, Paramètres du serveur WebSocket) ?"));
      };
      ws.onclose = (e) => {
        this.ws = null;
        this.connected = false;
        for (const p of this.pending.values()) {
          clearTimeout(p.timer);
          p.reject(new ObsError("Connexion à OBS fermée."));
        }
        this.pending.clear();
        if (!identified) reject(new ObsError(e.code === 4009 ? "Mot de passe OBS refusé." : "Connexion à OBS refusée."));
        else this.onClose();
      };
      ws.onmessage = async (ev) => {
        const msg = JSON.parse(String(ev.data)) as { op: number; d: Record<string, any> };
        if (msg.op === OP.Hello) {
          wsVersion = String(msg.d.obsWebSocketVersion ?? "");
          const d: Record<string, unknown> = { rpcVersion: 1, eventSubscriptions: SUBSCRIPTIONS };
          const a = msg.d.authentication as { challenge: string; salt: string } | undefined;
          if (a) d.authentication = await authString(password, a.salt, a.challenge);
          ws.send(JSON.stringify({ op: OP.Identify, d }));
        } else if (msg.op === OP.Identified) {
          identified = true;
          this.connected = true;
          resolve({ wsVersion });
        } else if (msg.op === OP.Event) {
          this.onEvent(String(msg.d.eventType), (msg.d.eventData as Record<string, unknown>) ?? {});
        } else if (msg.op === OP.RequestResponse) {
          const p = this.pending.get(String(msg.d.requestId));
          if (!p) return;
          this.pending.delete(String(msg.d.requestId));
          clearTimeout(p.timer);
          const st = msg.d.requestStatus as { result: boolean; code: number; comment?: string };
          if (st.result) p.resolve((msg.d.responseData as Record<string, unknown>) ?? {});
          else p.reject(new ObsError(st.comment ?? `Erreur OBS ${st.code}`, st.code));
        }
      };
    });
  }

  request<T = Record<string, unknown>>(requestType: string, requestData?: Record<string, unknown>): Promise<T> {
    return new Promise((resolve, reject) => {
      if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return reject(new ObsError("OBS n'est pas connecté."));
      const requestId = `r${++this.seq}`;
      const timer = setTimeout(() => {
        this.pending.delete(requestId);
        reject(new ObsError("OBS ne répond pas."));
      }, 8000);
      this.pending.set(requestId, { resolve: resolve as (v: Record<string, unknown>) => void, reject, timer });
      this.ws.send(JSON.stringify({ op: OP.Request, d: { requestType, requestId, requestData } }));
    });
  }

  close() {
    this.ws?.close();
  }
}
