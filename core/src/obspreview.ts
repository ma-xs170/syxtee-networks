import { randomBytes } from "node:crypto";
import type { Security } from "./security.ts";
import { kickPath } from "./mediamtx.ts";

// Aperçu vidéo du programme d'OBS, avec le son, SANS aucun transcodage sur le serveur.
//
//   plugin (OBS du PC) ── WHIP : H.264 ~540p + Opus, encodeur matériel ──► MediaMTX ── WHEP ──► navigateur
//
// MediaMTX ne fait que transmettre les paquets WebRTC. Le Core ne voit jamais la vidéo : il décide seulement qui a le droit de publier
// et de lire, par un chemin secret `obs_<hex>` propre à chaque session (128 bits, tiré au hasard à chaque démarrage, lié à un compte).
// - Le plugin n'envoie rien tant que personne ne regarde : l'agent demande une session à l'ouverture de la page, la rend à la fermeture.
// - Une session oubliée (agent mort, onglet fermé sans prévenir) expire seule.

export const newPreviewPath = () => `obs_${randomBytes(16).toString("hex")}`;
export const isPreviewPath = (s: string) => /^obs_[0-9a-f]{32}$/.test(s);

/** Durée de vie d'une session sans signe de vie (démarrage ou lecture). Le navigateur et l'agent la renouvellent. */
export const SESSION_TTL_MS = 3 * 60_000;

type Session = { userId: string; deviceId: string; createdAt: number; lastSeen: number };

export function createObsPreview(o: {
  /** Adresse publique du WHIP / WHEP (Caddy → MediaMTX). */
  whipBase: string;
  apiUrl: string;
  security?: Pick<Security, "isBanned"> | null;
  log: (m: string) => void;
  now?: () => number;
  fetchImpl?: typeof fetch;
}) {
  const now = o.now ?? Date.now;
  const fetchImpl = o.fetchImpl ?? fetch;
  const sessions = new Map<string, Session>(); // chemin → session
  const byUser = new Map<string, string>(); // compte → chemin

  function drop(path: string, why: string) {
    const s = sessions.get(path);
    if (!s) return;
    sessions.delete(path);
    if (byUser.get(s.userId) === path) byUser.delete(s.userId);
    void kickPath(o.apiUrl, path, fetchImpl);
    o.log(`aperçu ${s.userId.slice(0, 8)} : session fermée (${why})`);
  }

  return {
    /** Démarre (ou reprend) la session du compte : l'agent y publie en WHIP. Une nouvelle session = un nouveau chemin secret. */
    start(userId: string, deviceId: string): { path: string; whip_url: string } {
      const old = byUser.get(userId);
      if (old) drop(old, "remplacée");
      const path = newPreviewPath();
      sessions.set(path, { userId, deviceId, createdAt: now(), lastSeen: now() });
      byUser.set(userId, path);
      return { path, whip_url: `${o.whipBase}/${path}/whip` };
    },

    /** Fin de la session (plus personne ne regarde, ou l'utilisateur a coupé l'aperçu). */
    stop(userId: string) {
      const path = byUser.get(userId);
      if (path) drop(path, "arrêtée");
    },

    /** Le navigateur du compte veut lire : adresse WHEP si une session existe. `ready` : l'image arrive (vérifié auprès de MediaMTX). */
    async watch(userId: string): Promise<{ whep_url: string | null; ready: boolean }> {
      const path = byUser.get(userId);
      const s = path ? sessions.get(path) : undefined;
      if (!path || !s) return { whep_url: null, ready: false };
      s.lastSeen = now();
      let ready = false;
      try {
        const res = await fetchImpl(`${o.apiUrl}/v3/paths/get/${path}`, { signal: AbortSignal.timeout(2000) });
        ready = res.ok && ((await res.json()) as { ready?: boolean }).ready === true;
      } catch {
        // MediaMTX absent : pas prêt
      }
      return { whep_url: `${o.whipBase}/${path}/whep`, ready };
    },

    /** Signe de vie de l'agent (il publie encore). */
    touch(userId: string) {
      const path = byUser.get(userId);
      const s = path ? sessions.get(path) : undefined;
      if (s) s.lastSeen = now();
    },

    /** Autorisation demandée par MediaMTX à chaque connexion WebRTC (publication ou lecture). */
    authorize(p: { action?: string; path?: string; protocol?: string; ip?: string }): boolean {
      const s = sessions.get(p.path ?? "");
      if (!s || p.protocol !== "webrtc") return false;
      if (now() - s.lastSeen > SESSION_TTL_MS) return false;
      const ip = (p.ip ?? "").replace(/^::ffff:/, "");
      if (p.action === "publish") return !o.security?.isBanned(ip);
      if (p.action === "read") return true;
      return false;
    },

    /** Nettoyage : sessions expirées. À appeler régulièrement. */
    sweep() {
      for (const [path, s] of sessions) if (now() - s.lastSeen > SESSION_TTL_MS) drop(path, "expirée");
    },

    sessions: () => sessions.size,
  };
}

export type ObsPreview = ReturnType<typeof createObsPreview>;
