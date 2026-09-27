import type { NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/proxy";

export async function proxy(request: NextRequest) {
  return updateSession(request);
}

// Seulement les pages qui lisent la session : les pages publiques restent statiques.
export const config = {
  matcher: ["/dashboard/:path*", "/compte/:path*", "/bienvenue/:path*", "/connexion", "/inscription"],
};
