import { NextResponse, type NextRequest } from "next/server";
import { getUser } from "@/lib/auth/dal";
import { exchangeCode, identify, isPlatform, saveConnection } from "@/lib/chat/providers";

// Retour de la plateforme après l'autorisation : vérifie l'état, échange le code, enregistre le compte relié (jetons chiffrés).
export async function GET(request: NextRequest, { params }: { params: Promise<{ platform: string }> }) {
  const { platform } = await params;
  const { origin, searchParams } = request.nextUrl;
  const back = (q: string) => {
    const res = NextResponse.redirect(`${origin}/compte/comptes-relies?${q}`);
    res.cookies.delete({ name: "chat_oauth", path: "/api/chat" });
    return res;
  };
  if (!isPlatform(platform)) return NextResponse.json({ error: "bad_platform" }, { status: 404 });
  const user = await getUser();
  if (!user) return NextResponse.redirect(`${origin}/connexion?next=${encodeURIComponent("/compte/comptes-relies")}`);

  const code = searchParams.get("code");
  if (searchParams.get("error") || !code) return back(`chat_erreur=${platform}-refuse`);

  let saved: { p: string; state: string; verifier: string } | null = null;
  try {
    saved = JSON.parse(request.cookies.get("chat_oauth")?.value ?? "null");
  } catch {}
  if (!saved || saved.p !== platform || saved.state !== searchParams.get("state")) return back(`chat_erreur=${platform}-etat`);

  try {
    const tokens = await exchangeCode(platform, code, `${origin}/api/chat/callback/${platform}`, saved.verifier);
    const who = await identify(platform, tokens.access_token);
    await saveConnection(user.id, platform, tokens, who);
  } catch (e) {
    console.error("chat callback", platform, e instanceof Error ? e.message : e);
    return back(`chat_erreur=${platform}-echec`);
  }
  return back(`chat=${platform}`);
}
