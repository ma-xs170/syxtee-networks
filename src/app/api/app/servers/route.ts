import { appUser, privateJson } from "@/lib/auth/app-api";
import { RELAY_SERVERS } from "@/lib/relay-servers";

// GET /api/app/servers : lieux de serveurs (disponibles ou à venir), pour créer ou déplacer un relais.
export async function GET() {
  const u = await appUser();
  if (u instanceof Response) return u;
  return privateJson({ servers: RELAY_SERVERS });
}
