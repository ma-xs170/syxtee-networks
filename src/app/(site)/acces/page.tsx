import type { Metadata } from "next";
import Link from "next/link";
import { Check } from "@/components/icons";
import AccessForm from "@/components/access/AccessForm";
import CloudBackdrop from "@/components/home/CloudBackdrop";
import { Container } from "@/components/ui";
import Highlight from "@/components/ui/Highlight";

export const metadata: Metadata = {
  title: "Demander l'accès",
  description: "L'ouverture au public arrive bientôt. En attendant, SYXTEE NETWORKS est ouvert aux partenaires : toutes les fonctions du site, sans limite de formule.",
  alternates: { canonical: "/acces" },
};

const premium = [
  "10 flux, jusqu'à 5 par protocole : SRTLA, RTMP et RIST",
  "Bonding 4G, 5G, Wi-Fi et Starlink",
  "Contrôle à distance d'OBS depuis un navigateur",
  "Suivi de la santé du flux et historique des directs",
  "Écran de secours automatique en cas de coupure",
  "Messagerie de support dédiée",
];

export default function AccessPage() {
  return (
    <>
      <section data-theme="dark" className="relative -mt-[4.0625rem] overflow-hidden border-b border-line bg-background pb-16 pt-[9rem] text-foreground sm:pb-20 sm:pt-[10.5rem]">
        <CloudBackdrop />
        <Container className="relative text-center">
          <p className="mx-auto mb-6 inline-flex items-center gap-2 rounded-full border border-foreground/25 px-4 py-1.5 font-mono text-xs uppercase tracking-[0.16em]">Ouverture prochaine</p>
          <h1 className="h-hero mx-auto max-w-3xl">
            Demande ton <Highlight>accès.</Highlight>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-base leading-relaxed text-foreground/75 sm:text-lg">
            L&apos;ouverture au public approche. En attendant, l&apos;accès est réservé aux partenaires : nous étudions chaque demande avec soin et te répondons par email.
          </p>
          <p className="mx-auto mt-3 max-w-2xl text-sm text-foreground/70">Découvre les <Link href="/tarifs" className="underline underline-offset-4">tarifs</Link> prévus à l'ouverture.</p>
        </Container>
      </section>

      <section className="border-b border-line py-20 sm:py-24">
        <Container className="grid grid-cols-1 gap-12 lg:grid-cols-[0.9fr_1.1fr] lg:gap-16">
          <div>
            <div className="relative overflow-hidden rounded-3xl border border-line-strong bg-[linear-gradient(160deg,color-mix(in_srgb,var(--foreground)_9%,var(--surface)),var(--surface)_55%)] p-8 shadow-[0_30px_80px_-40px_rgba(0,0,0,0.9)] sm:p-10">
              <div aria-hidden="true" className="pointer-events-none absolute -right-24 -top-24 size-72 rounded-full bg-foreground/10 blur-3xl" />
              <div className="relative">
                <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted">Accès partenaire</p>
                <h2 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">Tout le site, sans limite.</h2>
                <p className="mt-3 text-sm leading-relaxed text-muted">Réservé à nos partenaires, l&apos;accès le plus complet : toutes les fonctions sont ouvertes, sans formule à choisir.</p>
                <ul className="mt-8 space-y-3.5 border-t border-line pt-8">
                  {premium.map((f) => (
                    <li key={f} className="flex items-start gap-3 text-sm">
                      <Check size={18} weight="bold" className="mt-0.5 shrink-0 text-foreground" aria-hidden="true" />
                      {f}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
            <ol className="mt-8 space-y-4 text-sm leading-relaxed">
              <li>
                <span className="font-medium">1. Tu envoies ta demande.</span> <span className="text-muted">Ta chaîne, ton matériel et ce que tu attends du service.</span>
              </li>
              <li>
                <span className="font-medium">2. Nous l&apos;étudions.</span> <span className="text-muted">Si elle est acceptée, tu reçois un email de SYXTEE NETWORKS.</span>
              </li>
              <li>
                <span className="font-medium">3. Tu crées ton compte.</span> <span className="text-muted">Un clic dans l&apos;email suffit : ton accès partenaire s&apos;active automatiquement.</span>
              </li>
            </ol>
          </div>

          <div>
            <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">Ta demande</h2>
            <p className="mb-8 mt-2 text-sm text-muted">Moins de deux minutes. Aucun compte n&apos;est nécessaire pour l&apos;envoyer.</p>
            <AccessForm />
          </div>
        </Container>
      </section>
    </>
  );
}
