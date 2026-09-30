import type { Metadata } from "next";
import { ArrowLink, DashHeader, DashPage, Tile, TileLabel } from "@/components/dashboard/ui";
import { getProfile, requireUser } from "@/lib/auth/dal";
import { getPlan } from "@/lib/auth/plan";
import { FEATURES, type Plan } from "@/lib/plans";

export const metadata: Metadata = { title: "Abonnement", robots: { index: false } };

const count = (n: number, one: string, many: string) => (Number.isFinite(n) ? `${n} ${n > 1 ? many : one}` : `${many} illimités`);

const TEXT: Record<Plan["id"], string> = {
  free: "Tu as accès à l'interface et au Scanner réseau. Les relais, l'aperçu, les statistiques et la mire sont réservés aux formules payantes.",
  beta: "Merci d'être là depuis la bêta : ton accès complet est conservé.",
  paid: "Accès à tout le service, dans les limites de ta formule.",
  partner: "Accès illimité à tout le service, en tant que partenaire SYXTEE.",
  admin: "Accès administrateur : tout est illimité.",
};

export default async function AbonnementPage() {
  await requireUser("/dashboard/abonnement");
  const [plan, profile] = await Promise.all([getPlan(), getProfile()]);
  const until = profile?.plan_until ? new Date(profile.plan_until).toLocaleDateString("fr-FR", { dateStyle: "long", timeZone: "Europe/Paris" }) : null;
  const included = plan.id === "free" ? ["Scanner réseau", "Analyseur réseau", "Carte de couverture"] : [count(plan.maxRelays, "relais", "relais"), count(plan.maxConcurrentStreams, "flux simultané", "flux simultanés"), ...plan.features.map((f) => FEATURES[f])];

  return (
    <DashPage>
      <DashHeader lead="Ta" hl="formule" />
      <div className="grid gap-4 lg:grid-cols-3">
        <Tile className="lg:col-span-2">
          <TileLabel>Formule actuelle</TileLabel>
          <p className="mt-4 text-3xl font-semibold tracking-tight">{plan.name}</p>
          {until && plan.id !== "free" && <p className="mt-1 text-sm text-muted">Jusqu&apos;au {until}</p>}
          <p className="mt-3 max-w-[60ch] text-sm text-muted">{TEXT[plan.id]}</p>
          <ul className="mt-6 grid gap-2 sm:grid-cols-2">
            {included.map((i) => (
              <li key={i} className="flex gap-3 text-sm">
                <span aria-hidden="true" className="text-muted">
                  +
                </span>
                {i}
              </li>
            ))}
          </ul>
        </Tile>
        <Tile>
          <TileLabel>{plan.id === "free" ? "Passer à la formule payante" : "Les offres"}</TileLabel>
          <p className="mt-4 text-sm leading-relaxed text-muted">
            {plan.id === "free" ? "Relais SRTLA et RTMP, aperçu, santé du flux, historique et mire de coupure." : "Plusieurs flux, relais dédiés et régie : compare les formules."}
          </p>
          <div className="mt-5">
            <ArrowLink href="/offres">Voir les offres</ArrowLink>
          </div>
        </Tile>
      </div>
    </DashPage>
  );
}
