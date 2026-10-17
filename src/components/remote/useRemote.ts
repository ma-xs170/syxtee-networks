"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { activeWorkspace, coreToken } from "../dashboard/coreClient";

// Connexion du navigateur à l'OBS d'un poste, via le Core : le navigateur envoie des ordres, le plugin SYXTEE (dans OBS) les exécute
// sur le PC et répond. La vidéo du direct ne passe jamais par le serveur : OBS diffuse depuis le PC, ce navigateur ne fait que commander.
//
// Fiabilité (téléphone en 4G compris) :
// - chaque ordre a un délai maximum : jamais d'attente sans fin, et la demande en attente est retirée ;
// - une liaison « à moitié morte » (le réseau a changé, le serveur ne répond plus) est détectée par le battement (ping) et refermée ;
// - reconnexion avec attente croissante, et tout de suite au retour du réseau ou de l'onglet.

export type Agent = { online: boolean; id?: string; name?: string; platform?: string; version?: string; since?: number };
/** Gardien SYXTEE du poste (processus séparé d'OBS). `status` : état envoyé par lui (OBS ouvert, surveillance, reprise, Mac éveillé…). */
export type Guardian = { online: boolean; id?: string; version?: string; since?: number; status?: Record<string, string | number | boolean> };
export type LinkState = "connecting" | "on" | "off" | "denied";
export type LinkEvent = (name: string, data: Record<string, unknown>) => void;
export type Call = <T = Record<string, unknown>>(method: string, params?: Record<string, unknown>) => Promise<T>;

const ERR: Record<string, string> = {
  agent_offline: "OBS n'est pas connecté à SYXTEE.",
  guardian_offline: "Le Gardien SYXTEE n'est pas en ligne sur ce Mac.",
  timeout: "OBS met trop de temps à répondre.",
  rate_limited: "Trop de commandes d'un coup.",
  method_not_allowed: "Commande refusée.",
  forbidden: "Ton invitation ne permet pas cette action.",
};
export const errText = (m: string) => ERR[m] ?? m;

/** Aucune réponse du serveur dans le délai : la liaison est suspecte (à distinguer d'une erreur renvoyée par OBS). */
export class NoAnswer extends Error {
  constructor() {
    super("Le serveur ne répond pas.");
  }
}

const CALL_MS = 15_000;
const SLOW_CALL_MS = 60_000;
const OPEN_MS = 10_000;
const slow = (method: string) => method.startsWith("guardian.") || method === "link.fixFlux" || method.startsWith("link.settings") || method.startsWith("link.multistream");

/** `device` : poste piloté (sinon le dernier connecté du compte). */
export type Guest = { level: "view" | "scenes" | "full"; label: string };

