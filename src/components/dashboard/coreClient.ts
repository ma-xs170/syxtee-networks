"use client";

import { createClient } from "@/lib/supabase/client";

// Appels du navigateur vers le SYXTEE Core, avec le jeton de session Supabase (renouvelé par supabase-js).

let supabase: ReturnType<typeof createClient> | null = null;

export async function coreFetch(coreUrl: string, path: string, init: RequestInit = {}) {
  supabase ??= createClient();
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error("Session expirée");
  return fetch(`${coreUrl}${path}`, { ...init, headers: { ...(init.headers ?? {}), Authorization: `Bearer ${token}` }, cache: "no-store" });
}

export const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
