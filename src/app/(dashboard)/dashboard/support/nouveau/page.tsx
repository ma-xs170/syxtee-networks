import type { Metadata } from "next";
import Link from "next/link";
import { DashPage } from "@/components/dashboard/ui";
import NewTicketForm from "@/components/support/NewTicketForm";
import { requireUser } from "@/lib/auth/dal";

export const metadata: Metadata = { title: "Nouvelle demande", robots: { index: false } };

export default async function NewTicketPage() {
  await requireUser("/dashboard/support/nouveau");
  return (
    <DashPage>
      <Link href="/dashboard/support" className="text-sm text-muted transition-colors hover:text-foreground">
        ← Assistance
      </Link>
      <h1 className="h-page mb-2 mt-4">Nouvelle <em>demande</em></h1>
      <p className="mb-8 max-w-[60ch] text-sm text-muted">
        Décris ton problème : on te répond ici, dans ce fil, rapidement (généralement sous 24 h). Tu seras prévenu par une notification et par e-mail.
      </p>
      <NewTicketForm />
    </DashPage>
  );
}
