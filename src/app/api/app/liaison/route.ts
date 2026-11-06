import { NextResponse, type NextRequest } from "next/server";
import { getUser } from "@/lib/auth/dal";
import { createAdminClient, hasAdmin } from "@/lib/supabase/admin";

const STATE = /^[A-Za-z0-9_-]{16,80}$/;

// POST /api/app/liaison : le visiteur connecté clique « Autoriser » ; l'app native reçoit un lien à usage unique
// (syxteedashboard://auth?token_hash=…&state=…) et ouvre sa propre session, indépendante de celle du navigateur.
export async function POST(request: NextRequest) {
  const { origin } = request.nextUrl;
  if (request.headers.get("origin") !== origin) return new NextResponse("Origine refusée", { status: 403 });
  const form = await request.formData();
  const state = String(form.get("state") ?? "");
  if (!STATE.test(state)) return new NextResponse("Requête invalide", { status: 400 });
  const back = (e: string) => NextResponse.redirect(`${origin}/liaison-app?state=${state}&erreur=${e}`, 303);

  const user = await getUser();
  if (!user?.email) return NextResponse.redirect(`${origin}/connexion?next=${encodeURIComponent(`/liaison-app?state=${state}`)}`, 303);
  if (!hasAdmin) return back("config");

  const { data, error } = await createAdminClient().auth.admin.generateLink({ type: "magiclink", email: user.email });
  const hash = data?.properties?.hashed_token;
  if (error || !hash) return back("lien");

  const res = new NextResponse(null, { status: 303, headers: { Location: `syxteedashboard://auth?token_hash=${encodeURIComponent(hash)}&state=${state}`, "Cache-Control": "no-store" } });
  return res;
}
