"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { newShareToken } from "@/lib/calendar-data";
import { LIVE_COLUMNS, MAX_DURATION_MS, PLATFORM_IDS, type LiveEvent } from "@/lib/calendar";
import { createAdminClient } from "@/lib/supabase/admin";
import { canManage, requireOwner } from "@/lib/workspace";

// Calendrier des lives (dashboard) : créer, modifier, déplacer, supprimer, partager. Réservé aux comptes qui gèrent l'espace
// (un simple membre regarde). Chaque requête est filtrée sur le propriétaire : un identifiant d'un autre compte ne touche rien.

const iso = z.string().refine((v) => !Number.isNaN(Date.parse(v)), "Date invalide");
const fields = {
  title: z.string().trim().min(1, "Donne un titre.").max(120),
  location: z.string().trim().max(120),
  description: z.string().trim().max(2000),
  platforms: z.array(z.enum(PLATFORM_IDS)).max(PLATFORM_IDS.length),
  starts_at: iso,
  ends_at: iso,
  assignee_id: z.string().uuid().nullable(),
};
const full = z.object(fields);
const patch = z.object(fields).partial();
const id = z.string().uuid();

export type Result<T> = { ok: true; value: T } | { ok: false; error: string };
const fail = (error: string): { ok: false; error: string } => ({ ok: false, error });

async function guard() {
  const owner = await requireOwner("/dashboard/calendrier");
  return canManage(owner.workspace) ? owner : null;
}

function checkRange(starts: string, ends: string): string | null {
  const d = Date.parse(ends) - Date.parse(starts);
  if (!(d > 0)) return "La fin doit être après le début.";
  if (d > MAX_DURATION_MS) return "Un live dure 7 jours au plus.";
  return null;
}

const normalize = (platforms: string[]) => [...new Set(platforms)];

/** Le responsable d'un direct doit être un membre de l'espace (un calendrier personnel n'a pas de responsable). */
async function assigneeError(workspaceId: string, assignee: string | null | undefined): Promise<string | null> {
  if (!assignee) return null;
  const { data } = await createAdminClient().from("workspace_members").select("user_id").eq("workspace_id", workspaceId).eq("user_id", assignee).maybeSingle();
  return data ? null : "Ce responsable ne fait pas partie de l'équipe.";
}

export async function createLiveAction(input: unknown): Promise<Result<LiveEvent>> {
  const owner = await guard();
  if (!owner) return fail("Seuls les administrateurs de l'espace modifient le calendrier.");
  const p = full.safeParse(input);
  if (!p.success) return fail(p.error.issues[0]?.message ?? "Live invalide.");
  const range = checkRange(p.data.starts_at, p.data.ends_at);
  if (range) return fail(range);
  const who = await assigneeError(owner.id, p.data.assignee_id);
  if (who) return fail(who);
  const { data, error } = await createAdminClient()
    .from("scheduled_lives")
    .insert({ ...p.data, platforms: normalize(p.data.platforms), owner_id: owner.id, created_by: owner.user.id })
    .select(LIVE_COLUMNS)
    .single();
  if (error || !data) {
    console.error("scheduled_lives insert", error?.message);
    return fail("Enregistrement impossible, réessaie dans un instant.");
  }
  revalidatePath("/dashboard/calendrier");
  return { ok: true, value: data as LiveEvent };
}

/** Modifie un live ; sert aussi au déplacement (glisser-déposer : seules les dates changent). */
export async function updateLiveAction(liveId: string, input: unknown): Promise<Result<LiveEvent>> {
  const owner = await guard();
  if (!owner) return fail("Seuls les administrateurs de l'espace modifient le calendrier.");
  if (!id.safeParse(liveId).success) return fail("Live introuvable.");
  const p = patch.safeParse(input);
  if (!p.success) return fail(p.error.issues[0]?.message ?? "Live invalide.");
  const db = createAdminClient();
  const { data: current } = await db.from("scheduled_lives").select("starts_at, ends_at").eq("id", liveId).eq("owner_id", owner.id).maybeSingle();
  if (!current) return fail("Live introuvable.");
  const range = checkRange(p.data.starts_at ?? (current as { starts_at: string }).starts_at, p.data.ends_at ?? (current as { ends_at: string }).ends_at);
  if (range) return fail(range);
  const who = await assigneeError(owner.id, p.data.assignee_id);
  if (who) return fail(who);
  const { data, error } = await db
    .from("scheduled_lives")
    .update({ ...p.data, ...(p.data.platforms ? { platforms: normalize(p.data.platforms) } : {}), updated_at: new Date().toISOString() })
    .eq("id", liveId)
    .eq("owner_id", owner.id)
    .select(LIVE_COLUMNS)
    .single();
  if (error || !data) {
    console.error("scheduled_lives update", error?.message);
    return fail("Enregistrement impossible, réessaie dans un instant.");
  }
  revalidatePath("/dashboard/calendrier");
  return { ok: true, value: data as LiveEvent };
}

export async function deleteLiveAction(liveId: string): Promise<Result<null>> {
  const owner = await guard();
  if (!owner) return fail("Seuls les administrateurs de l'espace modifient le calendrier.");
  if (!id.safeParse(liveId).success) return fail("Live introuvable.");
  const { error } = await createAdminClient().from("scheduled_lives").delete().eq("id", liveId).eq("owner_id", owner.id);
  if (error) {
    console.error("scheduled_lives delete", error.message);
    return fail("Suppression impossible, réessaie dans un instant.");
  }
  revalidatePath("/dashboard/calendrier");
  return { ok: true, value: null };
}

/** Active le lien de partage (ou en crée un nouveau : l'ancien cesse aussitôt de marcher). */
export async function shareCalendarAction(renew: boolean): Promise<Result<string>> {
  const owner = await guard();
  if (!owner) return fail("Seuls les administrateurs de l'espace partagent le calendrier.");
  const db = createAdminClient();
  if (!renew) {
    const { data } = await db.from("calendar_shares").select("token").eq("owner_id", owner.id).maybeSingle();
    if (data) return { ok: true, value: (data as { token: string }).token };
  }
  const token = newShareToken();
  const { error } = await db.from("calendar_shares").upsert({ owner_id: owner.id, token, created_at: new Date().toISOString() }, { onConflict: "owner_id" });
  if (error) {
    console.error("calendar_shares upsert", error.message);
    return fail("Lien impossible à créer, réessaie dans un instant.");
  }
  return { ok: true, value: token };
}

export async function unshareCalendarAction(): Promise<Result<null>> {
  const owner = await guard();
  if (!owner) return fail("Seuls les administrateurs de l'espace partagent le calendrier.");
  const { error } = await createAdminClient().from("calendar_shares").delete().eq("owner_id", owner.id);
  if (error) {
    console.error("calendar_shares delete", error.message);
    return fail("Impossible de retirer le lien, réessaie dans un instant.");
  }
  return { ok: true, value: null };
}