/** `invite` : secret d'un lien d'invitation (invité sans compte) ; sinon la session du compte. */
export function useRemote(coreUrl: string, onEvent: LinkEvent, device?: string, demoToken?: string, invite?: string) {
  const [guest, setGuest] = useState<Guest | null>(null);
  const [link, setLink] = useState<LinkState>("connecting");
  const [agent, setAgent] = useState<Agent>({ online: false });
  const [guardian, setGuardian] = useState<Guardian>({ online: false });
  const [latency, setLatency] = useState<number | null>(null);
  const ws = useRef<WebSocket | null>(null);
  const waiting = useRef(new Map<string, { ok: (v: unknown) => void; ko: (e: Error) => void; timer: ReturnType<typeof setTimeout> }>());
  const seq = useRef(0);
  const handler = useRef(onEvent);
  /** Relance immédiate de la connexion (retour du réseau, de l'onglet, bouton). Définie par l'effet de connexion. */
  const kick = useRef<() => void>(() => {});
  useEffect(() => {
    handler.current = onEvent;
  }, [onEvent]);

  useEffect(() => {
    let closed = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let openTimer: ReturnType<typeof setTimeout> | undefined;
    let tries = 0;

    const failAll = (reason: string) => {
      for (const w of waiting.current.values()) {
        clearTimeout(w.timer);
        w.ko(new Error(reason));
      }
      waiting.current.clear();
    };
    const later = () => {
      if (closed) return;
      // 1 s, 2 s, 4 s, 8 s, puis 15 s au plus, avec un peu de hasard pour ne pas tout rouvrir au même instant.
      const wait = Math.min(15_000, 1000 * 2 ** Math.min(tries, 4)) + Math.random() * 400;
      tries++;
      clearTimeout(timer);
      timer = setTimeout(() => void open(), wait);
    };

    async function open() {
      if (closed) return;
      clearTimeout(timer);
      if (ws.current && ws.current.readyState <= WebSocket.OPEN) return;
      setLink("connecting");
      let access: string;
      try {
        access = invite ? "" : (demoToken ?? (await coreToken()));
      } catch {
        if (closed) return;
        setLink("off");
        later();
        return;
      }
      if (closed) return;
      const s = new WebSocket(`${coreUrl.replace(/^http/, "ws")}/v1/link/remote`);
      ws.current = s;
      // Une ouverture qui traîne (réseau mobile en transition) est abandonnée puis retentée.
      openTimer = setTimeout(() => s.readyState === WebSocket.CONNECTING && s.close(), OPEN_MS);
      s.onopen = () => {
        clearTimeout(openTimer);
        s.send(JSON.stringify(invite ? { type: "hello", invite, device } : { type: "hello", access, device, workspace: activeWorkspace() }));
      };
      s.onmessage = (ev) => {
        if (ws.current !== s) return;
        let m: Record<string, unknown>;
        try {
          m = JSON.parse(String(ev.data));
        } catch {
          return;
        }
        if (m.type === "ready") {
          tries = 0;
          setLink("on");
          setAgent((m.agent as Agent) ?? { online: false });
          setGuardian((m.guardian as Guardian) ?? { online: false });
          setGuest((m.guest as Guest) ?? null);
        } else if (m.type === "agent") setAgent({ online: !!m.online, id: m.id as string, name: m.name as string, platform: m.platform as string, version: m.version as string, since: m.since as number });
        else if (m.type === "guardian") setGuardian({ online: !!m.online, id: m.id as string, version: m.version as string, since: m.since as number, status: m.status as Guardian["status"] });
        else if (m.type === "event") handler.current(String(m.name), (m.data as Record<string, unknown>) ?? {});
        else if (m.type === "res") {
          const w = waiting.current.get(String(m.id));
          if (!w) return;
          waiting.current.delete(String(m.id));
          clearTimeout(w.timer);
          if (m.ok) w.ok(m.result);
          else w.ko(new Error(errText(String(m.error ?? "erreur"))));
        }
      };
      s.onclose = (e) => {
        clearTimeout(openTimer);
        // Une ancienne liaison qui se ferme après qu'une nouvelle a pris sa place ne doit rien changer.
        if (ws.current !== s) return;
        ws.current = null;
        setAgent({ online: false });
        setGuardian({ online: false });
        setLatency(null);
        failAll("Connexion perdue.");
        if (closed) return;
        // 4003 : compte sans accès (invitation). 4005 : lien retiré. Les autres cas (réseau, session) : on réessaie.
        if (e.code === 4003 || e.code === 4005) setLink("denied");
        else {
          setLink("off");
          later();
        }
      };
      s.onerror = () => {};
    }

    kick.current = () => {
      if (closed) return;
      const s = ws.current;
      if (s && s.readyState <= WebSocket.OPEN) return;
      tries = 0;
      void open();
    };
    const onNet = () => kick.current();
    const onVisible = () => document.visibilityState === "visible" && kick.current();
    window.addEventListener("online", onNet);
    document.addEventListener("visibilitychange", onVisible);
    void open();
    return () => {
      closed = true;
      clearTimeout(timer);
      clearTimeout(openTimer);
      window.removeEventListener("online", onNet);
      document.removeEventListener("visibilitychange", onVisible);
      const s = ws.current;
      ws.current = null;
      s?.close();
      failAll("Connexion fermée.");
    };
  }, [coreUrl, device, demoToken, invite]);

  const call = useCallback<Call>((method, params) => {
    return new Promise((ok, ko) => {
      const s = ws.current;
      if (!s || s.readyState !== WebSocket.OPEN) return ko(new Error("Pas connecté au serveur."));
      const id = `q${++seq.current}`;
      const timer = setTimeout(() => {
        waiting.current.delete(id);
        ko(new NoAnswer());
      }, slow(method) ? SLOW_CALL_MS : CALL_MS);
      waiting.current.set(id, { ok: ok as (v: unknown) => void, ko, timer });
      try {
        s.send(JSON.stringify({ type: "req", id, method, params }));
      } catch (e) {
        clearTimeout(timer);
        waiting.current.delete(id);
        ko(e as Error);
      }
    });
  }, []);

  // Battement et latence affichée : aller-retour navigateur, Core, plugin, toutes les 5 s.
  // Deux silences d'affilée du serveur : la liaison est morte sans l'avoir dit, on la referme pour que la reconnexion reparte.
  useEffect(() => {
    if (link !== "on") return;
    let live = true;
    let misses = 0;
    const ping = async () => {
      const t0 = performance.now();
      try {
        await call("link.getInfo");
        misses = 0;
        if (live) setLatency(Math.round(performance.now() - t0));
      } catch (e) {
        if (!live) return;
        setLatency(null);
        if (e instanceof NoAnswer && ++misses >= 2) ws.current?.close();
      }
    };
    const first = setTimeout(() => void ping(), 500);
    const id = setInterval(() => void ping(), 5000);
    return () => {
      live = false;
      clearTimeout(first);
      clearInterval(id);
    };
  }, [link, call]);

  const reconnect = useCallback(() => kick.current(), []);
  return { link, agent, guardian, call, latency, guest, reconnect };
}
