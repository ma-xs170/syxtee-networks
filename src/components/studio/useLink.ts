"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { coreToken } from "../dashboard/coreClient";

// Connexion du navigateur à l'OBS de l'utilisateur, via le Core : le navigateur envoie des ordres, SYXTEE Link (dans OBS) les exécute
// sur le PC et répond. La vidéo ne passe jamais par le serveur : OBS diffuse depuis le PC, ce navigateur ne fait que commander.

export type Agent = { online: boolean; name?: string; platform?: string; version?: string };
export type LinkState = "connecting" | "on" | "off" | "denied";
export type LinkEvent = (name: string, data: Record<string, unknown>) => void;

const ERR: Record<string, string> = {
  agent_offline: "OBS n'est pas connecté à SYXTEE Link.",
  timeout: "OBS met trop de temps à répondre.",
  rate_limited: "Trop de commandes d'un coup.",
  method_not_allowed: "Commande refusée.",
};
export const errText = (m: string) => ERR[m] ?? m;

export function useLink(coreUrl: string, onEvent: LinkEvent) {
  const [link, setLink] = useState<LinkState>("connecting");
  const [agent, setAgent] = useState<Agent>({ online: false });
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
        access = await coreToken();
      } catch {
        setLink("off");
        timer = setTimeout(open, 5000);
        return;
      }
      const s = new WebSocket(`${coreUrl.replace(/^http/, "ws")}/v1/link/remote`);
      ws.current = s;
      s.onopen = () => s.send(JSON.stringify({ type: "hello", access }));
      s.onmessage = (ev) => {
        const m = JSON.parse(String(ev.data));
        if (m.type === "ready") {
          setLink("on");
          setAgent(m.agent ?? { online: false });
        } else if (m.type === "agent") setAgent({ online: !!m.online, name: m.name, platform: m.platform, version: m.version });
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
        for (const w of waiting.current.values()) w.ko(new Error("Connexion perdue."));
        waiting.current.clear();
        // 4003 : compte sans accès (invitation). Les autres cas (réseau, session) : on réessaie.
        if (e.code === 4003) setLink("denied");
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
  }, [coreUrl]);

  const call = useCallback(<T = Record<string, unknown>>(method: string, params?: Record<string, unknown>) => {
    return new Promise<T>((ok, ko) => {
      const s = ws.current;
      if (!s || s.readyState !== WebSocket.OPEN) return ko(new Error("Pas connecté au serveur."));
      const id = `q${++seq.current}`;
      waiting.current.set(id, { ok: ok as (v: unknown) => void, ko });
      s.send(JSON.stringify({ type: "req", id, method, params }));
    });
  }, []);

  return { link, agent, call };
}
