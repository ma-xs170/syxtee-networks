import type { Metadata } from "next";
import { Check } from "@phosphor-icons/react/ssr";
import AccessForm from "@/components/access/AccessForm";
import CloudBackdrop from "@/components/home/CloudBackdrop";
import { Container } from "@/components/ui";
import Highlight from "@/components/ui/Highlight";

export const metadata: Metadata = {
  title: "Demander l'accès",
  description: "SYXTEE NETWORKS est fermé au public pour le moment et ouvert aux partenaires. Remplis la demande : 5 relais par protocole (SRTLA, RTMP, RIST) et toutes les fonctions.",
  alternates: { canonical: "/acces" },
};

const premium = [
  "5 relais par protocole : SRTLA, RTMP, RIST",
  "Bonding 4G, 5G, Wi-Fi et Starlink",
  "SYXTEE COMMUTATEUR, toutes tes caméras sur un écran",
  "Santé du flux, aperçu et historique des lives",
  "Caméras externes (DJI, GoPro) et sortie SRT pour OBS",
  "Secours automatique et support dédié",
];

export default function AccessPage() {
  return (
    <>
      <section data-theme="light" className="relative -mt-[4.75rem] overflow-hidden border-b border-line bg-background pb-16 pt-[9rem] text-foreground sm:pb-20 sm:pt-[10.5rem]">
        <CloudBackdrop />
        <Container className="relative text-center">
          <h1 className="h-hero mx-auto max-w-3xl">
            Demande ton <Highlight>accès.</Highlight>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-base leading-relaxed text-foreground/75 sm:text-lg">
            SYXTEE NETWORKS est fermé au public pour le moment. L&apos;accès est ouvert aux partenaires : on étudie chaque demande et on te répond par email.
          </p>
        </Container>
      </section>

      <section className="border-b border-line py-20 sm:py-24">
        <Container className="grid gap-12 lg:grid-cols-[0.9fr_1.1fr] lg:gap-16">
          <div>
            <div className="relative overflow-hidden rounded-3xl border border-line bg-surface p-7 sm:p-9">
              <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_20%_0%,color-mix(in_srgb,var(--accent)_26%,transparent),transparent_70%)]" />
              <div className="relative">
                <p className="inline-flex rounded-full bg-accent px-3 py-1 text-xs font-medium text-on-accent">Accès Premium partenaire</p>
                <h2 className="mt-4 text-2xl font-semibold tracking-tight sm:text-3xl">Tout est inclus.</h2>
                <p className="mt-3 text-sm leading-relaxed text-muted">Un seul accès, le plus complet du site : pas de formule au rabais, pas de fonction verrouillée.</p>
                <ul className="mt-6 space-y-3">
                  {premium.map((f) => (
                    <li key={f} className="flex items-start gap-3 text-sm">
                      <Check size={18} weight="bold" className="mt-0.5 shrink-0 text-accent" aria-hidden="true" />
                      {f}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
            <ol className="mt-8 space-y-4 text-sm leading-relaxed">
              <li>
                <span className="font-medium">1. Tu envoies ta demande.</span> <span className="text-muted">Ta chaîne, ton matériel, ce que tu cherches.</span>
              </li>
              <li>
                <span className="font-medium">2. On l&apos;étudie à la main.</span> <span className="text-muted">Tu reçois un email de SYXTEE NETWORKS si elle est acceptée.</span>
              </li>
              <li>
                <span className="font-medium">3. Tu crées ton compte.</span> <span className="text-muted">Un clic dans l&apos;email, et ton accès partenaire s&apos;active automatiquement.</span>
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
