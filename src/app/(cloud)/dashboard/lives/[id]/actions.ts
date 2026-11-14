"use server";

import { randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import { allow } from "@/lib/auth/rateLimit";
import { getSession } from "@/lib/dashboard-overview";
import { stability } from "@/lib/live-report";
import { createAdminClient, hasAdmin } from "@/lib/supabase/admin";
import { canManage, requireOwner } from "@/lib/workspace";

// Partage du rapport d'un direct : un jeton secret rend la page /direct/<jeton> publique ; l'arrêter retire le jeton.

export type ShareState = { token?: string | null; error?: string };

export async function shareLiveAction(id: string, on: boolean): Promise<ShareState> {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return { error: "Direct introuvable." };
  const { user, workspace } = await requireOwner(`/dashboard/lives/${id}`);
  if (!canManage(workspace)) return { error: "Seuls les gestionnaires de l'espace peuvent partager un direct." };
  if (!hasAdmin) return { error: "Le partage n'est pas disponible pour le moment." };
  if (!(await allow(`share:${user.id}`, 30, 3600))) return { error: "Trop de modifications. Réessaie dans un moment." };
  const s = await getSession(id);
  if (!s) return { error: "Direct introuvable." };
  if (on && !s.ended_at) return { error: "Le rapport sera partageable une fois le direct terminé." };
  if (on && !stability(s)) return { error: "Direct trop court (moins de 2 minutes) : rien d'intéressant à partager." };

  const token = on ? randomBytes(24).toString("base64url") : null;
  const { error } = await createAdminClient().from("live_sessions").update({ share_token: token }).eq("id", id);
  if (error) return { error: "Le partage n'a pas pu être modifié. Réessaie dans un instant." };
  revalidatePath(`/dashboard/lives/${id}`);
  return { token };
}
