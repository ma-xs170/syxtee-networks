import type { Metadata } from "next";
import Link from "next/link";
import { DashHeader, DashPage, SectionTabs } from "@/components/dashboard/ui";
import CopyCode from "@/components/CopyCode";
import { requireUser } from "@/lib/auth/dal";
import { getMyApplication, listMyCampaigns, SPONSOR_CATEGORIES } from "@/lib/sponsors";
import ApplyForm from "./ApplyForm";

export const metadata: Metadata = { title: "Sponsors", robots: { index: false } };

const label = "font-mono text-[11px] uppercase tracking-[0.14em] text-muted";

export default async function SponsorsPage({ searchParams }: { searchParams: Promise<{ vue?: string }> }) {
  const user = await requireUser("/dashboard/sponsors");
  const { vue } = await searchParams;
  const view = vue === "entreprise" ? "entreprise" : "streamer";
  const [app, campaigns] = await Promise.all([getMyApplication(user.id), listMyCampaigns(user.id)]);
  const open = !app || app.status === "rejected";

  return (
    <DashPage>
      <DashHeader lead="Réseau de" hl="sponsors" sub="Des marques qui sponsorisent des streamers IRL. Accès sur candidature." />
      <SectionTabs label="Vue" current={view === "streamer" ? "/dashboard/sponsors" : "/dashboard/sponsors?vue=entreprise"} tabs={[{ label: "Streamer", href: "/dashboard/sponsors" }, { label: "Entreprise", href: "/dashboard/sponsors?vue=entreprise" }]} />

      {view === "streamer" ? (
        <div className="grid gap-6 lg:grid-cols-2">
          <section className="tile p-4 sm:p-6">
            <p className={label}>Comment ça marche</p>
            <ol className="mt-4 space-y-3 text-sm leading-relaxed text-muted">
              <li><span className="text-foreground">1. Candidature.</span> Tu choisis les catégories de marques qui te parlent. L&apos;équipe valide ton profil.</li>
              <li><span className="text-foreground">2. Campagne.</span> Une fois accepté, on t&apos;attribue des campagnes : logo discret dans un coin du live et message épinglé dans le chat.</li>
            </ol>
          </section>

          <section className="tile p-4 sm:p-6">
            <p className={label}>Ma candidature</p>
            {app && app.status === "pending" && <p className="mt-4 text-sm">Demande envoyée ! L&apos;équipe te répond par e-mail.</p>}
            {app && app.status === "approved" && <p className="mt-4 text-sm">Candidature acceptée. Tes campagnes apparaissent ci-dessous.</p>}
            {app && app.status === "rejected" && <p className="mt-4 text-sm text-muted">Candidature refusée pour l&apos;instant. Tu peux la renvoyer mise à jour.</p>}
            {open && <ApplyForm categories={SPONSOR_CATEGORIES} />}
          </section>

          {app?.status === "approved" && (
            <section className="tile p-4 sm:p-6 lg:col-span-2">
              <p className={label}>Mes campagnes</p>
              {campaigns.length === 0 ? (
                <p className="mt-4 text-sm text-muted">Aucune campagne attribuée pour le moment.</p>
              ) : (
                <ul className="mt-4 grid gap-4 sm:grid-cols-2">
                  {campaigns.map((c) => (
                    <li key={c.id} className="rounded-xl border border-line p-4">
                      <p className="font-semibold">{c.brand}</p>
                      {c.category && <p className="mt-1 font-mono text-[11px] uppercase tracking-wider text-muted">{c.category}</p>}
                      {c.pinned_message && <p className="mt-3 text-sm leading-relaxed">{c.pinned_message}</p>}
                      {c.link && <a href={c.link} target="_blank" rel="noopener noreferrer" className="mt-3 inline-block break-all text-sm underline underline-offset-4">{c.link}</a>}
                      {c.code && <div className="mt-3"><CopyCode code={c.code} /></div>}
                    </li>
                  ))}
                </ul>
              )}
            </section>
          )}
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-2">
          <section className="tile p-4 sm:p-6">
            <p className={label}>Pour les marques</p>
            <p className="mt-4 text-sm leading-relaxed text-muted">Touchez une audience qui regarde de vrais lives en mobilité, sans pub intrusive.</p>
            <ul className="mt-4 space-y-3 text-sm leading-relaxed">
              <li>Logo discret dans un coin du live, via une source navigateur.</li>
              <li>Message sponsorisé épinglé dans le chat, avec lien et code de parrainage.</li>
            </ul>
          </section>
          <section className="tile p-4 sm:p-6">
            <p className={label}>Nous contacter</p>
            <p className="mt-4 text-sm leading-relaxed text-muted">Décris ta marque et ton objectif : on te propose les streamers adaptés.</p>
            <Link href="/contact" className="mt-4 inline-flex h-11 items-center justify-center whitespace-nowrap rounded-full btn-tonal px-5 text-sm font-medium">Écrivez-nous</Link>
          </section>
        </div>
      )}
    </DashPage>
  );
}
