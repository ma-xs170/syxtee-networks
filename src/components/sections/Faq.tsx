import { Container, SectionHeader } from "../ui";

const faq = [
  {
    q: "C'est quoi le SRTLA ?",
    a: "Le SRTLA permet d'envoyer ta vidéo sur plusieurs connexions en même temps (4G, 5G, Wi-Fi). Le relais rassemble les morceaux et reconstitue un flux stable. Si un réseau lâche, le live continue sur les autres.",
  },
  {
    q: "Quelles applications sont compatibles ?",
    a: "Moblin (iOS), IRL Pro (Android) et BELABOX. Côté diffusion, tu récupères le flux dans OBS Studio puis tu streames vers Twitch, Kick, YouTube ou toute plateforme compatible.",
  },
  {
    q: "J'ai besoin d'un PC ?",
    a: "Oui : OBS tourne sur ton PC (à la maison, par exemple). C'est lui qui récupère le flux du relais et l'envoie sur ta plateforme, avec tes scènes et overlays.",
  },
  {
    q: "Combien ça coûte ?",
    a: "Les offres arrivent bientôt. Le but est d'être l'option la plus abordable pour les streamers IRL. Rejoins le Discord pour être prévenu à l'ouverture.",
  },
  {
    q: "Comment contacter le support ?",
    a: "Uniquement sur Discord : ouvre un ticket dans le salon support et on te répond directement. Aucune demande n'est traitée par email.",
  },
];

export default function Faq() {
  return (
    <section id="faq" className="border-b border-line py-24">
      <Container className="grid gap-12 lg:grid-cols-[0.8fr_1.2fr]">
        <SectionHeader kicker="FAQ" title="Questions fréquentes." />
        <div className="divide-y divide-line border-y border-line">
          {faq.map((item) => (
            <details key={item.q} className="group py-5">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-6 text-base font-medium">
                {item.q}
                <span className="font-mono text-muted transition-transform group-open:rotate-45" aria-hidden="true">+</span>
              </summary>
              <p className="mt-3 pr-8 text-sm leading-relaxed text-muted">{item.a}</p>
            </details>
          ))}
        </div>
      </Container>
    </section>
  );
}
