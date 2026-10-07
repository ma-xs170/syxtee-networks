"use client";

import { coreToken } from "../dashboard/coreClient";

// Commande ponctuelle envoyée à un poste OBS (par le Core) : ouvre la liaison, envoie l'ordre, suit la progression du travail
// (`link.job`) jusqu'à sa fin, puis referme. Sert à « Importer sur mon OBS » depuis le site.

export type JobState = { kind: string; state: "running" | "done" | "error"; progress: number; message: string };

export function callDevice(coreUrl: string, deviceId: string, method: string, params: Record<string, unknown>, onJob: (j: JobState) => void, maxMs = 15 * 60_000): Promise<JobState> {
  return new Promise((resolve, reject) => {
    let ws: WebSocket | null = null;
    let finished = false;
    const end = (fn: () => void) => {
      if (finished) return;
      finished = true;
      clearTimeout(timer);
      ws?.close();
      fn();
    };
    const timer = setTimeout(() => end(() => reject(new Error("Le poste met trop de temps à répondre."))), maxMs);
    coreToken()
      .then((access) => {
        ws = new WebSocket(`${coreUrl.replace(/^http/, "ws")}/v1/link/remote`);
        ws.onopen = () => ws!.send(JSON.stringify({ type: "hello", access, device: deviceId }));
        ws.onmessage = (ev) => {
          const m = JSON.parse(String(ev.data));
          if (m.type === "ready") {
            if (!m.agent?.online || m.agent.id !== deviceId) return end(() => reject(new Error("Ce poste n'est pas en ligne. Ouvre OBS sur l'ordinateur.")));
            ws!.send(JSON.stringify({ type: "req", id: "q1", method, params }));
          } else if (m.type === "res" && m.id === "q1" && !m.ok) {
            end(() => reject(new Error(String(m.error ?? "Commande refusée."))));
          } else if (m.type === "agent" && !m.online) {
            end(() => reject(new Error("Le poste s'est déconnecté.")));
          } else if (m.type === "event" && m.name === "link.job") {
            const j = m.data as JobState;
            onJob(j);
            if (j.state !== "running") end(() => (j.state === "done" ? resolve(j) : reject(new Error(j.message))));
          }
        };
        ws.onclose = (e) => end(() => reject(new Error(e.code === 4003 ? "Accès réservé aux comptes invités." : "Connexion perdue.")));
        ws.onerror = () => {};
      })
      .catch(() => end(() => reject(new Error("Session expirée : recharge la page."))));
  });
}
