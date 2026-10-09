import type { Metadata } from "next";
import Link from "next/link";
import { DashPage } from "@/components/dashboard/ui";
import NewTicketForm from "@/components/support/NewTicketForm";
import { getProfile, requireUser } from "@/lib/auth/dal";
import { getPlan } from "@/lib/auth/plan";

export const metadata: Metadata = { title: "Nouvelle demande", robots: { index: false } };

// Demande d'assistance en deux pages : sujet et informations du compte (préremplies), puis les détails propres au sujet.
export default async function NewTicketPage() {
  const user = await requireUser("/dashboard/support/nouveau");
  const [profile, plan] = await Promise.all([getProfile(), getPlan()]);
  const country = profile?.country ? (new Intl.DisplayNames(["fr"], { type: "region" }).of(profile.country) ?? profile.country) : "";
  const name = [profile?.first_name, profile?.last_name].filter(Boolean).join(" ") || profile?.twitch_display_name || "";
  return (
    <DashPage>
      <Link href="/dashboard/support" className="text-sm text-muted transition-colors hover:text-foreground">
        ← Assistance
      </Link>
      <h1 className="h-page mb-2 mt-4">Nouvelle <em>demande</em></h1>
      <p className="mb-8 max-w-[60ch] text-sm text-muted">Choisis le sujet : le formulaire s&apos;adapte pour qu&apos;on te réponde vite. Tu seras prévenu par une notification et par e-mail.</p>
      <NewTicketForm person={{ name, email: user.email ?? "", supportId: profile?.support_id ?? "", plan: plan.name, country }} />
    </DashPage>
  );
}
