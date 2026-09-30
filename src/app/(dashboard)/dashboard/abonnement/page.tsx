import type { Metadata } from "next";
import Link from "next/link";
import { ActivationPending, PortalButton, SubscribeButton } from "@/components/billing/BillingButtons";
import { DashHeader, DashPage, Tile, TileLabel } from "@/components/dashboard/ui";
import { getProfile, requireUser } from "@/lib/auth/dal";
import { getPlan } from "@/lib/auth/plan";
import { PRICES, canSubscribe, renews, type Interval } from "@/lib/billing";
import { FEATURES, type Plan } from "@/lib/plans";

export const metadata: Metadata = { title: "Abonnement", robots: { index: false } };

const count = (n: number, one: string, many: string) => (Number.isFinite(n) ? `${n} ${n > 1 ? many : one}` : `${many} illimités`);
const longDate = (iso: string) => new Date(iso).toLocaleDateString("fr-FR", { dateStyle: "long", timeZone: "Europe/Paris" });

const TEXT: Record<Plan["id"], string> = {
  free: "Tu as accès à l'interface et au Scanner réseau. Les relais, l'aperçu, les statistiques et la mire sont réservés à la formule Payant.",
  beta: "Merci d'être là depuis la bêta : ton accès complet est conservé, sans rien payer. Ta formule inclut déjà tout.",
  paid: "Accès à tout le service : 3 relais, 3 flux en même temps.",
  partner: "Accès illimité à tout le service, en tant que partenaire SYXTEE. Ta formule inclut déjà tout.",
  admin: "Accès administrateur : tout est illimité.",
};

export default async function AbonnementPage({ searchParams }: { searchParams: Promise<{ paiement?: string }> }) {
  await requireUser("/dashboard/abonnement");
  const [plan, profile, sp] = await Promise.all([getPlan(), getProfile(), searchParams]);
  const p: Partial<NonNullable<typeof profile>> = profile ?? {};
  const subscribed = !!p.billing_status && p.billing_status !== "canceled" && p.billing_status !== "incomplete_expired";
  const waiting = sp.paiement === "ok" && plan.id !== "paid";
  const included = plan.id === "free" ? ["Scanner réseau", "Analyseur réseau", "Carte de couverture"] : [count(plan.maxRelays, "relais", "relais"), count(plan.maxConcurrentStreams, "flux simultané", "flux simultanés"), ...plan.features.map((f) => FEATURES[f])];

  return (
    <DashPage>
      <DashHeader lead="Ta" hl="formule" />
      {waiting && <ActivationPending />}

      <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
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
              {PRICES[(p.billing_interval ?? "month") as Interval].label} · {PRICES[(p.billing_interval ?? "month") as Interval].amount}{" "}
              <span className="text-sm font-normal text-muted">{PRICES[(p.billing_interval ?? "month") as Interval].per}</span>
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
            <p className="mt-4 text-sm text-muted">Carte, passage en annuel, factures ou résiliation : tout se gère sur Stripe.</p>
            <div className="mt-5">
              <PortalButton />
            </div>
          </Tile>
        ) : canSubscribe({ plan: plan.id, billing_status: p.billing_status }) ? (
          <section aria-labelledby="offres" className="rounded-2xl border border-line p-5 sm:p-6">
            <h2 id="offres" className="font-mono text-xs uppercase tracking-[0.15em] text-foreground">
              Passer en Payant
            </h2>
            <p className="mt-3 text-sm text-muted">Relais SRTLA et RTMP, aperçu, santé du flux, historique et mire de coupure. Sans engagement.</p>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              {(["month", "year"] as Interval[]).map((i) => (
                <div key={i} className={`flex flex-col rounded-2xl border p-5 ${i === "year" ? "border-white/40" : "border-line"}`}>
                  <p className="flex items-center justify-between gap-2 text-sm">
                    {PRICES[i].label}
                    {PRICES[i].note && <span className="rounded border border-line px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-[0.12em] text-muted">{PRICES[i].note}</span>}
                  </p>
                  <p className="mt-3 text-3xl font-semibold tracking-tight">{PRICES[i].amount}</p>
                  <p className="mb-5 text-sm text-muted">{PRICES[i].per}</p>
                  <div className="mt-auto">
                    <SubscribeButton interval={i} primary={i === "year"} />
                  </div>
                </div>
              ))}
            </div>
            <p className="mt-4 text-xs leading-relaxed text-muted">
              Paiement sécurisé par Stripe. Résiliable à tout moment : l&apos;accès reste jusqu&apos;à la fin de la période payée. Voir les{" "}
              <Link href="/cgv" className="underline underline-offset-4 hover:text-foreground">
                CGV
              </Link>
              .
            </p>
          </section>
        ) : null}
      </div>
    </DashPage>
  );
}
