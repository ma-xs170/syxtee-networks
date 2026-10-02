import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { DashPage } from "@/components/dashboard/ui";
import TicketChat from "@/components/support/TicketChat";
import { requireAdmin } from "@/lib/admin";
import { getThread, whoIs } from "@/lib/support";
import { createAdminClient } from "@/lib/supabase/admin";
import { setTicketStatusAction, staffReplyAction } from "../actions";

export const metadata: Metadata = { title: "Admin · Demande", robots: { index: false } };

export default async function AdminTicketPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id } = await params;
  const thread = await getThread(id);
  if (!thread) notFound();
  const { ticket, messages } = thread;
  const authors = await whoIs([ticket.user_id, ...messages.map((m) => m.author_id).filter((x): x is string => !!x)]);
  const client = authors.get(ticket.user_id) ?? "Client";
  const { data: profile } = await createAdminClient().from("profiles").select("support_id").eq("id", ticket.user_id).maybeSingle();

  return (
    <DashPage>
      <Link href="/admin/support" className="text-sm text-muted transition-colors hover:text-foreground">
        ← Support
      </Link>
      <div className="mb-8 mt-4 flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="break-words text-2xl font-semibold tracking-tight sm:text-3xl">{ticket.subject}</h1>
          <p className="mt-2 text-sm text-muted">
            {client}
            {profile?.support_id ? ` · ID support ${profile.support_id}` : ""} · {ticket.status === "resolved" ? "Résolu" : "En cours"}
          </p>
          {profile?.support_id && (
            <Link href={`/admin/comptes?q=${profile.support_id}`} className="mt-2 inline-block text-sm text-foreground underline underline-offset-4">
              Voir le compte
            </Link>
          )}
        </div>
        <form action={setTicketStatusAction.bind(null, ticket.id, ticket.status === "open" ? "resolved" : "open")}>
          <button type="submit" className="h-10 whitespace-nowrap rounded-lg border border-line-strong px-4 text-sm transition-colors hover:bg-foreground/10">
            {ticket.status === "open" ? "Marquer comme résolu" : "Rouvrir"}
          </button>
        </form>
      </div>
      <div className="max-w-3xl">
        <TicketChat
          viewer="staff"
          messages={messages.map((m) => ({ id: m.id, from_staff: m.from_staff, body: m.body, created_at: m.created_at, name: client }))}
          action={staffReplyAction.bind(null, ticket.id)}
          hint="Le client est prévenu par une notification."
        />
      </div>
    </DashPage>
  );
}
