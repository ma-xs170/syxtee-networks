import type { Metadata } from "next";
import CloserLook from "@/components/encoder/CloserLook";
import EncoderViewer from "@/components/encoder/EncoderViewer";
import HowItWorks from "@/components/encoder/HowItWorks";
import Scenes from "@/components/encoder/Scenes";
import Strengths from "@/components/encoder/Strengths";
import Glow from "@/components/landing/Glow";
import { Container } from "@/components/ui";
import { ButtonLink } from "@/components/ui/Button";
import CloudBackdrop from "@/components/home/CloudBackdrop";
import SectionHeader from "@/components/ui/SectionHeader";
import WordsReveal from "@/components/ui/WordsReveal";
import { ctaLabel, product } from "@/config/product";

export const metadata: Metadata = {
  title: "Encodeur",
  description: "SYXTEE Encodeur, à venir : un boîtier à petit prix où tu branches ta caméra en HDMI. Il diffuse ton direct en 4G, 5G et satellite, sur terre, en mer ou en hélicoptère.",
  alternates: { canonical: "/encodeur" },
};

export default function EncodeurPage() {
  return (
    <>
      <Glow />
      {/* Présentation : nom, titre en bas à gauche, boîtier au centre, prix et bouton en pastille en bas à droite */}
      <section data-theme="dark" id="presentation" className="relative -mt-[4.0625rem] flex min-h-dvh scroll-mt-20 flex-col overflow-hidden border-b border-line bg-background text-foreground">
        <CloudBackdrop />
        <Container className="relative flex flex-1 flex-col pb-10 pt-[5.5rem] sm:pb-14">
          <div className="flex flex-1 items-center justify-center">
            <div className="w-full max-w-3xl"><EncoderViewer className="h-[320px] sm:h-[400px] lg:h-[min(48dvh,460px)]" /></div>
          </div>
          <div className="mt-10 flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-lg font-medium">{product.name}</p>
              <h1 className="h-serif mt-2 max-w-[14ch] text-[clamp(2.75rem,7vw,5rem)]">
                <WordsReveal text="Branche. Diffuse. N'importe où." em={["N'importe", "où."]} />
              </h1>
              <p className="mt-4 max-w-md text-base leading-relaxed text-foreground/85">{product.tagline}</p>
            </div>
            <div className="flex shrink-0 items-center gap-4 self-start rounded-full bg-foreground/10 py-2 pl-6 pr-2 backdrop-blur lg:self-auto">
              <span className="text-sm"><span className="font-medium">{product.priceLabel(product.price)}</span> <span className="font-mono text-[11px] uppercase tracking-[0.08em] text-muted">À venir</span></span>
              <ButtonLink href="/acces" className="whitespace-nowrap">{ctaLabel(product.availability)}</ButtonLink>
            </div>
          </div>
        </Container>
      </section>

      {/* Fonctionnement */}
      <section id="fonctionnement" className="scroll-mt-20 py-24 sm:py-32">
        <Container>
          <h2 className="h-serif max-w-[16ch] text-[clamp(2.25rem,5vw,3.5rem)]">Comment ça <em>marche.</em></h2>
          <p className="mt-5 max-w-xl text-base leading-relaxed text-muted">Une caméra, plusieurs réseaux, un seul direct stable. C&apos;est le principe d&apos;un TVU, en version accessible.</p>
          <div className="mt-12"><HowItWorks /></div>
        </Container>
      </section>

      {/* Points forts */}
      <section id="points-forts" className="scroll-mt-20 pb-24 sm:pb-32">
        <Container>
          <h2 className="h-serif mb-10 text-[clamp(2.25rem,5vw,3.5rem)]">Points forts.</h2>
          <Strengths />
        </Container>
      </section>

      {/* De plus près */}
      <section id="de-plus-pres" className="scroll-mt-20 pb-24 sm:pb-32">
        <Container>
          <h2 className="h-serif mb-10 text-[clamp(2.25rem,5vw,3.5rem)]">De plus près.</h2>
          <CloserLook />
        </Container>
      </section>

      {/* Partout */}
      <section id="partout" className="scroll-mt-20 border-t border-line py-24 sm:py-32">
        <Container>
          <SectionHeader icon="health" title={<>Il marche <em>n&apos;importe où.</em></>} subtitle="Le boîtier diffuse dès qu'il capte un réseau mobile ou un ciel dégagé pour le satellite. Pas besoin de Wi-Fi, ni de câble, ni d'installation." />
          <Scenes />
          <p className="mx-auto mt-8 max-w-2xl text-center text-sm leading-relaxed text-muted">Sur un bateau ou dans un hélicoptère, branche un terminal satellite en Ethernet : l&apos;Encodeur prend le relais quand la 4G et la 5G s&apos;arrêtent.</p>
        </Container>
      </section>

      {/* Livraison */}
      <section id="livraison" className="scroll-mt-20 border-t border-line py-20 sm:py-24">
        <Container>
          <div className="bento-cell mx-auto max-w-3xl p-8 text-center">
            <p className="font-mono text-[11px] uppercase tracking-[0.08em] text-muted">Livraison</p>
            <ul className="mt-5 flex flex-wrap justify-center gap-x-8 gap-y-3 text-base">
              {product.shipping.map((c) => (
                <li key={c.cc} className="flex items-center gap-2"><span aria-hidden="true" className="text-2xl">{c.flag}</span>{c.name}</li>
              ))}
            </ul>
            <p className="mt-5 text-sm text-muted">Livraison uniquement dans ces quatre territoires.</p>
          </div>
        </Container>
      </section>
    </>
  );
}
