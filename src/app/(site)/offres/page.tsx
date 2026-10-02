import type { Metadata } from "next";
import ComingSoon from "@/components/blocks/ComingSoon";
import NextStep from "@/components/NextStep";
import PageHero from "@/components/PageHero";
import { Container, SectionHeader } from "@/components/ui";

export const metadata: Metadata = {
  title: "Accès sur invitation",
  description: "SYXTEE NETWORKS n'a pas d'abonnement : l'accès aux relais et au studio se fait sur invitation, comme le Partner Program. Demande la tienne sur le Discord.",
  alternates: { canonical: "/offres" },
};

const included = [
  { t: "Relais SRTLA, SRT et RTMP", d: "Ton téléphone envoie sa vidéo en bonding sur tes connexions 4G, 5G et Wi-Fi, ou ta caméra en RTMP. Le relais reconstitue un flux stable." },
  { t: "Sortie SRT pour ton OBS", d: "Le flux ressort en SRT, prêt à être ajouté comme source média dans OBS. Tes scènes, overlays et alertes restent chez toi." },
  { t: "SYXTEE STUDIO", d: "Une régie dans le navigateur : scènes, multiview, mixeur audio, enregistrement et diffusion vers Twitch, Kick ou YouTube." },
  { t: "Compatible Moblin, IRL Pro, BELABOX", d: "Tu gardes l'app ou le matériel que tu connais. On fournit l'adresse, tu la colles." },
  { t: "Support Discord", d: "Un ticket, une vraie personne, et de l'aide pour régler ton setup de A à Z." },
];

export default function OffresPage() {
  return (
    <>
      <PageHero kicker="Invitation" title="Un accès sur invitation." crumb="Invitation">
        Pas d&apos;abonnement : les relais et le studio en direct sont ouverts sur invitation, comme le Partner Program.
      </PageHero>

      <section className="border-b border-line py-20 sm:py-24">
        <Container>
          <ComingSoon />
        </Container>
      </section>

      <section className="border-b border-line py-20 sm:py-24">
        <Container className="grid gap-12 lg:grid-cols-[0.8fr_1.2fr]">
          <SectionHeader kicker="Inclus" title="Ce que tu obtiens.">
            L&apos;essentiel pour un live IRL stable, rien de superflu.
          </SectionHeader>
          <ol className="divide-y divide-line border-y border-line">
            {included.map((item, i) => (
              <li key={item.t} className="grid gap-2 py-5 sm:grid-cols-[3rem_1fr]">
                <span className="font-mono text-sm text-muted">{String(i + 1).padStart(2, "0")}</span>
                <div>
                  <p className="text-base font-medium">{item.t}</p>
                  <p className="mt-2 text-sm leading-relaxed text-muted">{item.d}</p>
                </div>
              </li>
            ))}
          </ol>
        </Container>
      </section>

      <NextStep label="Questions fréquentes" href="/faq" />
    </>
  );
}
