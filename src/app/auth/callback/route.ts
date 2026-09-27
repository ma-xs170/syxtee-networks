import { NextResponse, type NextRequest } from "next/server";
import { afterLogin } from "@/lib/auth/afterLogin";
import { mapSupabaseError } from "@/lib/auth/errors";
import { createClient } from "@/lib/supabase/server";

// Retour des fournisseurs OAuth (Twitch, Discord, Google) et des liaisons de compte.
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const next = searchParams.get("next");
  // Échec d'une liaison depuis /compte : on y revient (la personne est déjà connectée).
  const back = next?.startsWith("/compte") || next?.startsWith("/bienvenue") ? next.split("?")[0] : "/connexion";
  const fail = (code: string) => NextResponse.redirect(`${origin}${back}?erreur=${code}`);

  if (searchParams.get("error")) return fail(mapSupabaseError(searchParams.get("error_code") ?? searchParams.get("error")));
  const code = searchParams.get("code");
  if (!code) return fail("oauth");

  const supabase = await createClient();
  const { data, error } = await supabase.auth.exchangeCodeForSession(code);
  if (error || !data.user) return fail(mapSupabaseError(error?.code));

  return NextResponse.redirect(`${origin}${await afterLogin(data.user, next)}`);
}
