import { NextResponse, type NextRequest } from "next/server";
import { LOW_DATA_ALLOWED, LOW_DATA_COOKIE, LOW_DATA_PAGE } from "@/lib/low-data";
import { updateSession } from "@/lib/supabase/proxy";

export async function proxy(request: NextRequest) {
  // Connexion basse : tout le dashboard renvoie vers la page légère (rien de lourd n'est chargé), sauf les paramètres.
  const { pathname } = request.nextUrl;
  if (request.cookies.get(LOW_DATA_COOKIE)?.value === "1" && pathname.startsWith("/dashboard") && !LOW_DATA_ALLOWED.some((p) => pathname === p || pathname.startsWith(`${p}/`))) {
    return NextResponse.redirect(new URL(LOW_DATA_PAGE, request.url));
  }
  return updateSession(request);
}

// Seulement les pages qui lisent la session : les pages publiques restent statiques.
export const config = {
  matcher: ["/dashboard/:path*", "/admin/:path*", "/compte/:path*", "/bienvenue/:path*", "/connexion", "/inscription", "/mot-de-passe-oublie", "/reinitialiser"],
};
