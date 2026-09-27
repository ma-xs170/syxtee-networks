import type { EmailOtpType } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import { afterLogin } from "@/lib/auth/afterLogin";
import { mapSupabaseError } from "@/lib/auth/errors";
import { createClient } from "@/lib/supabase/server";

// Lien magique reçu par email : {{ .RedirectTo }}&token_hash={{ .TokenHash }}&type=email (voir supabase/README.md),
// ou lien du modèle par défaut de Supabase, qui revient ici avec ?code=.
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const tokenHash = searchParams.get("token_hash");
  const code = searchParams.get("code");
  const type = (searchParams.get("type") ?? "email") as EmailOtpType;
  const next = searchParams.get("next");
  if (searchParams.get("error")) return NextResponse.redirect(`${origin}/connexion?erreur=${mapSupabaseError(searchParams.get("error_code"))}`);
  if (!tokenHash && !code) return NextResponse.redirect(`${origin}/connexion?erreur=lien-expire`);

  const supabase = await createClient();
  // Modèle SYXTEE : token_hash. Modèle Supabase par défaut ({{ .ConfirmationURL }}) : retour avec ?code= (PKCE).
  const { data, error } = tokenHash
    ? await supabase.auth.verifyOtp({ type, token_hash: tokenHash })
    : await supabase.auth.exchangeCodeForSession(code!);
  if (error || !data.user) return NextResponse.redirect(`${origin}/connexion?erreur=${mapSupabaseError(error?.code ?? "otp_expired")}`);

  return NextResponse.redirect(`${origin}${await afterLogin(data.user, next)}`);
}
