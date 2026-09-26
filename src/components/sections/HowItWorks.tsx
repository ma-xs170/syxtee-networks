import FlowDiagram from "../blocks/FlowDiagram";
import { Container, MoreLink, SectionHeader } from "../ui";

const steps = [
  { n: "1", title: "Rejoins le Discord", text: "Tu demandes ton accès dans le salon dédié. On te donne l'adresse du relais et ton identifiant de stream." },
  { n: "2", title: "Configure ton app", text: "Dans Moblin ou IRL Pro, tu colles l'adresse SRTLA et tu actives le bonding sur tes connexions." },
  { n: "3", title: "Ajoute la source dans OBS", text: "Une source média SRT, et tu passes en live. Le relais tourne 24h/24, tu te connectes quand tu veux." },
];

export default function HowItWorks() {
  return (
    <section id="fonctionnement" className="border-b border-line py-24">
      <Container>
        <SectionHeader kicker="Fonctionnement" title="De ta poche à ton live, en 3 étapes." />

        <div className="mt-14">
          <FlowDiagram />
        </div>

        <ol className="mt-16 grid gap-10 md:grid-cols-3">
          {steps.map((s) => (
            <li key={s.n}>
              <span className="flex h-10 w-10 items-center justify-center rounded-full border border-line font-mono text-sm">{s.n}</span>
              <h3 className="mt-5 text-lg font-semibold">{s.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted">{s.text}</p>
            </li>
          ))}
        </ol>

        <div className="mt-12">
          <MoreLink href="/fonctionnement" />
        </div>
      </Container>
    </section>
  );
}
