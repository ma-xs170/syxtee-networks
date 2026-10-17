import type { NextRequest } from "next/server";
import { appUser, privateJson, redirectTarget, readJson } from "@/lib/auth/app-api";
import { listTickets, ticketCounts } from "@/lib/support";
import { categoryLabel } from "@/lib/support-categories";
import { createTicketAction } from "@/app/(dashboard)/dashboard/aide/actions";

// GET /api/app/support?state=open|resolved|all : demandes du compte.
export async function GET(request: NextRequest) {
  const u = await appUser();
  if (u instanceof Response) return u;
  const s = request.nextUrl.searchParams.get("state");
  const state = s === "resolved" || s === "all" ? s : "open";
  const [tickets, counts] = await Promise.all([listTickets({ userId: u.id, state }), ticketCounts(u.id)]);
  return privateJson({ tickets: tickets.map((t) => ({ ...t, category_label: categoryLabel(t.category) })), counts, support_id: u.profile.support_id ?? null });
}

// POST /api/app/support { category, subject, body, fields?: { nom: valeur } } : ouvre une demande (mêmes règles que le site).
export async function POST(request: NextRequest) {
  const u = await appUser();
  if (u instanceof Response) return u;
  const b = (await readJson(request)) as { category?: string; subject?: string; body?: string; fields?: Record<string, string> } | null;
  if (!b) return privateJson({ error: "Corps invalide." }, { status: 400 });
  const form = new FormData();
  form.set("category", b.category ?? "");
  form.set("subject", b.subject ?? "");
  form.set("body", b.body ?? "");
  for (const [k, v] of Object.entries(b.fields ?? {})) form.set(`f_${k}`, String(v));
  const out = await redirectTarget(() => createTicketAction({}, form));
  if ("redirect" in out) return privateJson({ id: out.redirect.split("/").pop() });
  return privateJson({ error: out.result.error ?? "Envoi impossible." }, { status: 400 });
}
