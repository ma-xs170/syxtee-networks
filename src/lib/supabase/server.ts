import "server-only";
import { createServerClient } from "@supabase/ssr";
import { createClient as createJsClient } from "@supabase/supabase-js";
import { cookies, headers } from "next/headers";
import { cookieDomain, supabaseKey, supabaseUrl } from "./env";
import { timedFetch } from "./fetch";

/** Jeton de session Supabase envoyé par une app native (Authorization: Bearer …), sinon null (navigateur : cookies). */
export async function bearerToken(): Promise<string | null> {
  const h = await headers();
  const m = /^Bearer\s+([\w-]+\.[\w-]+\.[\w-]+)$/i.exec(h.get("authorization") ?? "");
  return m ? m[1] : null;
}

/** Client serveur lié à la session du visiteur (Server Components, Server Actions, Route Handlers). */
export async function createClient() {
  // App iOS SYXTEE : la session voyage dans l'en-tête Authorization ; les règles RLS s'appliquent avec ce jeton.
  const token = await bearerToken();
  if (token) {
    return createJsClient(supabaseUrl, supabaseKey, {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
      global: { headers: { Authorization: `Bearer ${token}` }, fetch: timedFetch(15_000) },
    });
  }
  const cookieStore = await cookies();
  return createServerClient(supabaseUrl, supabaseKey, {
    cookieOptions: { domain: cookieDomain },
    global: { fetch: timedFetch(15_000) },
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        } catch {
          // Appelé depuis un Server Component : sans effet, le proxy rafraîchit déjà la session.
        }
      },
    },
  });
}
