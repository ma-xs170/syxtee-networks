import "server-only";
import type { User } from "@supabase/supabase-js";
import { createAdminClient, hasAdmin } from "@/lib/supabase/admin";

// Demandes d'accès : lecture pour l'admin, et attribution automatique de la formule Partenaire au compte dont l'adresse
// (vérifiée) correspond à une demande approuvée.

export type AccessRequest = {
  id: string;
  created_at: string;
  first_name: string;
  last_name: string;
  email: string;
  channel_url: string;
  platform: "twitch" | "kick" | "youtube" | "tiktok" | "autre";
  audience: string;
  devices: string;
  message: string;
  status: "pending" | "approved" | "refused";
  decided_at: string | null;
  decided_by: string | null;
  redeemed_at: string | null;
};

const COLS = "id, created_at, first_name, last_name, email, channel_url, platform, audience, devices, message, status, decided_at, decided_by, redeemed_at";

export async function listRequests(status?: AccessRequest["status"]): Promise<AccessRequest[]> {
  if (!hasAdmin) return [];
  let q = createAdminClient().from("access_requests").select(COLS).order("created_at", { ascending: false }).limit(200);
  if (status) q = q.eq("status", status);
  const { data, error } = await q;
  if (error) {
    console.error("access_requests", error.message);
    return [];
  }
  return (data ?? []) as AccessRequest[];
}

export async function pendingCount(): Promise<number> {
  if (!hasAdmin) return 0;
  const { count } = await createAdminClient().from("access_requests").select("id", { count: "exact", head: true }).eq("status", "pending");
  return count ?? 0;
}

export async function getRequest(id: string): Promise<AccessRequest | null> {
  if (!hasAdmin || !/^[0-9a-f-]{36}$/i.test(id)) return null;
  const { data } = await createAdminClient().from("access_requests").select(COLS).eq("id", id).maybeSingle();
  return (data as AccessRequest | null) ?? null;
}

/**
 * Compte vérifié dont l'adresse a une demande approuvée pas encore utilisée : formule Partenaire, sans échéance.
 * Ne fait jamais échouer la connexion. Un compte déjà en Partenaire ou Admin n'est pas touché.
 */
export async function grantInvitedPlan(user: User) {
  if (!hasAdmin || !user.email || !user.email_confirmed_at) return;
  try {
    const db = createAdminClient();
    const { data: req } = await db
      .from("access_requests")
      .select("id")
      .ilike("email", user.email)
      .eq("status", "approved")
      .is("redeemed_at", null)
      .order("decided_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (!req) return;
    const { setPlan } = await import("@/lib/plan-admin");
    const { data: profile } = await db.from("profiles").select("plan").eq("id", user.id).maybeSingle();
    if (profile && profile.plan !== "partner" && profile.plan !== "admin") {
      await setPlan("invitation", user.id, { plan: "partner", until: null, note: "Demande d'accès approuvée" }, { action: "access.redeem", notify: false });
    }
    await db.from("access_requests").update({ redeemed_at: new Date().toISOString(), redeemed_by: user.id }).eq("id", req.id);
  } catch (e) {
    console.error("grantInvitedPlan", e);
  }
}
