import "server-only";
import { createAdminClient, hasAdmin } from "@/lib/supabase/admin";

// Demandes de devis (formulaire public « Contacter », table quote_requests, migration 0050). Lecture et mise à jour par le serveur seulement.

export type QuoteStatus = "new" | "answered" | "closed";
export type QuoteRequest = {
  id: string;
  created_at: string;
  name: string;
  email: string;
  phone: string;
  channel: string;
  event_type: string;
  location: string;
  event_date: string;
  duration: string;
  audience: string;
  needs: string[];
  message: string;
  status: QuoteStatus;
  handled_at: string | null;
  handled_by: string | null;
};

const COLS = "id, created_at, name, email, phone, channel, event_type, location, event_date, duration, audience, needs, message, status, handled_at, handled_by";

export async function listQuotes(): Promise<QuoteRequest[]> {
  if (!hasAdmin) return [];
  const { data, error } = await createAdminClient().from("quote_requests").select(COLS).order("created_at", { ascending: false }).limit(300);
  if (error) {
    console.error("quote_requests", error.message);
    return [];
  }
  return (data ?? []) as QuoteRequest[];
}

export async function newQuotesCount(): Promise<number> {
  if (!hasAdmin) return 0;
  const { count } = await createAdminClient().from("quote_requests").select("id", { count: "exact", head: true }).eq("status", "new");
  return count ?? 0;
}
