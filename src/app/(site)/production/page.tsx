import type { Metadata } from "next";
import Link from "next/link";
import PageHero from "@/components/PageHero";
import { Container } from "@/components/ui";
import { ButtonLink } from "@/components/ui/Button";
import { site } from "@/lib/site";

export const metadata: Metadata = {
  title: "Production de live IRL",
  description: "Régie, cadreurs IRL et relais SRTLA pour diffuser ton événement depuis n'importe où. Équipe basée en Guadeloupe, devis gratuit.",
  alternates: { canonical: "/production" },
};

const OFFERS = [
  { title: "Régie en direct", text: "Un régisseur pilote OBS, les scènes, l'audio et la diffusion multi-plateformes pendant que tu es sur le terrain." },
  { title: "Cadreurs IRL", text: "Des vidéastes formés au live en mobilité, à l'épaule ou sur gimbal. Ils connaissent les foules, les contraintes de réseau et le rythme d'un direct." },
  { title: "Relais SRTLA dédiés", text: "Plusieurs connexions cumulées vers nos serveurs : ton direct reste stable là où une seule antenne lâcherait." },
  { title: "Réseau et supervision", text: "On suit le débit de chaque connexion en direct et on corrige avant que le public le voie." },
];

const STEPS = [
  { n: "1", title: "Tu décris ton événement", text: "Date, lieu, nombre de caméras, plateformes. Un message suffit." },
  { n: "2", title: "On te propose un devis", text: "Une proposition claire, gratuite et sans engagement, avec ce qui est inclus." },
  { n: "3", title: "On s'en charge", text: "L'équipe prépare, diffuse et suit le direct. Tu reçois le retour de fin de live." },
];

export default function ProductionPage() {
  return (
    <>
      <PageHero title={<>Ton live IRL, <em>produit pour toi.</em></>} crumb="Production">
        Des équipes de production basées en Guadeloupe, dans la Caraïbe française, qui diffusent partout dans le monde. Sur devis.
      </PageHero>

      <section className="border-b border-line py-20 lg:py-28">
        <Container>
          <h2 className="h-serif text-[clamp(2.25rem,4.5vw,3.5rem)]">Ce qu&apos;on <em>fait.</em></h2>
          <div className="mt-10 grid gap-4 md:grid-cols-2">
            {OFFERS.map((o) => (
              <article key={o.title} className="bento-cell p-6 sm:p-7">
                <h3 className="text-lg font-semibold tracking-tight">{o.title}</h3>
                <p className="mt-2 max-w-[54ch] text-sm leading-relaxed text-muted">{o.text}</p>
              </article>
            ))}
          </div>
        </Container>
      </section>

      <section className="border-b border-line py-20 lg:py-28">
        <Container>
          <h2 className="h-serif text-[clamp(2.25rem,4.5vw,3.5rem)]">Comment ça <em>se passe.</em></h2>
          <ol className="mt-10 grid gap-4 md:grid-cols-3">
            {STEPS.map((s) => (
              <li key={s.n} className="bento-cell p-6 sm:p-7">
                <span className="font-mono text-sm text-muted">{s.n}</span>
                <h3 className="mt-3 text-lg font-semibold tracking-tight">{s.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted">{s.text}</p>
              </li>
            ))}
          </ol>
        </Container>
      </section>

      <section className="py-20 lg:py-28">
        <Container className="text-center">
          <h2 className="h-serif mx-auto max-w-3xl text-[clamp(2.25rem,5vw,3.75rem)]">Parle-nous de ton <em>événement.</em></h2>
          <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <ButtonLink href="/contact">Demander une production IRL</ButtonLink>
            <ButtonLink href={site.videastesUrl} variant="secondary" external>Annuaire des vidéastes</ButtonLink>
          </div>
          <p className="mt-6 text-sm text-muted">
            Tu streames seul ? <Link href="/tarifs" className="text-foreground underline underline-offset-4">Voir les outils et les tarifs</Link>.
          </p>
        </Container>
      </section>
    </>
  );
}
