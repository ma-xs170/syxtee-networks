import Link from "next/link";
import { getPlan } from "@/lib/auth/plan";
import { getProfile } from "@/lib/auth/dal";

// Bandeau de formule en haut du dashboard : Gratuit (fonctions verrouillées) ou Partenaire (badge).
export default async function DashboardPlanLayout({ children }: LayoutProps<"/dashboard">) {
  const [plan, profile] = await Promise.all([getPlan(), getProfile()]);
  const until = profile?.plan_until ? new Date(profile.plan_until).toLocaleDateString("fr-FR", { dateStyle: "long", timeZone: "Europe/Paris" }) : null;
  return (
    <>
      {plan.id === "free" && (
        <div role="region" aria-label="Formule" className="border-b border-line">
          <p className="mx-auto flex max-w-[1400px] flex-wrap items-center gap-x-3 gap-y-1 px-4 py-2.5 text-sm text-muted sm:px-6">
            <span className="font-mono text-xs uppercase tracking-wider">Accès sur invitation</span>
            <span>Les relais, l&apos;aperçu et le studio en direct s&apos;ouvrent sur invitation.</span>
            <a href="https://discord.gg/CD68F8yZuZ" target="_blank" rel="noopener noreferrer" className="whitespace-nowrap text-foreground underline-offset-4 hover:underline">
              Demander une invitation →
            </a>
          </p>
        </div>
      )}
      {plan.id === "partner" && (
        <div role="region" aria-label="Formule" className="border-b border-line">
          <p className="mx-auto flex max-w-[1400px] flex-wrap items-center gap-3 px-4 py-2.5 text-sm text-muted sm:px-6">
            <span className="rounded border border-accent/30 px-1.5 py-0.5 font-mono text-[10px] font-semibold tracking-[0.14em] text-foreground">PARTENAIRE</span>
            <span>Accès illimité{until ? ` jusqu'au ${until}` : ""}. Merci de faire partie de l&apos;aventure.</span>
          </p>
        </div>
      )}
      {children}
    </>
  );
}
