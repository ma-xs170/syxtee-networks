import { Container } from "../ui";
import Reveal from "../ui/Reveal";
import LiveAnalysisDemo from "./LiveAnalysisDemo";

const h2 = "h-serif text-[clamp(2.25rem,4.5vw,3.5rem)]";

/* Analyse en temps réel : la même vue que dans le dashboard, avec la courbe du débit qui avance. */
export function AnalysisSection() {
  return (
    <section id="analyse" className="scroll-mt-20 border-b border-line py-24 lg:py-36">
      <Container>
        <Reveal>
          <h2 className={h2}>Vois ton flux <em>en direct.</em></h2>
          <p className="mt-4 max-w-[60ch] text-base leading-relaxed text-muted">
            Débit, latence, pertes et liens SRTLA, mesurés à la seconde. La courbe marque les pics, pour voir quand et pourquoi ta connexion a tenu ou lâché.
          </p>
        </Reveal>
        <div className="mt-12">
          <LiveAnalysisDemo />
        </div>
      </Container>
    </section>
  );
}
