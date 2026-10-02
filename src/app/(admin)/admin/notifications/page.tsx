import type { Metadata } from "next";
import { DashHeader, DashPage, Tile, TileLabel } from "@/components/dashboard/ui";
import { requireAdmin } from "@/lib/admin";
import { createAdminClient, hasAdmin } from "@/lib/supabase/admin";
import { deleteNotificationAction } from "./actions";
import NotifForm from "./NotifForm";

export const metadata: Metadata = { title: "Admin · Notifications", robots: { index: false } };

// Admin : envoi de notifications (cloche du dashboard) à tous les comptes ou à un seul, et les dernières envoyées.

type Row = { id: string; user_id: string | null; title: string; body: string; created_at: string };

const when = (iso: string) => new Date(iso).toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short", timeZone: "Europe/Paris" });

export default async function AdminNotificationsPage() {
  await requireAdmin();
  const { data } = hasAdmin ? await createAdminClient().from("notifications").select("id, user_id, title, body, created_at").order("created_at", { ascending: false }).limit(30) : { data: [] };
  const rows = (data ?? []) as Row[];

  return (
    <DashPage>
      <DashHeader lead="Admin" hl="Notifications" sub="Apparaissent dans la cloche du dashboard de chaque destinataire." />
      <div className="grid gap-4 lg:grid-cols-2">
        <Tile>
          <TileLabel>Nouvelle notification</TileLabel>
          <div className="mt-4">
            <NotifForm />
          </div>
        </Tile>
        <Tile>
          <TileLabel>Dernières envoyées</TileLabel>
          {rows.length === 0 ? (
            <p className="mt-4 text-sm text-muted">Aucune notification envoyée.</p>
          ) : (
            <ul className="mt-3 divide-y divide-line">
              {rows.map((n) => (
                <li key={n.id} className="flex items-start justify-between gap-3 py-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium">{n.title}</p>
                    {n.body && <p className="mt-1 line-clamp-2 text-sm text-muted">{n.body}</p>}
                    <p className="mt-1.5 font-mono text-[10px] uppercase tracking-[0.12em] text-muted">
                      {when(n.created_at)} · {n.user_id ? "un compte" : "tous"}
                    </p>
                  </div>
                  <form action={deleteNotificationAction}>
                    <input type="hidden" name="id" value={n.id} />
                    <button type="submit" className="whitespace-nowrap text-sm text-muted underline-offset-4 hover:text-foreground hover:underline">
                      Retirer
                    </button>
                  </form>
                </li>
              ))}
            </ul>
          )}
        </Tile>
      </div>
    </DashPage>
  );
}
