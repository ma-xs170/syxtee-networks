import { Container, SectionHeader } from "../ui";

const chain = [
  { label: "Ton téléphone", sub: "Moblin · IRL Pro" },
  { label: "Relais SYXTEE", sub: "SRTLA → SRT" },
  { label: "Ton OBS", sub: "Scènes & overlays" },
  { label: "Plateformes", sub: "Twitch · Kick · YouTube" },
];

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

        {/* Schéma du flux */}
        <div className="mt-14 flex flex-col items-stretch gap-3 lg:flex-row lg:items-center">
          {chain.map((c, i) => (
            <div key={c.label} className="flex flex-1 flex-col items-stretch gap-3 lg:flex-row lg:items-center">
              <div
                className={`flex-1 rounded-xl border p-5 text-center ${
                  i === 1 ? "border-white/40 bg-white text-black" : "border-line bg-white/[0.02]"
                }`}
              >
                <p className="text-sm font-semibold">{c.label}</p>
                <p className={`mt-1 font-mono text-xs ${i === 1 ? "text-neutral-600" : "text-muted"}`}>{c.sub}</p>
              </div>
              {i < chain.length - 1 && (
                <div className="mx-auto h-6 w-px bg-line lg:h-px lg:w-10 lg:flex-none">
                  <div className="flow-line h-full w-full" />
                </div>
              )}
            </div>
          ))}
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
      </Container>
    </section>
  );
}
