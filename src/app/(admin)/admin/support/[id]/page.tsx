import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { DashPage } from "@/components/dashboard/ui";
import TicketChat from "@/components/support/TicketChat";
import { requireStaff } from "@/lib/admin";
import { staffCards } from "@/lib/staff-data";
import { ROLE_META, roleStyle } from "@/lib/staff";
import { presenceOf } from "@/lib/presence";
import { getThread, whoIs } from "@/lib/support";
import { categoryLabel } from "@/lib/support-categories";
import { createAdminClient } from "@/lib/supabase/admin";
import DeleteTicketButton from "@/components/support/DeleteTicketButton";
import { claimTicketAction, deleteTicketStaffAction, releaseTicketAction, setTicketStatusAction, staffReplyAction } from "../actions";

export const metadata: Metadata = { title: "Admin · Demande", robots: { index: false } };

const day = (iso: string) => new Date(iso).toLocaleString("fr-FR", { day: "numeric", month: "long", hour: "2-digit", minute: "2-digit", timeZone: "Europe/Paris" });

export default async function AdminTicketPage({ params }: { params: Promise<{ id: string }> }) {
  const { user: me, access } = await requireStaff("support");
  const { id } = await params;
  const thread = await getThread(id);
  if (!thread) notFound();
  const { ticket, messages } = thread;
  const db = createAdminClient();
  const agentIds = [...new Set([...messages.filter((m) => m.from_staff).map((m) => m.author_id), ticket.assigned_to].filter((x): x is string => !!x))];
  const [agents, authors, { data: profile }, { data: auth }] = await Promise.all([
    staffCards(agentIds),
    whoIs([ticket.user_id, ...messages.map((m) => m.author_id).filter((x): x is string => !!x)]),
    db.from("profiles").select("support_id, last_seen_at").eq("id", ticket.user_id).maybeSingle(),
    db.auth.admin.getUserById(ticket.user_id),
  ]);
  const client = authors.get(ticket.user_id) ?? "Client";
  const seen = presenceOf(profile?.last_seen_at, auth.user?.last_sign_in_at);
  const assignee = ticket.assigned_to ? agents.get(ticket.assigned_to) : undefined;
  const iAmAssignee = ticket.assigned_to === me.id;
  const canTake = !iAmAssignee && (!ticket.assigned_to || access.role !== "support");
  const canRelease = !!ticket.assigned_to && (iAmAssignee || access.role === "owner" || access.role === "admin");
  const firstReply = ticket.first_reply_at ? Math.max(1, Math.round((Date.parse(ticket.first_reply_at) - Date.parse(ticket.created_at)) / 60_000)) : null;

  return (
    <DashPage>
      <Link href={`/admin/support?categorie=${ticket.category}`} className="text-sm text-muted transition-colors hover:text-foreground">
        ← Support : {categoryLabel(ticket.category)}
      </Link>
      <div className="mb-8 mt-4 flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="h-page break-words">{ticket.subject}</h1>
          <p className="mt-2 text-sm text-muted">
            {client} · {categoryLabel(ticket.category)} · {ticket.status === "resolved" ? "Résolu" : "En cours"}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <form action={setTicketStatusAction.bind(null, ticket.id, ticket.status === "open" ? "resolved" : "open")}>
            <button type="submit" className="h-10 whitespace-nowrap rounded-lg border border-line-strong px-4 text-sm transition-colors hover:bg-foreground/10">
              {ticket.status === "open" ? "Marquer comme résolu" : "Rouvrir"}
            </button>
          </form>
          <DeleteTicketButton action={deleteTicketStaffAction.bind(null, ticket.id)} />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1fr)_300px]">
        <TicketChat
          viewer="staff"
          messages={messages.map((m) => {
            const a = m.from_staff && m.author_id ? agents.get(m.author_id) : undefined;
            return { id: m.id, from_staff: m.from_staff, body: m.body, created_at: m.created_at, name: client, photos: m.photos, kind: m.kind, signature: m.signature, author: a ? { name: a.firstName, avatarUrl: a.avatarUrl, role: a.role } : undefined };
          })}
          action={staffReplyAction.bind(null, ticket.id)}
          hint="Le client est prévenu par une notification."
        />
        <aside className="h-fit space-y-5 tile p-5 text-sm lg:sticky lg:top-6">
          <div>
            <p className="text-xs text-muted">Client</p>
            <p className="mt-1 font-medium">{client}</p>
            <p className="mt-2 flex items-center gap-2" role="status">
              <span aria-hidden="true" className={`h-2 w-2 rounded-full ${seen.online ? "bg-foreground" : "border border-muted"}`} />
              <span className={seen.online ? "font-medium" : "text-muted"}>{seen.label}</span>
            </p>
            {seen.at && !seen.online && <p className="mt-1 font-mono text-xs text-muted">{day(seen.at)}</p>}
          </div>
          <div className="border-t border-line pt-4">
            <p className="text-xs text-muted">Pris en charge par</p>
            {assignee ? (
              <p className="mt-1 flex flex-wrap items-center gap-2 font-medium">
                {assignee.firstName}
                <span style={roleStyle(assignee.role)} className="rounded-md border px-1.5 py-px font-mono text-[10px] font-semibold uppercase tracking-[0.08em]">
                  {ROLE_META[assignee.role].short}
                </span>
              </p>
            ) : (
              <p className="mt-1 text-muted">Personne pour l&apos;instant : le client attend un agent.</p>
            )}
            <div className="mt-3 flex flex-wrap gap-2">
              {canTake && (
                <form action={claimTicketAction.bind(null, ticket.id)}>
                  <button type="submit" className="h-9 whitespace-nowrap rounded-lg btn-tonal px-3 text-sm font-medium transition-colors">
                    {ticket.assigned_to ? "Reprendre" : "Prendre en charge"}
                  </button>
                </form>
              )}
              {canRelease && (
                <form action={releaseTicketAction.bind(null, ticket.id)}>
                  <button type="submit" className="h-9 whitespace-nowrap rounded-lg border border-line-strong px-3 text-sm transition-colors hover:bg-foreground/10">
                    Libérer
                  </button>
                </form>
              )}
            </div>
          </div>
          <dl className="space-y-3 border-t border-line pt-4">
            <div className="flex justify-between gap-4">
              <dt className="text-muted">Catégorie</dt>
              <dd className="text-right">{categoryLabel(ticket.category)}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-muted">Ouvert le</dt>
              <dd className="text-right">{day(ticket.created_at)}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-muted">Première réponse</dt>
              <dd className="text-right">{firstReply === null ? "En attente" : firstReply < 60 ? `en ${firstReply} min` : `en ${Math.round(firstReply / 60)} h`}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-muted">Messages</dt>
              <dd className="tabular-nums">{messages.length}</dd>
            </div>
            {profile?.support_id && (
              <div className="flex justify-between gap-4">
                <dt className="text-muted">ID support</dt>
                <dd className="font-mono text-xs">{profile.support_id}</dd>
              </div>
            )}
          </dl>
          {profile?.support_id && (
            <Link href={`/admin/comptes?q=${profile.support_id}`} className="inline-block text-foreground underline underline-offset-4">
              Voir le compte
            </Link>
          )}
        </aside>
      </div>
    </DashPage>
  );
}
