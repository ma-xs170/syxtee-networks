import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { hasSupabase, supabaseKey, supabaseUrl } from "./env";

const PRIVATE = ["/dashboard", "/compte", "/bienvenue"];
const GUEST_ONLY = ["/connexion", "/inscription", "/mot-de-passe-oublie"];
const matches = (path: string, list: string[]) => list.some((p) => path === p || path.startsWith(`${p}/`));

/** Rafraîchit la session (cookies) et fait les redirections « optimistes ». Les pages revérifient côté serveur. */
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });
  if (!hasSupabase) return response;

  const supabase = createServerClient(supabaseUrl, supabaseKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet, headers) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        Object.entries(headers).forEach(([key, value]) => response.headers.set(key, value));
      },
    },
  });

  // Rien entre createServerClient et getClaims (recommandation Supabase).
  const { data } = await supabase.auth.getClaims();
  const signedIn = !!data?.claims;
  const path = request.nextUrl.pathname;

  const redirectTo = (pathname: string, next?: string) => {
    const url = request.nextUrl.clone();
    url.pathname = pathname;
    url.search = next ? `?next=${encodeURIComponent(next)}` : "";
    const r = NextResponse.redirect(url);
    response.cookies.getAll().forEach((c) => r.cookies.set(c));
    return r;
  };

  // Server action (POST avec l'en-tête Next-Action) : pas de redirection ici. Le navigateur recevrait du HTML au lieu
  // de la réponse de l'action (« This page couldn't load ») ; l'action vérifie elle-même la session et répond.
  const isAction = request.method === "POST" && request.headers.has("next-action");
  if (!signedIn && !isAction && matches(path, PRIVATE)) return redirectTo("/connexion", path);
  if (signedIn && matches(path, GUEST_ONLY)) return redirectTo("/dashboard");
  return response;
}
