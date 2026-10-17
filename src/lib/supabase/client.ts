import { createBrowserClient } from "@supabase/ssr";
import { cookieDomain, supabaseKey, supabaseUrl } from "./env";

/** Client navigateur (composants client). La session vit dans des cookies partagés avec le serveur. */
export function createClient() {
  return createBrowserClient(supabaseUrl, supabaseKey, { cookieOptions: { domain: cookieDomain } });
}
