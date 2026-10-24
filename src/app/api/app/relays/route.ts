import type { NextRequest } from "next/server";
import { appUser, privateJson, readJson } from "@/lib/auth/app-api";
import { getPlan } from "@/lib/auth/plan";
import { relayLimit } from "@/lib/plans";
import { loadRelays } from "@/lib/relays";
import { createRelayAction } from "@/app/(dashboard)/dashboard/serveurs/actions";

// GET /api/app/relays : serveurs (relais) du compte, avec leurs URLs, pour l'app iOS.
export async function GET() {
  const u = await appUser();
  if (u instanceof Response) return u;
  const [{ relays, status }, plan] = await Promise.all([loadRelays(u.id), getPlan()]);
  return privateJson({ relays, status, max: relayLimit(plan) });
}

// POST /api/app/relays { name, protocol: "srtla"|"rtmp", server } : crée un relais (mêmes règles que le site).
export async function POST(request: NextRequest) {
  const u = await appUser();
  if (u instanceof Response) return u;
  const body = (await readJson(request)) as { name?: string; protocol?: "srtla" | "rtmp"; server?: string } | null;
  if (!body?.name || !body.protocol || !body.server) return privateJson({ error: "Champs manquants." }, { status: 400 });
  const r = await createRelayAction({ name: body.name, protocol: body.protocol, server: body.server });
  return r.error ? privateJson({ error: r.error }, { status: 400 }) : privateJson({ relay: r.relay });
}
