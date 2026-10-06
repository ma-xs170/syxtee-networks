"use client";

import { useEffect } from "react";

// Présence : un battement à l'ouverture puis chaque minute tant que l'onglet est visible (pas de connexion ouverte).
export default function Heartbeat() {
  useEffect(() => {
    const beat = () => {
      if (document.visibilityState === "visible") void fetch("/api/presence", { method: "POST", keepalive: true }).catch(() => {});
    };
    beat();
    const t = setInterval(beat, 60_000);
    document.addEventListener("visibilitychange", beat);
    return () => {
      clearInterval(t);
      document.removeEventListener("visibilitychange", beat);
    };
  }, []);
  return null;
}
