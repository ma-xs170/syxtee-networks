import "server-only";
import { createAdminClient, hasAdmin } from "@/lib/supabase/admin";

// Réseau de sponsors (migration 0055_sponsors.sql). Lecture et écriture par le serveur seulement (clé secrète).

export const SPONSOR_CATEGORIES = ["Casques audio", "Boissons énergisantes", "Jeux mobiles", "Matériel de streaming", "Forfaits mobiles", "Vêtements et accessoires"] as const;

export type SponsorStatus = "pending" | "approved" | "rejected";
export type SponsorApplication = { id: string; created_at: string; user_id: string; email: string; categories: string[]; message: string; status: SponsorStatus; handled_at: string | null; handled_by: string | null };
export type SponsorCampaign = { id: string; created_at: string; brand: string; category: string; pinned_message: string; link: string; code: string; active: boolean };

const APP_COLS = "id, created_at, user_id, email, categories, message, status, handled_at, handled_by";
const CAMPAIGN_COLS = "id, created_at, brand, category, pinned_message, link, code, active";

export async function getMyApplication(userId: string): Promise<SponsorApplication | null> {
  if (!hasAdmin) return null;
  const { data } = await createAdminClient().from("sponsor_applications").select(APP_COLS).eq("user_id", userId).maybeSingle();
  return (data as SponsorApplication | null) ?? null;
}

/** Campagnes actives attribuées à ce streamer. */
export async function listMyCampaigns(userId: string): Promise<SponsorCampaign[]> {
  if (!hasAdmin) return [];
  const db = createAdminClient();
  const { data: rows } = await db.from("sponsor_assignments").select("campaign_id").eq("user_id", userId);
  const ids = (rows ?? []).map((r) => r.campaign_id as string);
  if (ids.length === 0) return [];
  const { data } = await db.from("sponsor_campaigns").select(CAMPAIGN_COLS).in("id", ids).eq("active", true).order("created_at", { ascending: false });
  return (data ?? []) as SponsorCampaign[];
}

export async function listApplications(): Promise<SponsorApplication[]> {
  if (!hasAdmin) return [];
  const { data, error } = await createAdminClient().from("sponsor_applications").select(APP_COLS).order("created_at", { ascending: false }).limit(300);
  if (error) console.error("sponsor_applications", error.message);
  return (data ?? []) as SponsorApplication[];
}

export type CampaignWithCount = SponsorCampaign & { streamers: string[] };

export async function listCampaigns(): Promise<CampaignWithCount[]> {
  if (!hasAdmin) return [];
  const db = createAdminClient();
  const [{ data: camps, error }, { data: assigns }] = await Promise.all([
    db.from("sponsor_campaigns").select(CAMPAIGN_COLS).order("created_at", { ascending: false }).limit(200),
    db.from("sponsor_assignments").select("campaign_id, user_id"),
  ]);
  if (error) console.error("sponsor_campaigns", error.message);
  const emails = new Map<string, string>();
  const { data: apps } = await db.from("sponsor_applications").select("user_id, email");
  for (const a of apps ?? []) emails.set(a.user_id as string, a.email as string);
  return ((camps ?? []) as SponsorCampaign[]).map((c) => ({
    ...c,
    streamers: (assigns ?? []).filter((a) => a.campaign_id === c.id).map((a) => emails.get(a.user_id as string) ?? (a.user_id as string)),
  }));
}
