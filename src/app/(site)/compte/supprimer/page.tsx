import type { Metadata } from "next";
import { DeleteAccountForm } from "@/components/auth/AccountForms";
import Card from "@/components/compte/Card";
import { requireUser } from "@/lib/auth/dal";

export const metadata: Metadata = { title: "Supprimer mon compte", robots: { index: false } };

export default async function SupprimerPage() {
  await requireUser("/compte/supprimer");
  return (
    <Card title="Supprimer mon compte" text="Supprime ton compte, tes relais et tes données. Cette action est définitive." danger>
      <DeleteAccountForm />
    </Card>
  );
}
