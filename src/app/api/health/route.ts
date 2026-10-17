import { getServices } from "@/lib/status";

// GET /api/health : sonde pour la surveillance (UptimeRobot, GitHub Actions « uptime »). 200 si le site, la base et le Core répondent, 503 sinon.
// Ne renvoie aucun détail sensible : seulement l'état de chaque service.
export const dynamic = "force-dynamic";

export async function GET() {
  const services = await getServices();
  // Le relais dépend du Core : seul « down » sur le site, la base ou le Core déclenche l'alerte.
  const down = services.filter((s) => s.status === "down" && s.id !== "relay").map((s) => s.id);
  return Response.json(
    { ok: down.length === 0, down, services: Object.fromEntries(services.map((s) => [s.id, s.status])), at: new Date().toISOString() },
    { status: down.length === 0 ? 200 : 503, headers: { "Cache-Control": "no-store" } },
  );
}
