import type { Metadata } from "next";
import Link from "next/link";
import StudioWire from "@/components/illustrations/StudioWire";
import StudioDemo from "@/components/studio/StudioDemo";
import CloudBackdrop from "@/components/home/CloudBackdrop";
import NextStep from "@/components/NextStep";
import { Container } from "@/components/ui";
import Highlight from "@/components/ui/Highlight";

export const metadata: Metadata = {
  title: "SYXTEE COMMUTATEUR",
  description: "Une régie de diffusion dans ton navigateur : scènes, multiview, mixeur audio, secours automatique si l'image se fige et mode podcast qui suit la voix.",
  alternates: { canonical: "/syxtee-mix" },
};

const cta =
  "inline-flex h-12 items-center justify-center gap-3 whitespace-nowrap rounded-xl px-7 text-base font-medium transition-[background-color,transform] active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground";

const features = [
  { title: "Scènes et sources", text: "Tes relais SYXTEE, une webcam, un micro, une capture d'écran, des images, du texte. Tu déplaces tout à la souris, avec aperçu et programme comme sur OBS.", wide: true },
  { title: "Mixeur audio", text: "Un curseur et un niveau en direct par source, une coupure en un clic, et l'écoute de la sortie.", wide: true },
  { title: "Secours automatique", text: "Si l'image d'un flux se fige, le commutateur bascule seul sur ta scène de secours. Il revient quand l'image repart." },
  { title: "Mode podcast", text: "Plusieurs flux alignés en image et en son, même avec une latence haute. La scène suit celui qui parle." },
  { title: "Diffusion et enregistrement", text: "Ton programme part en direct vers Twitch, Kick ou YouTube, ou s'enregistre dans un fichier, sans rien installer." },
];

export default function StudioPage() {
  return (
    <>
      <section data-theme="light" className="relative -mt-[4.75rem] overflow-hidden border-b border-line bg-background text-foreground">
        <CloudBackdrop />
        <Container className="relative pb-16 pt-[8.5rem] sm:pb-24 sm:pt-[10rem]">
          <div className="mx-auto max-w-3xl text-center">
            <h1 className="rise h-hero">
              Ta régie, <Highlight>dans le navigateur.</Highlight>
            </h1>
            <p className="rise mx-auto mt-6 max-w-xl text-base leading-relaxed text-foreground/75 sm:text-lg" style={{ "--i": 1 } as React.CSSProperties}>
              Une vraie régie de diffusion, sans OBS. Compose tes scènes et laisse le commutateur gérer les coupures.
            </p>
            <div className="rise mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row" style={{ "--i": 2 } as React.CSSProperties}>
              <span className={`${cta} border border-foreground/20 bg-background/60 font-mono text-sm uppercase tracking-[0.14em] text-foreground/70`}>À venir</span>
              <Link href="/acces" className={`${cta} border border-foreground/20 bg-background/60 text-foreground backdrop-blur-sm hover:bg-background/90`}>
                Demander l'accès
              </Link>
            </div>
          </div>
          <div className="mx-auto mt-14 max-w-5xl">
            <StudioDemo />
          </div>
        </Container>
      </section>

      <section className="bg-field border-b border-line py-20">
        <Container className="grid grid-cols-1 items-center gap-12 lg:grid-cols-[0.9fr_1.1fr]">
          <div>
            <h2 className="h-section">
              Un multiview de régie TV.
            </h2>
            <p className="mt-5 max-w-[52ch] text-base leading-relaxed text-muted">
              Aperçu et programme en grand, toutes tes scènes en vignettes vivantes, l&apos;heure, le format et l&apos;enregistrement. Tally vert pour ce qui est prêt, rouge pour ce qui est à l&apos;antenne.
            </p>
          </div>
          <div className="panel-lg p-4 sm:p-6">
            <StudioWire className="h-auto w-full" />
          </div>
        </Container>
      </section>

      <section className="border-b border-line py-20">
        <Container>
          <h2 className="h-section max-w-2xl">Tout ce qu&apos;il faut pour diffuser.</h2>
          <div className="mt-12 grid grid-cols-1 gap-px overflow-hidden rounded-2xl border border-line bg-line md:grid-cols-6">
            {features.map((f) => (
              <article key={f.title} className={`bg-background p-6 sm:p-8 ${f.wide ? "md:col-span-3" : "md:col-span-2"}`}>
                <h3 className="text-xl font-semibold">{f.title}</h3>
                <p className="mt-3 text-sm leading-relaxed text-muted">{f.text}</p>
              </article>
            ))}
          </div>
        </Container>
      </section>

      <section className="bg-field bg-field-bottom border-b border-line py-20">
        <Container className="grid grid-cols-1 gap-12 lg:grid-cols-2">
          <div>
            <h2 className="h-section">Bas débit : il bascule seulement si c&apos;est figé.</h2>
            <p className="mt-5 text-base leading-relaxed text-muted">Tu choisis d&apos;activer ou non le changement automatique de scène.</p>
            <ol className="mt-6 space-y-4 text-sm leading-relaxed">
              <li>
                <span className="font-medium">Débit bas, image fluide.</span> <span className="text-muted">Le direct continue, rien ne change.</span>
              </li>
              <li>
                <span className="font-medium">Image figée.</span> <span className="text-muted">Le commutateur passe sur ta scène de secours (ou en crée une).</span>
              </li>
              <li>
                <span className="font-medium">L&apos;image repart.</span> <span className="text-muted">Retour automatique à la scène d&apos;origine, si tu le souhaites.</span>
              </li>
            </ol>
          </div>
          <div>
            <h2 className="h-section">Podcast : synchronisé, et qui suit la voix.</h2>
            <p className="mt-5 text-base leading-relaxed text-muted">La latence n&apos;est pas une priorité : les flux sont mis en mémoire pour rester réguliers.</p>
            <ol className="mt-6 space-y-4 text-sm leading-relaxed">
              <li>
                <span className="font-medium">Synchro.</span> <span className="text-muted">Chaque flux est retardé pour tomber au même instant, image et son. Réglage manuel ou calibration au clap.</span>
              </li>
              <li>
                <span className="font-medium">Prise de parole.</span> <span className="text-muted">La scène de la personne qui parle passe en programme.</span>
              </li>
              <li>
                <span className="font-medium">Plusieurs voix.</span> <span className="text-muted">Le commutateur passe sur ton plan large.</span>
              </li>
            </ol>
          </div>
        </Container>
      </section>

      <NextStep label="Demander l'accès" href="/acces" />
    </>
  );
}
