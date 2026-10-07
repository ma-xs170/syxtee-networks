"use client";

import { useEffect } from "react";

// Enregistre le service worker de l'app (/sw.js) : c'est lui qui rend SYXTEE installable sur l'écran d'accueil.
// Production seulement : en développement il gênerait le rechargement à chaud.
export default function PwaRegister() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch(() => {});
  }, []);
  return null;
}
