import type { Instrumentation } from "next";

// Chaque erreur serveur (page, route, action) est gardée dans le journal des erreurs de l'admin (/admin/erreurs).
export const onRequestError: Instrumentation.onRequestError = async (err, request, context) => {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  const { logError } = await import("@/lib/error-log");
  const message = err instanceof Error ? err.message : String(err);
  const digest = typeof err === "object" && err !== null && "digest" in err ? String(err.digest) : undefined;
  const ua = request.headers["user-agent"];
  await logError({
    source: context.routeType === "action" ? "action" : context.routeType === "route" ? "route" : "server",
    message,
    digest,
    path: context.routePath || request.path,
    method: request.method,
    userAgent: Array.isArray(ua) ? ua[0] : ua,
  });
};
