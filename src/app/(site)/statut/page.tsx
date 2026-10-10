import type { Metadata } from "next";
import PageHero from "@/components/PageHero";
import { Container } from "@/components/ui";
import StatusPill from "@/components/ui/StatusPill";
import { getServices, overall, type Status } from "@/lib/status";

export const metadata: Metadata = {
  title: "État des services",
  description: "L'état en direct du site, de l'API, du relais SRT / SRTLA et des comptes SYXTEE NETWORKS.",
  alternates: { canonical: "/statut" },
};

// Mesures prises depuis le serveur, rafraîchies au plus toutes les 30 s.
export const revalidate = 30;

const LABEL: Record<Status, { text: string; variant: "ok" | "unstable" | "offline" }> = {
  up: { text: "En ligne", variant: "ok" },
  slow: { text: "Lent", variant: "unstable" },
  down: { text: "Hors ligne", variant: "offline" },
};
const HEADLINE = { ok: "Tous les systèmes opérationnels", unstable: "Certains services sont lents", offline: "Un service est hors ligne" } as const;

export default async function StatusPage() {
  const services = await getServices();
  const state = overall(services);
  const time = new Intl.DateTimeFormat("fr-FR", { dateStyle: "short", timeStyle: "medium", timeZone: "Europe/Paris" }).format(new Date());

  return (
    <>
      <PageHero kicker="État" title={<>État des <em>services.</em></>} crumb="État des services">
        <span className="flex flex-wrap items-center gap-3">
          <StatusPill variant={state} label={HEADLINE[state]} />
          <span className="font-mono text-xs text-muted">Mesuré le {time}</span>
        </span>
      </PageHero>
      <section className="py-16 sm:py-24">
        <Container>
          <ul className="grid gap-3">
            {services.map((s) => (
              <li key={s.id} className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2 rounded-xl border border-line bg-surface p-5">
                <div className="min-w-0">
                  <h2 className="text-base font-semibold">{s.name}</h2>
                  <p className="mt-1 text-sm text-muted">{s.desc}{s.detail ? ` · ${s.detail}` : ""}</p>
                </div>
                <div className="flex items-center gap-4">
                  {s.ms != null && <span className="font-mono text-xs tabular-nums text-muted">{s.ms} ms</span>}
                  <StatusPill variant={LABEL[s.status].variant} label={LABEL[s.status].text} />
                </div>
              </li>
            ))}
          </ul>
          <p className="mt-6 max-w-2xl text-sm text-muted">Un souci qui n'apparaît pas ici ? Écris-nous depuis l'assistance du site, on regarde.</p>
        </Container>
      </section>
    </>
  );
}
