import type { NextRequest } from "next/server";
import { getUser } from "@/lib/auth/dal";
import { PLATFORMS, configured, isPlatform, listConnections, removeConnection } from "@/lib/chat/providers";

// GET : comptes reliés (nom affiché) et plateformes disponibles côté serveur. DELETE ?platform=… : délie un compte.
export async function GET() {
  const user = await getUser();
  if (!user) return Response.json({ error: "unauthorized" }, { status: 401 });
  const connections = await listConnections(user.id).catch(() => ({}));
  return Response.json({ connections, configured: Object.fromEntries(PLATFORMS.map((p) => [p, configured(p)])) }, { headers: { "Cache-Control": "private, no-store" } });
}

export async function DELETE(request: NextRequest) {
  const user = await getUser();
  if (!user) return Response.json({ error: "unauthorized" }, { status: 401 });
  const p = request.nextUrl.searchParams.get("platform") ?? "";
  if (!isPlatform(p)) return Response.json({ error: "bad_platform" }, { status: 400 });
  await removeConnection(user.id, p);
  return Response.json({ ok: true });
}
