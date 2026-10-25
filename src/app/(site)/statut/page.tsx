import { site } from "@/lib/site";
import type { Metadata } from "next";
import { Container } from "@/components/ui";
import { glow } from "@/lib/glow";
import StatusPill from "@/components/ui/StatusPill";
import { incidents, type IncidentStatus } from "@/lib/incidents";
import { getServices, overall, type Status } from "@/lib/status";

export const metadata: Metadata = {
  title: "État des services",
  description: "L'état en direct du site, de l'API, du relais SRTLA et des comptes SYXTEE NETWORKS.",
  alternates: { canonical: `${site.statusUrl}/statut` },
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

const TONE = { ok: "#1f9d55", unstable: "#e8892b", offline: "var(--bad)" } as const;

export default async function StatusPage() {
  const services = await getServices();
  const state = overall(services);
  const time = new Intl.DateTimeFormat("fr-FR", { dateStyle: "short", timeStyle: "medium", timeZone: "Europe/Paris" }).format(new Date());

  return (
    <>
      {/* 1. État global, centré */}
      <section data-hero data-theme="dark" className="relative isolate overflow-hidden border-b border-line bg-background text-foreground">
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10" style={glow(TONE[state], "50% 0%", 70, 80, 30)} />
        <Container className="pb-20 pt-[calc(5rem+65px)] text-center lg:pb-28 lg:pt-[calc(7rem+65px)]">
          <h1 className="rise h-serif mx-auto max-w-[14ch] text-[clamp(2.75rem,6.5vw,5.5rem)]" style={{ "--i": 0 } as React.CSSProperties}>
            État des <em>services.</em>
          </h1>
          <div className="rise mt-8 flex justify-center" style={{ "--i": 1 } as React.CSSProperties}>
            <StatusPill variant={state} label={HEADLINE[state]} />
          </div>
          <p className="rise mt-4 text-sm text-muted" style={{ "--i": 2 } as React.CSSProperties}>Mesuré le {time}</p>
        </Container>
      </section>

      {/* 2. Les services, en lignes */}
      <section className="py-20 sm:py-28">
        <Container>
          <ul className="mx-auto max-w-3xl divide-y divide-line border-y border-line">
            {services.map((s) => (
              <li key={s.id} className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2 py-6">
                <div className="min-w-0">
                  <h2 className="text-lg font-semibold tracking-tight">{s.name}</h2>
                  <p className="mt-1 text-sm text-muted">{s.desc}{s.detail ? ` · ${s.detail}` : ""}</p>
                </div>
                <div className="flex items-center gap-4">
                  {s.ms != null && <span className="text-sm tabular-nums text-muted">{s.ms} ms</span>}
                  <StatusPill variant={LABEL[s.status].variant} label={LABEL[s.status].text} />
                </div>
              </li>
            ))}
          </ul>
        </Container>
      </section>

      {/* 3. Journal des incidents */}
      <section className="border-t border-line py-20 sm:py-28">
        <Container>
          <h2 className="h-serif mx-auto max-w-3xl text-center text-[clamp(2.25rem,4.5vw,3.5rem)]">Journal des <em>incidents.</em></h2>
          {incidents.length === 0 ? (
            <p className="mt-8 text-center text-muted">Aucun incident à signaler.</p>
          ) : (
            <ol className="mx-auto mt-14 max-w-3xl divide-y divide-line border-y border-line">
              {incidents.map((i) => (
                <li key={i.id} className="py-8">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm text-muted">{i.kind === "maintenance" ? "Maintenance" : "Incident"} · {fmt(i.start)}{i.end ? ` → ${fmt(i.end)}` : ""}</p>
                      <h3 className="mt-1.5 text-lg font-semibold tracking-tight">{i.title}</h3>
                    </div>
                    <StatusPill variant={INCIDENT[i.status].variant} label={INCIDENT[i.status].text} />
                  </div>
                  <ul className="mt-5 grid gap-4 border-l border-line pl-5">
                    {i.updates.map((u) => (
                      <li key={u.at}>
                        <p className="text-xs text-muted">{fmt(u.at)}</p>
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
