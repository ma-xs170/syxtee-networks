import type { EmailOtpType } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import { afterLogin } from "@/lib/auth/afterLogin";
import { mapSupabaseError } from "@/lib/auth/errors";
import { grantRecovery, recoveryFresh } from "@/lib/auth/recovery";
import { checkNewDevice, sendWelcomeOnce } from "@/lib/email/account";
import { createClient } from "@/lib/supabase/server";

// Liens reçus par email : vérification de l'adresse (inscription), mot de passe oublié, changement d'email.
// Modèles SYXTEE : ?token_hash=…&type=…. Modèles Supabase par défaut ({{ .ConfirmationURL }}) : retour avec ?code= (PKCE).
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const tokenHash = searchParams.get("token_hash");
  const code = searchParams.get("code");
  const type = (searchParams.get("type") ?? "email") as EmailOtpType;
  const next = searchParams.get("next");
  const recovery = type === "recovery" || next === "/reinitialiser";
  const failTo = recovery ? "/mot-de-passe-oublie" : "/connexion";
  if (searchParams.get("error")) return NextResponse.redirect(`${origin}${failTo}?erreur=${mapSupabaseError(searchParams.get("error_code"))}`);
  if (!tokenHash && !code) return NextResponse.redirect(`${origin}${failTo}?erreur=lien-expire`);

  const supabase = await createClient();
  const { data, error } = tokenHash
    ? await supabase.auth.verifyOtp({ type, token_hash: tokenHash })
    : await supabase.auth.exchangeCodeForSession(code!);
  if (error || !data.user) return NextResponse.redirect(`${origin}${failTo}?erreur=${mapSupabaseError(error?.code ?? "otp_expired")}`);

  if (recovery) {
    // Lien « mot de passe oublié » de plus d'une heure : refusé (Supabase garde ses liens 24 h pour la vérification).
    if (!recoveryFresh(data.user)) {
      await supabase.auth.signOut();
      return NextResponse.redirect(`${origin}/mot-de-passe-oublie?erreur=lien-expire`);
    }
    await grantRecovery(data.user);
    return NextResponse.redirect(`${origin}/reinitialiser`);
  }
  if (type === "email_change") return NextResponse.redirect(`${origin}/dashboard/parametres?email=ok`);
  // Adresse vérifiée (inscription) : appareil mémorisé et email de bienvenue (une seule fois).
  await checkNewDevice(data.user);
  sendWelcomeOnce(data.user, (data.user.user_metadata?.first_name as string | undefined) ?? null, (data.user.user_metadata?.last_name as string | undefined) ?? null);
  return NextResponse.redirect(`${origin}${await afterLogin(data.user, next)}`);
}
