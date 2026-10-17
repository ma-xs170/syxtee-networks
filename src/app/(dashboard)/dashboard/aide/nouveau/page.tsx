import type { Metadata } from "next";
import Link from "next/link";
import { DashPage } from "@/components/dashboard/ui";
import NewTicketForm from "@/components/support/NewTicketForm";
import { requireUser } from "@/lib/auth/dal";

export const metadata: Metadata = { title: "Nouvelle demande", robots: { index: false } };

// Demande d'assistance : une seule page, thème + message + photos. Le compte est rattaché automatiquement.
export default async function NewTicketPage() {
  await requireUser("/dashboard/aide/nouveau");
  return (
    <DashPage>
      <Link href="/dashboard/aide" className="text-sm text-muted transition-colors hover:text-foreground">
        ← Support
      </Link>
      <h1 className="h-page mb-8 mt-4">Nouvelle <em>demande</em></h1>
      <NewTicketForm />
    </DashPage>
  );
}
