"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { activeWorkspace, coreToken } from "../dashboard/coreClient";

// Connexion du navigateur à l'OBS d'un poste, via le Core : le navigateur envoie des ordres, le plugin SYXTEE (dans OBS) les exécute
// sur le PC et répond. La vidéo du direct ne passe jamais par le serveur : OBS diffuse depuis le PC, ce navigateur ne fait que commander.

export type Agent = { online: boolean; id?: string; name?: string; platform?: string; version?: string; since?: number };
export type LinkState = "connecting" | "on" | "off" | "denied";
export type LinkEvent = (name: string, data: Record<string, unknown>) => void;

const ERR: Record<string, string> = {
  agent_offline: "OBS n'est pas connecté à SYXTEE.",
  timeout: "OBS met trop de temps à répondre.",
  rate_limited: "Trop de commandes d'un coup.",
  method_not_allowed: "Commande refusée.",
  forbidden: "Ton invitation ne permet pas cette action.",
};
export const errText = (m: string) => ERR[m] ?? m;

/** `device` : poste piloté (sinon le dernier connecté du compte). */
export type Guest = { level: "view" | "scenes" | "full"; label: string };

/** `invite` : secret d'un lien d'invitation (invité sans compte) ; sinon la session du compte. */
export function useRemote(coreUrl: string, onEvent: LinkEvent, device?: string, demoToken?: string, invite?: string) {
  const [guest, setGuest] = useState<Guest | null>(null);
  const [link, setLink] = useState<LinkState>("connecting");
  const [agent, setAgent] = useState<Agent>({ online: false });
  const [latency, setLatency] = useState<number | null>(null);
  const ws = useRef<WebSocket | null>(null);
  const waiting = useRef(new Map<string, { ok: (v: unknown) => void; ko: (e: Error) => void }>());
  const seq = useRef(0);
  const handler = useRef(onEvent);
  useEffect(() => {
    handler.current = onEvent;
  }, [onEvent]);

  useEffect(() => {
    let closed = false;
    let timer: ReturnType<typeof setTimeout>;
    async function open() {
      if (closed) return;
      setLink("connecting");
      let access: string;
      try {
        access = invite ? "" : (demoToken ?? (await coreToken()));
      } catch {
        setLink("off");
        timer = setTimeout(open, 5000);
        return;
      }
      const s = new WebSocket(`${coreUrl.replace(/^http/, "ws")}/v1/link/remote`);
      ws.current = s;
      s.onopen = () => s.send(JSON.stringify(invite ? { type: "hello", invite, device } : { type: "hello", access, device, workspace: activeWorkspace() }));
      s.onmessage = (ev) => {
        const m = JSON.parse(String(ev.data));
        if (m.type === "ready") {
          setLink("on");
          setAgent(m.agent ?? { online: false });
          setGuest(m.guest ?? null);
        } else if (m.type === "agent") setAgent({ online: !!m.online, id: m.id, name: m.name, platform: m.platform, version: m.version, since: m.since });
        else if (m.type === "event") handler.current(m.name, m.data ?? {});
        else if (m.type === "res") {
          const w = waiting.current.get(m.id);
          if (!w) return;
          waiting.current.delete(m.id);
          if (m.ok) w.ok(m.result);
          else w.ko(new Error(errText(String(m.error ?? "erreur"))));
        }
      };
      s.onclose = (e) => {
        setAgent({ online: false });
        setLatency(null);
        for (const w of waiting.current.values()) w.ko(new Error("Connexion perdue."));
        waiting.current.clear();
        // 4003 : compte sans accès (invitation). Les autres cas (réseau, session) : on réessaie.
        if (e.code === 4003 || e.code === 4005) setLink("denied");
        else {
          setLink("off");
          if (!closed) timer = setTimeout(open, 3000);
        }
      };
    }
    void open();
    return () => {
      closed = true;
      clearTimeout(timer);
      ws.current?.close();
    };
  }, [coreUrl, device, demoToken, invite]);

  const call = useCallback(<T = Record<string, unknown>>(method: string, params?: Record<string, unknown>) => {
    return new Promise<T>((ok, ko) => {
      const s = ws.current;
      if (!s || s.readyState !== WebSocket.OPEN) return ko(new Error("Pas connecté au serveur."));
      const id = `q${++seq.current}`;
      waiting.current.set(id, { ok: ok as (v: unknown) => void, ko });
      s.send(JSON.stringify({ type: "req", id, method, params }));
    });
  }, []);

  // Latence affichée : aller-retour navigateur, Core, plugin, toutes les 5 s.
  useEffect(() => {
    if (link !== "on" || !agent.online) return;
    let live = true;
    const ping = async () => {
      const t0 = performance.now();
      try {
        await call("link.getInfo");
        if (live) setLatency(Math.round(performance.now() - t0));
      } catch {
        if (live) setLatency(null);
      }
    };
    const first = setTimeout(() => void ping(), 500);
    const id = setInterval(() => void ping(), 5000);
    return () => {
      live = false;
      clearTimeout(first);
      clearInterval(id);
    };
  }, [link, agent.online, call]);

  return { link, agent, call, latency, guest };
}
