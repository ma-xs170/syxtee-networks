"use client";

import { useCallback, useEffect, useState } from "react";

// Installation sur l'écran d'accueil. Android et ordinateur (Chrome, Edge) : le navigateur donne un événement qui ouvre la fenêtre
// d'installation. iPhone et iPad : aucun événement, seulement Partager > « Sur l'écran d'accueil » dans Safari : on affiche les étapes.

type Prompt = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: "accepted" | "dismissed" }> };
export type Platform = "ios" | "android" | "other";

const DISMISS_KEY = "syxtee:install-dismissed";
const DISMISS_MS = 14 * 24 * 3600 * 1000;

function dismissedRecently() {
  try {
    return Date.now() - Number(localStorage.getItem(DISMISS_KEY) || 0) < DISMISS_MS;
  } catch {
    return false;
  }
}

export function useInstall() {
  const [ready, setReady] = useState(false);
  const [standalone, setStandalone] = useState(false);
  const [platform, setPlatform] = useState<Platform>("other");
  const [touch, setTouch] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [prompt, setPrompt] = useState<Prompt | null>(null);

  useEffect(() => {
    const t = setTimeout(() => {
      const ua = navigator.userAgent;
      const ios = /iPhone|iPad|iPod/.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
      setPlatform(ios ? "ios" : /Android/.test(ua) ? "android" : "other");
      setTouch(window.matchMedia("(pointer: coarse)").matches);
      setStandalone(window.matchMedia("(display-mode: standalone)").matches || (navigator as Navigator & { standalone?: boolean }).standalone === true);
      setDismissed(dismissedRecently());
      setReady(true);
    }, 0);
    const onPrompt = (e: Event) => {
      e.preventDefault();
      setPrompt(e as Prompt);
    };
    const onInstalled = () => {
      setStandalone(true);
      setPrompt(null);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      clearTimeout(t);
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  const install = useCallback(async () => {
    if (!prompt) return;
    await prompt.prompt();
    const r = await prompt.userChoice;
    if (r.outcome === "accepted") setStandalone(true);
    setPrompt(null);
  }, [prompt]);

  const dismiss = useCallback(() => {
    try {
      localStorage.setItem(DISMISS_KEY, String(Date.now()));
    } catch {
      // stockage bloqué : le bandeau reviendra à la prochaine visite
    }
    setDismissed(true);
  }, []);

  return { ready, standalone, platform, touch, dismissed, canPrompt: prompt !== null, install, dismiss };
}
