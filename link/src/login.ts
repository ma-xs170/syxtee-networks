import { hostname } from "node:os";
import { openUrl } from "./system.ts";

// Connexion de ce PC au compte SYXTEE, sans taper de code : le plugin ouvre le site avec un code, l'utilisateur confirme
// (connecté à son compte), le plugin récupère son jeton d'appareil.

export type LoginState =
  | { state: "idle" }
  | { state: "waiting"; userCode: string; url: string; expires: number }
  | { state: "error"; message: string };

export class Login {
  state: LoginState = { state: "idle" };
  private timer: ReturnType<typeof setTimeout> | null = null;
  private run = 0;
  private core: string;
  private site: string;
  private onToken: (token: string) => void;

  constructor(core: string, site: string, onToken: (token: string) => void) {
    this.core = core;
    this.site = site;
    this.onToken = onToken;
  }

  async start(): Promise<void> {
    this.cancel();
    const run = ++this.run;
    const res = await fetch(`${this.core}/v1/link/device/start`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: hostname().slice(0, 40) || "OBS", platform: process.platform }),
      signal: AbortSignal.timeout(10_000),
    }).catch(() => null);
    if (run !== this.run) return;
    const j = res ? ((await res.json().catch(() => ({}))) as { device_code?: string; user_code?: string; expires_in?: number; interval?: number }) : null;
    if (!res?.ok || !j?.device_code || !j.user_code) {
      this.state = { state: "error", message: !res ? "Serveur injoignable. Vérifie ta connexion." : res.status === 429 ? "Trop d'essais. Réessaie dans une minute." : "Connexion impossible pour le moment." };
      return;
    }
    const url = `${this.site}/link?code=${encodeURIComponent(j.user_code)}`;
    this.state = { state: "waiting", userCode: j.user_code, url, expires: Date.now() + (j.expires_in ?? 600) * 1000 };
    openUrl(url);
    const poll = async () => {
      if (run !== this.run) return;
      if (Date.now() > (this.state as { expires: number }).expires) {
        this.state = { state: "error", message: "Le code a expiré. Relance la connexion." };
        return;
      }
      const r = await fetch(`${this.core}/v1/link/device/poll`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ device_code: j.device_code }),
        signal: AbortSignal.timeout(10_000),
      }).catch(() => null);
      const p = r ? ((await r.json().catch(() => ({}))) as { status?: string; token?: string }) : null;
      if (run !== this.run) return;
      if (p?.status === "approved" && p.token) {
        this.state = { state: "idle" };
        this.onToken(p.token);
        return;
      }
      if (p?.status === "expired" || p?.status === "error") {
        this.state = { state: "error", message: p.status === "error" ? "Connexion impossible pour le moment." : "Le code a expiré. Relance la connexion." };
        return;
      }
      this.timer = setTimeout(poll, (j.interval ?? 2) * 1000);
    };
    this.timer = setTimeout(poll, (j.interval ?? 2) * 1000);
  }

  /** Rouvre la page de confirmation dans le navigateur. */
  reopen() {
    if (this.state.state === "waiting") openUrl(this.state.url);
  }

  cancel() {
    this.run++;
    if (this.timer) clearTimeout(this.timer);
    this.timer = null;
    this.state = { state: "idle" };
  }
}
