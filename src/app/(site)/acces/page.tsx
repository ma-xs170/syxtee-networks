import type { Metadata } from "next";
import Link from "next/link";
import AccessForm from "@/components/access/AccessForm";
import Glow from "@/components/landing/Glow";
import { Container } from "@/components/ui";
import GlassIcon from "@/components/ui/GlassIcon";
import GridBackground from "@/components/ui/GridBackground";
import StatusPill from "@/components/ui/StatusPill";
import WordsReveal from "@/components/ui/WordsReveal";

export const metadata: Metadata = {
  title: "Demander l'accès",
  description: "L'ouverture au public arrive bientôt. En attendant, SYXTEE NETWORKS est ouvert aux partenaires : toutes les fonctions du site, sans limite de formule.",
  alternates: { canonical: "/acces" },
};

const included = [
  "10 flux, jusqu'à 5 par protocole : SRTLA et RTMP",
  "Bonding 4G, 5G, eSIM et satellite",
  "Contrôle à distance d'OBS depuis un navigateur",
  "Suivi de la santé du flux et historique des directs",
  "Écran de secours automatique en cas de coupure",
  "Messagerie de support dédiée",
];

const steps = [
  { title: "Tu envoies ta demande", text: "Ta chaîne, ton matériel et ce que tu attends du service." },
  { title: "Nous l'étudions", text: "Si elle est acceptée, tu reçois un e-mail de SYXTEE NETWORKS." },
  { title: "Tu crées ton compte", text: "Un clic dans l'e-mail suffit : ton accès partenaire s'active automatiquement." },
];

export default function AccessPage() {
  return (
    <>
      <Glow />
      <section className="relative -mt-[4.0625rem] overflow-hidden border-b border-line pb-16 pt-[9rem] text-center sm:pb-24 sm:pt-[10.5rem]">
        <GridBackground />
        <Container className="relative">
          <StatusPill variant="dev" label="OUVERTURE PROCHAINE" />
          <h1 className="h-serif mx-auto mt-8 max-w-[14ch] text-[clamp(3rem,8vw,5.5rem)]">
            <WordsReveal text="Demande ton accès." em={["accès."]} />
          </h1>
          <p className="mx-auto mt-6 max-w-[560px] text-base leading-relaxed text-muted sm:text-lg">
            L&apos;ouverture au public approche. En attendant, l&apos;accès est réservé aux partenaires : nous étudions chaque demande avec soin et te répondons par e-mail.
          </p>
          <p className="mt-4 text-sm text-muted">
            Découvre les{" "}
            <Link href="/tarifs" className="text-foreground underline underline-offset-4">
              tarifs
            </Link>{" "}
            prévus à l&apos;ouverture.
          </p>
        </Container>
      </section>

      <section className="py-20 sm:py-28">
        <Container className="grid grid-cols-1 gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:gap-14">
          <div className="grid content-start gap-6">
            <article className="bento-cell p-8 sm:p-10">
              <GlassIcon name="shared" size={64} />
              <p className="mt-8 font-mono text-[11px] uppercase tracking-[0.08em] text-muted">Accès partenaire</p>
              <h2 className="h-serif mt-3 text-[clamp(2rem,4vw,2.75rem)]">Tout le site, sans limite.</h2>
              <p className="mt-4 text-sm leading-relaxed text-muted">Réservé à nos partenaires : toutes les fonctions sont ouvertes, sans formule à choisir.</p>
              <ul className="mt-8 space-y-3.5 border-t border-line pt-8">
                {included.map((f) => (
                  <li key={f} className="flex items-start gap-3 text-sm">
                    <svg viewBox="0 0 16 16" className="mt-0.5 h-4 w-4 shrink-0 text-ok" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d="M3 8.5l3.2 3.2L13 5" />
                    </svg>
                    {f}
                  </li>
                ))}
              </ul>
            </article>

            <ol className="relative grid gap-6 pl-1">
              <span aria-hidden="true" className="absolute bottom-3 left-[15px] top-3 w-px bg-line-strong" />
              {steps.map((s, i) => (
                <li key={s.title} className="relative flex gap-5">
                  <span className="relative z-10 grid h-8 w-8 shrink-0 place-items-center rounded-full border border-line-strong bg-background font-mono text-xs tabular-nums">{i + 1}</span>
                  <div>
                    <p className="text-sm font-medium">{s.title}</p>
                    <p className="mt-1 text-sm leading-relaxed text-muted">{s.text}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>

          <div className="card h-fit !p-6 sm:!p-8">
            <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">Ta demande</h2>
            <p className="mb-8 mt-2 text-sm text-muted">Moins de deux minutes. Aucun compte n&apos;est nécessaire pour l&apos;envoyer.</p>
            <AccessForm />
          </div>
        </Container>
      </section>
    </>
  );
}
