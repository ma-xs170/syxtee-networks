import type { Metadata } from "next";
import Link from "next/link";
import { ActivationPending, PortalButton } from "@/components/billing/BillingButtons";
import PlanCards from "@/components/billing/PlanCards";
import { DashHeader, DashPage, Tile, TileLabel } from "@/components/dashboard/ui";
import { getProfile, requireUser } from "@/lib/auth/dal";
import { getPlan } from "@/lib/auth/plan";
import { CATALOG, INTERVALS, canSubscribe, isTier, renews, type Interval } from "@/lib/billing";
import { FEATURES, type Plan } from "@/lib/plans";

export const metadata: Metadata = { title: "Abonnement", robots: { index: false } };

const count = (n: number, one: string, many: string) => (Number.isFinite(n) ? `${n} ${n > 1 ? many : one}` : `${many} illimités`);
const longDate = (iso: string) => new Date(iso).toLocaleDateString("fr-FR", { dateStyle: "long", timeZone: "Europe/Paris" });

const TEXT: Record<Plan["id"], string> = {
  free: "Tu as accès à l'interface et au Scanner réseau. Les relais, l'aperçu, les statistiques et la mire sont réservés aux formules payantes.",
  basic: "Un relais et l'essentiel pour streamer en IRL.",
  beta: "Merci d'être là depuis la bêta : ton accès complet est conservé, sans rien payer. Ta formule inclut déjà tout.",
  paid: "Tout SYXTEE : 5 relais SRTLA + 5 RTMP, 3 flux en même temps.",
  extra: "Tout SYXTEE, sans limite de relais : 10 flux en même temps.",
  partner: "Accès illimité à tout le service, en tant que partenaire SYXTEE. Ta formule inclut déjà tout.",
  admin: "Accès administrateur : tout est illimité.",
};

export default async function AbonnementPage({ searchParams }: { searchParams: Promise<{ paiement?: string }> }) {
  await requireUser("/dashboard/abonnement");
  const [plan, profile, sp] = await Promise.all([getPlan(), getProfile(), searchParams]);
  const p: Partial<NonNullable<typeof profile>> = profile ?? {};
  const subscribed = !!p.billing_status && p.billing_status !== "canceled" && p.billing_status !== "incomplete_expired";
  const waiting = sp.paiement === "ok" && !isTier(plan.id);
  const interval = (p.billing_interval ?? "month") as Interval;
  const sold = isTier(plan.id) ? CATALOG[plan.id] : null;
  const included = plan.id === "free" ? ["Scanner réseau", "Analyseur réseau", "Carte de couverture"] : [count(plan.maxRelays, "relais", "relais"), count(plan.maxConcurrentStreams, "flux simultané", "flux simultanés"), ...plan.features.map((f) => FEATURES[f])];

  return (
    <DashPage>
      <DashHeader lead="Ta" hl="formule" />
      {waiting && <ActivationPending />}

      <div className={`grid items-start gap-4 ${subscribed ? "lg:grid-cols-2" : ""}`}>
        <Tile aria-labelledby="actuelle">
          <TileLabel id="actuelle">Formule actuelle</TileLabel>
          <p className="mt-4 text-3xl font-semibold tracking-tight">{plan.name}</p>
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

        {subscribed ? (
          <Tile aria-labelledby="abonnement">
            <TileLabel id="abonnement">Ton abonnement</TileLabel>
            <p className="mt-4 text-lg font-medium">
              {sold ? `${sold.name} · ` : ""}
              {INTERVALS[interval].label}
              {sold && (
                <>
                  {" "}
                  · {sold.prices[interval].amount} <span className="text-sm font-normal text-muted">{INTERVALS[interval].per}</span>
                </>
              )}
            </p>
            {p.billing_period_end && (
              <p className="mt-2 text-sm text-muted">
                {renews(p) ? `Prochain prélèvement le ${longDate(p.billing_period_end)}.` : `Résilié : accès jusqu'au ${longDate(p.billing_period_end)}.`}
              </p>
            )}
            {p.billing_status === "past_due" && (
              <p role="alert" className="mt-3 text-sm text-red-300">
                Le dernier prélèvement a échoué. Mets ta carte à jour pour garder l&apos;accès.
              </p>
            )}
            <p className="mt-4 text-sm text-muted">Changer de formule, passer en annuel, carte, factures ou résiliation : tout se gère sur Stripe.</p>
            <div className="mt-5">
              <PortalButton />
            </div>
          </Tile>
        ) : null}
      </div>

      {!subscribed && canSubscribe({ plan: plan.id, billing_status: p.billing_status }) && (
        <section aria-labelledby="offres" className="mt-10">
          <h2 id="offres" className="text-xl font-semibold tracking-tight">
            Choisis ta formule
          </h2>
          <p className="mb-6 mt-1 text-sm text-muted">Sans engagement. Tu peux changer de formule ou résilier à tout moment.</p>
          <PlanCards mode="subscribe" />
          <p className="mt-4 text-xs leading-relaxed text-muted">
            Paiement sécurisé par Stripe. Résiliable à tout moment : l&apos;accès reste jusqu&apos;à la fin de la période payée. Voir les{" "}
            <Link href="/cgv" className="underline underline-offset-4 hover:text-foreground">
              CGV
            </Link>
            .
          </p>
        </section>
      )}
    </DashPage>
  );
}
