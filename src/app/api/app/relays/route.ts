import { appUser, privateJson } from "@/lib/auth/app-api";
import { getPlan } from "@/lib/auth/plan";
import { relayLimit } from "@/lib/plans";
import { loadRelays } from "@/lib/relays";

// GET /api/app/relays : serveurs (relais) du compte, avec leurs URLs, pour l'app iOS.
export async function GET() {
  const u = await appUser();
  if (u instanceof Response) return u;
  const [{ relays, status }, plan] = await Promise.all([loadRelays(u.id), getPlan()]);
  return privateJson({ relays, status, max: relayLimit(plan) });
}
