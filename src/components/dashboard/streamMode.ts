"use client";

import { useSyncExternalStore } from "react";

// Mode stream : floute tout ce qui est sensible (clés, URLs, e-mail) pour montrer le dashboard en live.
// État sur <html data-stream-mode>, gardé dans le navigateur. CSS : globals.css ([data-sensitive]).

const KEY = "syxtee:stream-mode";
const listeners = new Set<() => void>();

function read() {
  return typeof document !== "undefined" && document.documentElement.dataset.streamMode === "on";
}

export function setStreamMode(on: boolean) {
  document.documentElement.dataset.streamMode = on ? "on" : "off";
  try {
    localStorage.setItem(KEY, on ? "on" : "off");
  } catch {
    // Stockage indisponible (navigation privée) : l'état reste valable pour la page.
  }
  listeners.forEach((l) => l());
}

/** Au chargement du dashboard : reprend le dernier état choisi. */
export function restoreStreamMode() {
  try {
    if (localStorage.getItem(KEY) === "on" && !read()) setStreamMode(true);
  } catch {
    // idem
  }
}

export function useStreamMode() {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    read,
    () => false,
  );
}
