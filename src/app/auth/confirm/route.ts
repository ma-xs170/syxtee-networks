import type { EmailOtpType } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import { afterLogin } from "@/lib/auth/afterLogin";
import { mapSupabaseError } from "@/lib/auth/errors";
import { createClient } from "@/lib/supabase/server";

// Lien magique reçu par email : {{ .RedirectTo }}&token_hash={{ .TokenHash }}&type=email (voir supabase/README.md).
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const tokenHash = searchParams.get("token_hash");
  const type = (searchParams.get("type") ?? "email") as EmailOtpType;
  const next = searchParams.get("next");
  if (!tokenHash) return NextResponse.redirect(`${origin}/connexion?erreur=lien-expire`);

  const supabase = await createClient();
  const { data, error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
  if (error || !data.user) return NextResponse.redirect(`${origin}/connexion?erreur=${mapSupabaseError(error?.code ?? "otp_expired")}`);

  return NextResponse.redirect(`${origin}${await afterLogin(data.user, next)}`);
}
