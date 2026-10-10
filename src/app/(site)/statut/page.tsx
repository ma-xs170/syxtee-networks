import type { Metadata } from "next";
import PageHero from "@/components/PageHero";
import { Container } from "@/components/ui";
import StatusPill from "@/components/ui/StatusPill";
import { incidents, type IncidentStatus } from "@/lib/incidents";
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
const INCIDENT: Record<IncidentStatus, { text: string; variant: "ok" | "unstable" | "offline" }> = {
  resolved: { text: "Résolu", variant: "ok" },
  monitoring: { text: "Surveillance", variant: "unstable" },
  investigating: { text: "En cours d'analyse", variant: "offline" },
  scheduled: { text: "Planifié", variant: "unstable" },
};
const fmt = (iso: string) => new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium", timeStyle: "short", timeZone: "Europe/Paris" }).format(new Date(iso));
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

      <section className="border-t border-line py-16 sm:py-24">
        <Container>
          <h2 className="h-section">Journal des incidents</h2>
          <p className="mt-3 max-w-2xl text-sm text-muted">Chaque panne et chaque maintenance, avec ce qui s'est passé et quand c'est revenu.</p>
          {incidents.length === 0 ? (
            <p className="mt-8 rounded-xl border border-line bg-surface p-5 text-sm text-muted">Aucun incident à signaler.</p>
          ) : (
            <ol className="mt-8 grid gap-4">
              {incidents.map((i) => (
                <li key={i.id} className="rounded-xl border border-line bg-surface p-5 sm:p-6">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-mono text-[11px] uppercase tracking-[0.08em] text-muted">{i.kind === "maintenance" ? "Maintenance" : "Incident"} · {fmt(i.start)}{i.end ? ` → ${fmt(i.end)}` : ""}</p>
                      <h3 className="mt-1.5 text-base font-semibold">{i.title}</h3>
                    </div>
                    <StatusPill variant={INCIDENT[i.status].variant} label={INCIDENT[i.status].text} />
                  </div>
                  <ul className="mt-4 grid gap-3 border-l border-line pl-4">
                    {i.updates.map((u) => (
                      <li key={u.at}>
                        <p className="font-mono text-xs text-muted">{fmt(u.at)}</p>
                        <p className="mt-0.5 text-sm leading-relaxed">{u.text}</p>
                      </li>
                    ))}
                  </ul>
                </li>
              ))}
            </ol>
          )}
        </Container>
      </section>
    </>
  );
}
