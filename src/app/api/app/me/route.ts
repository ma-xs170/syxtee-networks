import { appUser, privateJson } from "@/lib/auth/app-api";
import { getPlan } from "@/lib/auth/plan";
import { relayLimit } from "@/lib/plans";

// GET /api/app/me : identité et formule du compte, pour l'app iOS.
export async function GET() {
  const u = await appUser();
  if (u instanceof Response) return u;
  const plan = await getPlan();
  const p = u.profile;
  const name = [p.first_name, p.last_name].filter(Boolean).join(" ") || p.twitch_display_name || p.username || u.email?.split("@")[0] || "Compte";
  return privateJson({
    id: u.id,
    email: u.email,
    name,
    username: p.username,
    avatar_url: p.avatar_url,
    plan: { name: plan.name, streams: Number.isFinite(plan.maxConcurrentStreams) ? plan.maxConcurrentStreams : 99, relays: relayLimit(plan) },
    plan_until: p.plan_until ?? null,
    billing_status: p.billing_status ?? null,
  });
}
