import { createHash, randomBytes } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { getUser } from "@/lib/auth/dal";
import { authorizeUrl, configured, isPlatform } from "@/lib/chat/providers";

// GET /api/chat/connect/<twitch|kick|youtube> : envoie vers la plateforme pour relier son compte (écrire dans le chat).
// Un état aléatoire (et le verrou PKCE pour Kick) est gardé dans un cookie court, vérifié au retour.
export async function GET(request: NextRequest, { params }: { params: Promise<{ platform: string }> }) {
  const { platform } = await params;
  const { origin } = request.nextUrl;
  if (!isPlatform(platform)) return NextResponse.json({ error: "bad_platform" }, { status: 404 });
  if (!(await getUser())) return NextResponse.redirect(`${origin}/connexion?next=${encodeURIComponent("/dashboard/multichat")}`);
  if (!configured(platform)) return NextResponse.redirect(`${origin}/dashboard/multichat?chat_erreur=${platform}-indisponible`);

  const state = randomBytes(16).toString("base64url");
  const verifier = randomBytes(32).toString("base64url");
  const challenge = createHash("sha256").update(verifier).digest("base64url");
  const res = NextResponse.redirect(authorizeUrl(platform, `${origin}/api/chat/callback/${platform}`, state, challenge));
  res.cookies.set("chat_oauth", JSON.stringify({ p: platform, state, verifier }), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/api/chat",
    maxAge: 600,
  });
  return res;
}
