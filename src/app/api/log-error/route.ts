import type { NextRequest } from "next/server";
import { logError } from "@/lib/error-log";
import { clientIp } from "@/lib/auth/rateLimit";
import { limitOr429, throttle } from "@/lib/guard";

// POST /api/log-error { message, digest?, path? } : erreur d'affichage vue dans le navigateur (error.tsx), gardée dans le journal admin.
// Ouverte aux visiteurs sans compte, donc limitée : 10 par minute et par adresse, corps de 4 Ko au plus.
export async function POST(request: NextRequest) {
  const ip = await clientIp();
  if (!throttle(`log-error:${ip}`, 10, 60_000)) return new Response(null, { status: 204 });
  const limited = await limitOr429(`log-error:${ip}`, 30, 3600);
  if (limited) return limited;
  const raw = await request.text();
  if (raw.length > 4096) return new Response(null, { status: 413 });
  let b: { message?: unknown; digest?: unknown; path?: unknown } | null = null;
  try {
    b = JSON.parse(raw);
  } catch {}
  if (!b || typeof b.message !== "string") return new Response(null, { status: 400 });
  await logError({
    source: "client",
    message: b.message,
    digest: typeof b.digest === "string" ? b.digest.slice(0, 64) : undefined,
    path: typeof b.path === "string" && b.path.startsWith("/") ? b.path : undefined,
    userAgent: request.headers.get("user-agent") ?? undefined,
  });
  return new Response(null, { status: 204 });
}
