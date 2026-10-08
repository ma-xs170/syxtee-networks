import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { DashPage } from "@/components/dashboard/ui";
import TicketChat from "@/components/support/TicketChat";
import { requireUser } from "@/lib/auth/dal";
import { getThread } from "@/lib/support";
import { staffCards } from "@/lib/staff-data";
import { categoryLabel } from "@/lib/support-categories";
import DeleteTicketButton from "@/components/support/DeleteTicketButton";
import { closeTicketAction, deleteTicketAction, replyAction } from "../actions";

export const metadata: Metadata = { title: "Demande de support", robots: { index: false } };

const day = (iso: string) => new Date(iso).toLocaleDateString("fr-FR", { dateStyle: "long", timeZone: "Europe/Paris" });

export default async function TicketPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser(`/dashboard/support/${id}`);
  const thread = await getThread(id, user.id);
  if (!thread) notFound();
  const { ticket, messages } = thread;
  const agents = await staffCards([...messages.filter((m) => m.from_staff).map((m) => m.author_id), ticket.assigned_to].filter((x): x is string => !!x));
  const assignee = ticket.assigned_to ? agents.get(ticket.assigned_to) : undefined;
  const firstReply = ticket.first_reply_at ? Math.max(1, Math.round((Date.parse(ticket.first_reply_at) - Date.parse(ticket.created_at)) / 60_000)) : null;

  return (
    <DashPage>
      <Link href="/dashboard/support" className="text-sm text-muted transition-colors hover:text-foreground">
        ← Support
      </Link>
      <div className="mb-8 mt-4 flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="h-page break-words">{ticket.subject}</h1>
          <p className="mt-2 text-sm text-muted">{categoryLabel(ticket.category)} · {ticket.status === "resolved" ? "Résolu" : "En cours"}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {ticket.status === "open" && (
            <form action={closeTicketAction.bind(null, ticket.id)}>
              <button type="submit" className="h-10 whitespace-nowrap rounded-lg border border-line-strong px-4 text-sm transition-colors hover:bg-foreground/10">
                Marquer comme résolu
              </button>
            </form>
          )}
          <DeleteTicketButton action={deleteTicketAction.bind(null, ticket.id)} />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-10 lg:grid-cols-[minmax(0,1fr)_240px]">
        <TicketChat
          viewer="user"
          messages={messages.map((m) => {
            const a = m.from_staff && m.author_id ? agents.get(m.author_id) : undefined;
            return { id: m.id, from_staff: m.from_staff, body: m.body, created_at: m.created_at, name: "Équipe SYXTEE", photos: m.photos, kind: m.kind, signature: m.signature, author: a ? { name: a.firstName, avatarUrl: a.avatarUrl, role: a.role } : undefined };
          })}
          action={replyAction.bind(null, ticket.id)}
          hint={ticket.status === "resolved" ? "Écrire ici rouvre la demande." : undefined}
        />
        <dl className="h-fit space-y-3 text-sm lg:border-l lg:border-line lg:pl-8">
          <div className="flex justify-between gap-4">
            <dt className="text-muted">Agent</dt>
            <dd className="text-right">{assignee ? assignee.firstName : "En recherche"}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-muted">Ouvert le</dt>
            <dd>{day(ticket.created_at)}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-muted">Première réponse</dt>
            <dd>{firstReply === null ? "En attente" : firstReply < 60 ? `en ${firstReply} min` : `en ${Math.round(firstReply / 60)} h`}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-muted">Messages</dt>
            <dd className="tabular-nums">{messages.length}</dd>
          </div>
          {ticket.resolved_at && (
            <div className="flex justify-between gap-4">
              <dt className="text-muted">Résolu le</dt>
              <dd>{day(ticket.resolved_at)}</dd>
            </div>
          )}
        </dl>
      </div>
    </DashPage>
  );
}
