import Link from "next/link";
import { getPlan } from "@/lib/auth/plan";
import { getProfile, getUser } from "@/lib/auth/dal";
import { managedOf } from "@/lib/managed";

// Bandeau de formule en haut du dashboard : Gratuit (fonctions verrouillées) ou Partenaire (badge).
export default async function DashboardPlanLayout({ children }: LayoutProps<"/dashboard">) {
  const [plan, profile, user] = await Promise.all([getPlan(), getProfile(), getUser()]);
  const managed = user ? await managedOf(user.id) : null;
  const ends = managed?.expires_at ? new Date(managed.expires_at).toLocaleDateString("fr-FR", { dateStyle: "long", timeZone: "Europe/Paris" }) : null;
  const until = profile?.plan_until ? new Date(profile.plan_until).toLocaleDateString("fr-FR", { dateStyle: "long", timeZone: "Europe/Paris" }) : null;
  return (
    <>
      {ends && (
        <div role="region" aria-label="Compte temporaire" className="border-b border-amber-400/40 bg-amber-400/10">
          <p className="mx-auto flex max-w-[1400px] flex-wrap items-center gap-x-3 gap-y-1 px-4 py-2.5 text-sm sm:px-6">
            <span className="rounded border border-amber-400/60 px-1.5 py-0.5 font-mono text-[10px] font-semibold tracking-[0.14em] text-amber-300">TEMPORAIRE</span>
            <span>Ce compte sera supprimé le {ends}, avec ses relais et ses réglages. Demande à l&apos;équipe SYXTEE de le prolonger pour le garder.</span>
          </p>
        </div>
      )}
      {plan.id === "free" && (
        <div role="region" aria-label="Formule" className="border-b border-line">
          <p className="mx-auto flex max-w-[1400px] flex-wrap items-center gap-x-3 gap-y-1 px-4 py-2.5 text-sm text-muted sm:px-6">
            <span className="text-xs">Accès sur invitation</span>
            <span>Les relais, l&apos;aperçu et Mix en direct s&apos;ouvrent sur invitation.</span>
            <a href="/acces" className="whitespace-nowrap text-foreground underline-offset-4 hover:underline">
              Demander l&apos;accès →
            </a>
          </p>
        </div>
      )}
      {plan.id === "partner" && (
        <div role="region" aria-label="Formule" className="border-b border-line">
          <p className="mx-auto flex max-w-[1400px] flex-wrap items-center gap-3 px-4 py-2.5 text-sm text-muted sm:px-6">
            <span className="rounded border border-foreground/30 px-1.5 py-0.5 font-mono text-[10px] font-semibold tracking-[0.14em] text-foreground">PARTENAIRE</span>
            <span>Accès illimité{until ? ` jusqu'au ${until}` : ""}. Merci de faire partie de l&apos;aventure.</span>
          </p>
        </div>
      )}
      {children}
    </>
  );
}
