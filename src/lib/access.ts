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
  /** Mise à la corbeille : supprimée définitivement après TRASH_DAYS jours. */
  deleted_at: string | null;
};

export const TRASH_DAYS = 30;

const COLS = "id, created_at, first_name, last_name, email, channel_url, platform, audience, devices, message, status, decided_at, decided_by, redeemed_at, deleted_at";

/** `trash` : la corbeille seulement ; sinon, les demandes non supprimées. */
export async function listRequests(status?: AccessRequest["status"], trash = false): Promise<AccessRequest[]> {
  if (!hasAdmin) return [];
  let q = createAdminClient().from("access_requests").select(COLS).limit(200);
  q = trash ? q.not("deleted_at", "is", null).order("deleted_at", { ascending: false }) : q.is("deleted_at", null).order("created_at", { ascending: false });
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
  const { count } = await createAdminClient().from("access_requests").select("id", { count: "exact", head: true }).eq("status", "pending").is("deleted_at", null);
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
      .is("deleted_at", null)
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

/** L'adresse a-t-elle une demande d'accès approuvée (non supprimée) ou une invitation d'équipe en cours ? Seules ces adresses peuvent créer un compte par email. */
export async function isApprovedEmail(email: string): Promise<boolean> {
  if (!hasAdmin) return false;
  const { count } = await createAdminClient()
    .from("access_requests")
    .select("id", { count: "exact", head: true })
    .ilike("email", email.replace(/[%_\\]/g, "\\$&"))
    .eq("status", "approved")
    .is("deleted_at", null);
  if ((count ?? 0) > 0) return true;
  // Invitation à rejoindre l'équipe (0047_staff.sql) : elle ouvre aussi l'inscription, pour l'adresse invitée seulement.
  const { count: invited } = await createAdminClient()
    .from("staff_invites")
    .select("id", { count: "exact", head: true })
    .ilike("email", email.replace(/[%_\\]/g, "\\$&"))
    .is("accepted_at", null)
    .is("revoked_at", null)
    .gt("expires_at", new Date().toISOString());
  return (invited ?? 0) > 0;
}

/** Supprime pour de bon les demandes à la corbeille depuis plus de TRASH_DAYS jours (tâche quotidienne). Renvoie leur nombre. */
export async function purgeTrash(): Promise<number> {
  if (!hasAdmin) return 0;
  const limit = new Date(Date.now() - TRASH_DAYS * 86_400_000).toISOString();
  const { data, error } = await createAdminClient().from("access_requests").delete().lt("deleted_at", limit).select("id");
  if (error) {
    console.error("purgeTrash", error.message);
    return 0;
  }
  return data?.length ?? 0;
}
