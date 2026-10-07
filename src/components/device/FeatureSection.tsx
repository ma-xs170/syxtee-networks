import type { ReactNode } from "react";
import { Container } from "../ui";
import { Reveal } from "./Motion";

// Section numérotée : gros numéro en dégradé, titre, paragraphe, mots-clés, deux boutons pilule. En deux colonnes alternées sur
// grand écran ; sur mobile le visuel passe au-dessus du texte.
export default function FeatureSection({ id, n, title, text, tags, flip = false, actions, children }: { id: string; n: string; title: string; text: string; tags: string; flip?: boolean; actions?: ReactNode; children: ReactNode }) {
  return (
    <Container>
      <article id={id} aria-labelledby={`f-${n}`} className="scroll-mt-20 grid grid-cols-1 items-center gap-12 border-t border-line py-20 lg:grid-cols-2 lg:gap-20 lg:py-28">
        <Reveal className={`order-2 ${flip ? "lg:order-2" : "lg:order-none"}`}>
          <p aria-hidden="true" className="bg-gradient-to-b from-foreground/30 to-transparent bg-clip-text font-mono text-7xl font-semibold leading-none text-transparent sm:text-8xl">
            {n}
          </p>
          <h2 id={`f-${n}`} className="mt-6 text-3xl font-semibold tracking-tight sm:text-4xl">
            {title}
          </h2>
          <p className="mt-5 max-w-[48ch] text-base leading-relaxed text-muted sm:text-lg">{text}</p>
          <p className="mt-6 font-mono text-xs uppercase tracking-[0.12em] text-foreground/70">{tags}</p>
          {actions && <div className="mt-8 flex flex-col gap-3 sm:flex-row">{actions}</div>}
        </Reveal>
        <Reveal delay={0.1} className={`order-1 ${flip ? "lg:order-1" : "lg:order-none"}`}>
          {children}
        </Reveal>
      </article>
    </Container>
  );
}
