import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { DashPage } from "@/components/dashboard/ui";
import TicketChat from "@/components/support/TicketChat";
import { requireUser } from "@/lib/auth/dal";
import { getThread } from "@/lib/support";
import { closeTicketAction, replyAction } from "../actions";

export const metadata: Metadata = { title: "Demande de support", robots: { index: false } };

const day = (iso: string) => new Date(iso).toLocaleDateString("fr-FR", { dateStyle: "long", timeZone: "Europe/Paris" });

export default async function TicketPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser(`/dashboard/support/${id}`);
  const thread = await getThread(id, user.id);
  if (!thread) notFound();
  const { ticket, messages } = thread;
  const firstReply = ticket.first_reply_at ? Math.max(1, Math.round((Date.parse(ticket.first_reply_at) - Date.parse(ticket.created_at)) / 60_000)) : null;

  return (
    <DashPage>
      <Link href="/dashboard/support" className="text-sm text-muted transition-colors hover:text-foreground">
        ← Support
      </Link>
      <div className="mb-8 mt-4 flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="break-words text-2xl font-semibold tracking-tight sm:text-3xl">{ticket.subject}</h1>
          <p className="mt-2 text-sm text-muted">{ticket.status === "resolved" ? "Résolu" : "En cours"}</p>
        </div>
        {ticket.status === "open" && (
          <form action={closeTicketAction.bind(null, ticket.id)}>
            <button type="submit" className="h-10 whitespace-nowrap rounded-lg border border-line-strong px-4 text-sm transition-colors hover:bg-foreground/10">
              Marquer comme résolu
            </button>
          </form>
        )}
      </div>

      <div className="grid grid-cols-1 gap-10 lg:grid-cols-[minmax(0,1fr)_240px]">
        <TicketChat
          viewer="user"
          messages={messages.map((m) => ({ id: m.id, from_staff: m.from_staff, body: m.body, created_at: m.created_at, name: "Équipe SYXTEE" }))}
          action={replyAction.bind(null, ticket.id)}
          hint={ticket.status === "resolved" ? "Écrire ici rouvre la demande." : undefined}
        />
        <dl className="h-fit space-y-3 text-sm lg:border-l lg:border-line lg:pl-8">
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
