"use client";

import { createClient } from "@/lib/supabase/client";

// Appels du navigateur vers le SYXTEE Core, avec le jeton de session Supabase (renouvelé par supabase-js).

let supabase: ReturnType<typeof createClient> | null = null;

/** Jeton de session Supabase courant (pour les lecteurs qui ouvrent eux-mêmes la connexion, ex. mpegts.js). */
export async function coreToken() {
  supabase ??= createClient();
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error("Session expirée");
  return token;
}

export async function coreFetch(coreUrl: string, path: string, init: RequestInit = {}) {
  const token = await coreToken();
  return fetch(`${coreUrl}${path}`, { ...init, headers: { ...(init.headers ?? {}), Authorization: `Bearer ${token}` }, cache: "no-store" });
}

export const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Lit un flux Server-Sent Events (réponse fetch) jusqu'à sa fermeture ; `onData` reçoit chaque `data:` décodé. */
export async function readSse<T>(res: Response, onData: (data: T) => void) {
  if (!res.body) throw new Error("flux vide");
  const reader = res.body.getReader();
  const dec = new TextDecoder();
  let buf = "";
  for (;;) {
    const { value, done } = await reader.read();
    if (done) return;
    buf += dec.decode(value, { stream: true });
    let i;
    while ((i = buf.indexOf("\n\n")) >= 0) {
      const block = buf.slice(0, i);
      buf = buf.slice(i + 2);
      const data = block.split("\n").find((l) => l.startsWith("data: "));
      if (data) onData(JSON.parse(data.slice(6)) as T);
    }
  }
}
