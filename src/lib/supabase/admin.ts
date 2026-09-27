import "server-only";
import { createClient } from "@supabase/supabase-js";
import { supabaseUrl } from "./env";

// Clé secrète : contourne les règles d'accès. Serveur uniquement (jamais NEXT_PUBLIC_), usage limité et explicite.
const secret = (process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || "").trim();
export const hasAdmin = supabaseUrl !== "" && secret !== "";

export function createAdminClient() {
  if (!hasAdmin) throw new Error("SUPABASE_SECRET_KEY manquante");
  return createClient(supabaseUrl, secret, { auth: { persistSession: false, autoRefreshToken: false } });
}
