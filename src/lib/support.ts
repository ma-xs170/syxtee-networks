import "server-only";
import { createAdminClient, hasAdmin } from "@/lib/supabase/admin";

// Support : requêtes partagées entre l'espace client et l'espace admin. Tout passe par la clé secrète, après que
// l'appelant a vérifié le propriétaire (client) ou le rôle (admin).

export type Ticket = {
  id: string;
  user_id: string;
  subject: string;
  status: "open" | "resolved";
  created_at: string;
  updated_at: string;
  first_reply_at: string | null;
  resolved_at: string | null;
  last_from: "user" | "staff";
};
export type TicketMessage = { id: string; ticket_id: string; author_id: string | null; from_staff: boolean; body: string; created_at: string };

const COLS = "id, user_id, subject, status, created_at, updated_at, first_reply_at, resolved_at, last_from";

export async function listTickets(opts: { userId?: string; state?: "open" | "resolved" | "all"; limit?: number } = {}): Promise<Ticket[]> {
  if (!hasAdmin) return [];
  let q = createAdminClient().from("support_tickets").select(COLS).order("updated_at", { ascending: false }).limit(opts.limit ?? 100);
  if (opts.userId) q = q.eq("user_id", opts.userId);
  if (opts.state === "open" || opts.state === "resolved") q = q.eq("status", opts.state);
  const { data, error } = await q;
  if (error) {
    console.error("support_tickets", error.message);
    return [];
  }
  return (data ?? []) as Ticket[];
}

export async function ticketCounts(userId?: string): Promise<{ open: number; resolved: number }> {
  const all = await listTickets({ userId, state: "all", limit: 500 });
  return { open: all.filter((t) => t.status === "open").length, resolved: all.filter((t) => t.status === "resolved").length };
}

/** Ticket et messages ; `userId` : seulement si le ticket lui appartient (espace client). */
export async function getThread(id: string, userId?: string): Promise<{ ticket: Ticket; messages: TicketMessage[] } | null> {
  if (!hasAdmin || !/^[0-9a-f-]{36}$/i.test(id)) return null;
  const db = createAdminClient();
  let q = db.from("support_tickets").select(COLS).eq("id", id);
  if (userId) q = q.eq("user_id", userId);
  const { data: ticket } = await q.maybeSingle();
  if (!ticket) return null;
  const { data: messages } = await db.from("support_messages").select("id, ticket_id, author_id, from_staff, body, created_at").eq("ticket_id", id).order("created_at");
  return { ticket: ticket as Ticket, messages: (messages ?? []) as TicketMessage[] };
}

/** « Prénom N. » de chaque compte, pour la boîte de réception admin. */
export async function whoIs(ids: string[]): Promise<Map<string, string>> {
  const out = new Map<string, string>();
  if (!hasAdmin || ids.length === 0) return out;
  const { data } = await createAdminClient().from("profiles").select("id, first_name, last_name, twitch_display_name, support_id").in("id", [...new Set(ids)]);
  for (const p of data ?? []) {
    const name = [p.first_name, p.last_name?.charAt(0) ? `${p.last_name.charAt(0)}.` : ""].filter(Boolean).join(" ") || p.twitch_display_name || p.support_id || "Compte";
    out.set(p.id as string, name);
  }
  return out;
}
