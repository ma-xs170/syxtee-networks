import type { Metadata } from "next";
import { DashHeader, DashPage, Tile, TileLabel } from "@/components/dashboard/ui";
import { requireUser } from "@/lib/auth/dal";
import { getPlan } from "@/lib/auth/plan";
import { FEATURES, type Plan } from "@/lib/plans";
import { site } from "@/lib/site";

export const metadata: Metadata = { title: "Mon accès", robots: { index: false } };

// Accès sur invitation : pas d'abonnement ni de paiement. L'accès est attribué depuis l'administration (formule Partenaire, etc.).
// L'adresse /dashboard/abonnement reste, pour ne casser aucun lien.

const count = (n: number, one: string, many: string) => (Number.isFinite(n) ? `${n} ${n > 1 ? many : one}` : `${many} illimités`);

const TEXT: Record<Plan["id"], string> = {
  free: "Ton compte n'a pas encore d'accès aux relais. L'accès est ouvert sur invitation : demande la tienne sur le Discord. En attendant, le Scanner réseau reste ouvert à tous.",
  basic: "Un relais et l'essentiel pour streamer en IRL.",
  beta: "Merci d'être là depuis la bêta : ton accès complet est conservé.",
  paid: "Tout SYXTEE : 5 relais SRTLA + 5 RTMP, 3 flux en même temps.",
  extra: "Tout SYXTEE, sans limite de relais : 10 flux en même temps.",
  partner: "Accès illimité à tout le service, en tant que partenaire SYXTEE.",
  admin: "Accès administrateur : tout est illimité.",
};

export default async function AccesPage() {
  await requireUser("/dashboard/abonnement");
  const plan = await getPlan();
  const included =
    plan.id === "free"
      ? ["Scanner réseau", "Analyseur réseau", "Carte de couverture"]
      : [count(plan.maxRelays, "relais", "relais"), count(plan.maxConcurrentStreams, "flux simultané", "flux simultanés"), ...plan.features.map((f) => FEATURES[f])];

  return (
    <DashPage>
      <DashHeader lead="Ton" hl="accès" sub="Pas d'abonnement : l'accès est ouvert sur invitation." />

      <div className="grid items-start gap-4 lg:grid-cols-[1fr_340px]">
        <Tile aria-labelledby="actuel">
          <TileLabel id="actuel">Accès actuel</TileLabel>
          <p className="mt-4 text-3xl font-semibold tracking-tight">{plan.name}</p>
          <p className="mt-3 max-w-[60ch] text-sm leading-relaxed text-muted">{TEXT[plan.id]}</p>
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

        <Tile aria-labelledby="invitation">
          <TileLabel id="invitation">{plan.id === "free" ? "Demander l'accès" : "Besoin de plus ?"}</TileLabel>
          <p className="mt-4 text-sm leading-relaxed text-muted">
            {plan.id === "free" ? "Écris-nous sur le Discord, avec ton identifiant de support (en bas du dashboard)." : "Plus de relais ou plus de flux simultanés : demande-le sur le Discord."}
          </p>
          <a href={site.discord} target="_blank" rel="noopener noreferrer" className="btn btn-primary mt-5 w-full">
            Ouvrir le Discord
          </a>
        </Tile>
      </div>
    </DashPage>
  );
}
