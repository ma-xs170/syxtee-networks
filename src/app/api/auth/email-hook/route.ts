import { NextResponse, type NextRequest } from "next/server";
import { Webhook } from "standardwebhooks";
import { code, emailChange, loginLink, resetPassword, verifyEmail, type Email } from "@/emails/templates";
import { sendEmail } from "@/lib/email/send";
import { site } from "@/lib/site";

// « Send Email Hook » de Supabase Auth : Supabase n'envoie plus rien lui-même, il appelle cette route (signée,
// Standard Webhooks) et on envoie nos modèles via Resend. Secret : SEND_EMAIL_HOOK_SECRET (« v1,whsec_… »).
// Les liens pointent vers /auth/confirm avec token_hash : ils marchent dans n'importe quel navigateur.

type Payload = {
  user: { email: string; new_email?: string; user_metadata?: { first_name?: string } };
  email_data: {
    token: string;
    token_hash: string;
    token_hash_new?: string;
    redirect_to: string;
    email_action_type: string;
    site_url: string;
  };
};

const fail = (status: number, message: string) => NextResponse.json({ error: { http_code: status, message } }, { status });

/** Lien /auth/confirm : on garde le « next » demandé par le site (redirect_to, déjà validé par Supabase). */
function confirmLink(d: Payload["email_data"], tokenHash: string, type: string) {
  let url: URL;
  try {
    url = new URL(d.redirect_to);
    if (url.pathname !== "/auth/confirm") url = new URL("/auth/confirm", url.origin);
  } catch {
    url = new URL("/auth/confirm", d.site_url || site.url);
  }
  url.searchParams.set("token_hash", tokenHash);
  url.searchParams.set("type", type);
  return url.toString();
}

export async function POST(request: NextRequest) {
  const secret = process.env.SEND_EMAIL_HOOK_SECRET;
  if (!secret) return fail(500, "SEND_EMAIL_HOOK_SECRET manquant");
  const body = await request.text();
  let payload: Payload;
  try {
    payload = new Webhook(secret.replace(/^v1,whsec_/, "")).verify(body, Object.fromEntries(request.headers)) as Payload;
  } catch {
    return fail(401, "signature invalide");
  }

  const { user, email_data: d } = payload;
  const first = user.user_metadata?.first_name ?? null;
  const out: [string, Email][] = [];
  switch (d.email_action_type) {
    case "signup":
      out.push([user.email, verifyEmail({ url: confirmLink(d, d.token_hash, "signup"), firstName: first })]);
      break;
    case "recovery":
      out.push([user.email, resetPassword({ url: confirmLink(d, d.token_hash, "recovery") })]);
      break;
    case "email_change": {
      const next = user.new_email ?? "";
      // Double confirmation : token_hash_new va à l'adresse actuelle, token_hash à la nouvelle (nommage Supabase).
      if (d.token_hash_new) out.push([user.email, emailChange({ to: "old", oldEmail: user.email, newEmail: next, url: confirmLink(d, d.token_hash_new, "email_change") })]);
      if (next) out.push([next, emailChange({ to: "new", oldEmail: user.email, newEmail: next, url: confirmLink(d, d.token_hash, "email_change") })]);
      break;
    }
    case "magiclink":
    case "invite":
      out.push([user.email, loginLink({ url: confirmLink(d, d.token_hash, d.email_action_type) })]);
      break;
    case "reauthentication":
      out.push([user.email, code({ token: d.token })]);
      break;
    default:
      console.error("email-hook : type inconnu", d.email_action_type);
      return fail(400, `type ${d.email_action_type} non géré`);
  }

  const sent = await Promise.all(out.map(([to, email]) => sendEmail(to, email)));
  if (sent.includes(false)) return fail(502, "envoi de l'email impossible");
  return NextResponse.json({});
}
