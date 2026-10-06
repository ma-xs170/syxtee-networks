import { Container, MoreLink, SectionHeader } from "../ui";

const classic = [
  "Encodeur ou sac à dos dédié",
  "Abonnement pro pensé pour les grosses structures",
  "Plusieurs cartes SIM et modems à gérer",
  "Support par email, réponses en plusieurs jours",
];

const syxtee = [
  "Le téléphone que tu as déjà",
  "Un tarif pensé pour les petits streamers",
  "Tes forfaits 4G/5G + Wi-Fi combinés",
  "Support direct sur Discord",
];

export default function LowCost() {
  return (
    <section className="bg-field border-b border-line py-24">
      <Container>
        <SectionHeader kicker="Low-cost" title="L'IRL ne devrait pas coûter un salaire.">
          On a construit SYXTEE NETWORKS pour les créateurs qui démarrent : l&apos;essentiel pour un live stable, rien de superflu.
        </SectionHeader>

        <div className="mt-14 grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="rounded-2xl border border-line p-8">
            <p className="font-mono text-xs uppercase tracking-[0.2em] text-muted">Setup IRL classique</p>
            <ul className="mt-6 space-y-4">
              {classic.map((t) => (
                <li key={t} className="flex gap-3 text-sm text-muted">
                  <span aria-hidden="true" className="text-foreground/30">—</span>
                  <span className="line-through decoration-accent/20">{t}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-2xl border border-foreground/40 bg-foreground/[0.08] p-8">
            <p className="font-mono text-xs uppercase tracking-[0.2em]">Avec SYXTEE</p>
            <ul className="mt-6 space-y-4">
              {syxtee.map((t) => (
                <li key={t} className="flex gap-3 text-sm">
                  <svg viewBox="0 0 20 20" className="mt-0.5 h-4 w-4 flex-none" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                    <path d="M4 10.5l4 4 8-9" />
                  </svg>
                  {t}
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mt-10">
          <MoreLink href="/acces" />
        </div>
      </Container>
    </section>
  );
}
