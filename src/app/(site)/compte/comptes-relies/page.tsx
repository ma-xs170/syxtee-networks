import type { Metadata } from "next";
import ChatAccounts from "@/components/auth/ChatAccounts";
import Card from "@/components/compte/Card";
import { authErrorMessage } from "@/lib/auth/errors";
import { requireUser } from "@/lib/auth/dal";

export const metadata: Metadata = { title: "Comptes reliés", robots: { index: false } };

export default async function ComptesReliesPage({ searchParams }: PageProps<"/compte/comptes-relies">) {
  await requireUser("/compte/comptes-relies");
  const { erreur } = await searchParams;
  const error = authErrorMessage(typeof erreur === "string" ? erreur : null);
  return (
    <Card title="Comptes reliés" text="Relie YouTube, Twitch et Kick pour lire et écrire dans ton Multichat. Rien à saisir : ta chaîne est reprise du compte relié.">
      {error && (
        <p role="alert" className="mb-4 rounded-xl border border-bad/30 px-4 py-3 text-sm text-bad">
          {error}
        </p>
      )}
      <ChatAccounts />
    </Card>
  );
}
