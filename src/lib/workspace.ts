import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { getUser, requireUser } from "@/lib/auth/dal";
import { createAdminClient, hasAdmin } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

// Espaces partagés (migration 0046). Un espace est un compte technique : ses flux, ses OBS et ses sauvegardes sont ceux de ce compte.
// L'espace actif est choisi par un cookie ; il n'est jamais cru sur parole : l'appartenance est relue en base (RLS) à chaque requête,
// et le Core la revérifie de son côté pour chaque appel (en-tête X-Syxtee-Workspace).

/** Cookie de l'espace actif. Lisible par le navigateur (envoyé au Core en en-tête) : ce n'est pas un secret, l'appartenance est vérifiée. */
export const WS_COOKIE = "syxtee_ws";

export type WorkspaceRole = "owner" | "admin" | "member";
export type Workspace = { id: string; name: string; color: string; role: WorkspaceRole; created_by: string };

/** Espaces dont l'utilisateur connecté est membre (lecture avec sa session : la RLS ne montre que les siens). */
export const listWorkspaces = cache(async (): Promise<Workspace[]> => {
  const user = await getUser();
  if (!user) return [];
  const supabase = await createClient();
  const { data } = await supabase.from("workspace_members").select("role, workspaces(id, name, color, created_by)").eq("user_id", user.id);
  const rows = (data ?? []) as unknown as { role: WorkspaceRole; workspaces: { id: string; name: string; color: string; created_by: string } | { id: string; name: string; color: string; created_by: string }[] | null }[];
  return rows
    .map((r) => ({ role: r.role, w: Array.isArray(r.workspaces) ? r.workspaces[0] : r.workspaces }))
    .filter((r): r is { role: WorkspaceRole; w: NonNullable<typeof r.w> } => !!r.w)
    .map((r) => ({ id: r.w.id, name: r.w.name, color: r.w.color, created_by: r.w.created_by, role: r.role }))
    .sort((a, b) => a.name.localeCompare(b.name, "fr"));
});

/** Espace actif (cookie) si l'utilisateur en est bien membre, sinon null = son espace personnel. */
export const getActiveWorkspace = cache(async (): Promise<Workspace | null> => {
  const id = (await cookies()).get(WS_COOKIE)?.value;
  if (!id || !/^[0-9a-f-]{36}$/i.test(id)) return null;
  return (await listWorkspaces()).find((w) => w.id === id) ?? null;
});

/**
 * Compte propriétaire des données du dashboard : l'espace actif, ou l'utilisateur lui-même.
 * `id` sert à tout lire et écrire (flux, OBS, sauvegardes) ; `user` reste le compte réellement connecté (profil, support, compte).
 */
export async function requireOwner(next: string) {
  const user = await requireUser(next);
  const workspace = await getActiveWorkspace();
  return { id: workspace?.id ?? user.id, user, workspace };
}

/** Les rôles qui gèrent l'espace (flux, membres) ; un simple membre pilote et regarde. */
export const canManage = (w: Workspace | null) => !w || w.role === "owner" || w.role === "admin";

/**
 * Client pour lire des données qui appartiennent au compte actif (directs, statistiques…). Espace personnel : la session de
 * l'utilisateur (la RLS limite à ses lignes). Espace partagé : clé de service, SEULEMENT après la vérification d'appartenance
 * ci-dessus, et les requêtes doivent filtrer sur `ownerId`.
 */
export async function dataClient() {
  const ws = await getActiveWorkspace();
  if (ws && hasAdmin) return { db: createAdminClient(), ownerId: ws.id as string | null };
  return { db: await createClient(), ownerId: null as string | null };
}

export type WorkspaceMember = { user_id: string; role: WorkspaceRole; created_at: string; name: string; email: string; avatar: string | null };
export type WorkspaceInviteRow = { id: string; email: string; role: "admin" | "member"; created_at: string; expires_at: string };

/** Membres d'un espace (nom, email, avatar) et invitations en attente. Lecture avec la clé de service : à n'appeler qu'après `getActiveWorkspace()`. */
export async function loadMembers(workspaceId: string): Promise<{ members: WorkspaceMember[]; invites: WorkspaceInviteRow[] }> {
  if (!hasAdmin) return { members: [], invites: [] };
  const db = createAdminClient();
  const [{ data: rows }, { data: inv }] = await Promise.all([
    db.from("workspace_members").select("user_id, role, created_at").eq("workspace_id", workspaceId).order("created_at"),
    db.from("workspace_invites").select("id, email, role, created_at, expires_at").eq("workspace_id", workspaceId).is("accepted_at", null).is("revoked_at", null).gt("expires_at", new Date().toISOString()).order("created_at"),
  ]);
  const members = await Promise.all(
    ((rows ?? []) as { user_id: string; role: WorkspaceRole; created_at: string }[]).map(async (m) => {
      const [{ data: u }, { data: p }] = await Promise.all([
        db.auth.admin.getUserById(m.user_id),
        db.from("profiles").select("first_name, last_name, twitch_display_name, username, avatar_url").eq("id", m.user_id).maybeSingle(),
      ]);
      const email = u?.user?.email ?? "";
      const name = [p?.first_name, p?.last_name].filter(Boolean).join(" ") || p?.twitch_display_name || p?.username || email.split("@")[0] || "Membre";
      return { ...m, name, email, avatar: (p?.avatar_url as string | null) ?? null };
    }),
  );
  return { members, invites: (inv ?? []) as WorkspaceInviteRow[] };
}
