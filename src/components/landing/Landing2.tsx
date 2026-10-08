import Link from "next/link";
import { ButtonLink } from "../ui/Button";
import { Container } from "../ui";
import Diagram from "./Diagram";
import Faq from "./Faq";
import Steps from "./Steps";
import VisualSlot from "./VisualSlot";
import RelayServer from "../illustrations/RelayServer";
import ObsScreen from "../illustrations/ObsScreen";
import Streamer from "../illustrations/Streamer";
import { site } from "@/lib/site";

const h2 = "text-3xl font-medium tracking-[-0.03em] sm:text-4xl";
const lead = "mt-4 max-w-[60ch] text-base leading-relaxed text-muted";
const big = "font-mono text-6xl font-medium tracking-tight sm:text-7xl";
const cap = "text-xs text-muted";

function Cell({ className = "", title, text, children }: { className?: string; title: string; text: string; children?: React.ReactNode }) {
  return (
    <article className={`bento-cell flex flex-col p-6 sm:p-7 ${className}`}>
      <div className="min-h-0 flex-1">{children}</div>
      <h3 className="mt-6 text-lg font-semibold tracking-tight">{title}</h3>
      <p className="mt-1.5 max-w-[48ch] text-sm leading-relaxed text-muted">{text}</p>
    </article>
  );
}

// Mini carte hexagonale 4G/5G (SVG).
function CoverageMap() {
  const hexes = [[40, 40, 0.5], [88, 40, 0.8], [136, 40, 0.3], [64, 82, 0.9], [112, 82, 0.6], [160, 82, 0.2], [40, 124, 0.4], [88, 124, 1], [136, 124, 0.7]];
  return (
    <svg viewBox="0 0 200 160" className="h-36 w-full" aria-hidden="true">
      {hexes.map(([x, y, o], i) => (
        <path key={i} d={`M${x} ${y - 24} l21 12 v24 l-21 12 l-21 -12 v-24z`} fill="var(--ok)" fillOpacity={Number(o) * 0.35} stroke="var(--foreground)" strokeOpacity="0.2" />
      ))}
      <circle cx="88" cy="124" r="4" fill="var(--foreground)" />
    </svg>
  );
}

export function BentoSection() {
  const bars = [30, 52, 41, 66, 58, 80, 72, 90];
  return (
    <section className="border-b border-line py-20 lg:py-28">
      <Container>
        <h2 className={h2}>Une bête de course pour le direct.</h2>
        <p className={lead}>Tout ce qu&apos;il faut pour un flux qui ne lâche pas, du terrain jusqu&apos;à tes viewers.</p>
        <div className="mt-12 grid gap-4 md:grid-cols-6">
          <Cell className="md:col-span-4" title="Un relais, plusieurs connexions" text="Ton téléphone envoie sur plusieurs réseaux à la fois. Le relais les réunit en un seul flux.">
            <div className="grid items-center gap-4 sm:grid-cols-2">
              <div>
                <p className={cap}>Jusqu&apos;à</p>
                <p className={big}>8×</p>
                <p className={cap}>connexions bondées</p>
              </div>
              <VisualSlot name="relay-3d" />
            </div>
          </Cell>
          <Cell className="md:col-span-2" title="Latence maîtrisée" text="Mesurée en temps réel, par connexion.">
            <p className={cap}>Moyenne en test</p>
            <p className={big}>84<span className="ml-1 text-2xl text-muted">ms</span></p>
            <p className={cap}>de bout en bout</p>
          </Cell>
          <Cell className="md:col-span-2" title="Serveur au Canada" text="Un relais à Beauharnois, joignable par un nom de domaine stable.">
            <p className={cap}>Relais</p>
            <p className={big}>BHS1</p>
            <p className={cap}>Québec</p>
          </Cell>
          <Cell className="md:col-span-2" title="Où capter" text="La carte de couverture 4G et 5G de la communauté.">
            <CoverageMap />
          </Cell>
          <Cell className="md:col-span-2" title="Compatible avec tes outils" text="OBS, SRT, SRTLA, RTMP, et tes plateformes.">
            <div className="grid h-36 place-items-center rounded-xl bg-[radial-gradient(ellipse_at_50%_0%,color-mix(in_srgb,var(--ok)_14%,transparent),transparent_70%)]">
              <p className="flex flex-wrap justify-center gap-x-5 gap-y-2 px-4 text-center text-base font-semibold tracking-tight text-foreground/70">
                <span>OBS</span><span>Twitch</span><span>YouTube</span><span>Kick</span><span>Saily</span>
              </p>
            </div>
          </Cell>
          <Cell className="md:col-span-3" title="Santé du flux" text="Débit, perte et latence en direct, avec une alerte avant que ça coupe.">
            <div className="flex h-36 items-end gap-2 rounded-xl border border-line bg-background/60 p-4" aria-hidden="true">
              {bars.map((h, i) => (
                <span key={i} className="flex-1 rounded-t-md bg-foreground/60" style={{ height: `${h}%`, opacity: 0.35 + i * 0.08 }} />
              ))}
            </div>
          </Cell>
          <Cell className="md:col-span-3" title="Contrôle à distance" text="Scènes, audio et direct depuis ton téléphone.">
            <VisualSlot name="app-mockup" />
          </Cell>
        </div>
      </Container>
    </section>
  );
}

export function SchemaSection() {
  return (
    <section className="border-b border-line py-20 lg:py-28">
      <Container>
        <h2 className={h2}>Le cerveau de ton direct.</h2>
        <p className={lead}>De la caméra aux plateformes, chaque maillon est suivi et relié au relais.</p>
        <div className="bento-cell mt-12 p-6">
          <Diagram />
        </div>
      </Container>
    </section>
  );
}

export function StepsSection() {
  const steps = [
    { title: "Branche et lance", text: "Ton téléphone envoie la vidéo par toutes tes connexions vers le relais." },
    { title: "Le relais réunit tout", text: "Les flux sont recollés en un seul. Si une connexion tombe, les autres prennent le relais." },
    { title: "Pilote ton direct", text: "Ton OBS diffuse vers tes plateformes, et tu le contrôles à distance." },
  ];
  const art = [<Streamer key="a" animated={false} className="h-full w-full max-h-72" />, <RelayServer key="b" animated={false} className="h-full w-full max-h-72" />, <ObsScreen key="c" animated={false} className="h-full w-full max-h-72" />];
  return (
    <section className="border-b border-line py-20 lg:py-28">
      <Container>
        <h2 className={`${h2} mb-12`}>Comment se passe une live ?</h2>
        <Steps steps={steps} art={art} />
      </Container>
    </section>
  );
}

export function PricingCards() {
  const plans = [
    { name: "Gratuit", slot: "pricing-free", text: "Découvre le dashboard et le contrôle à distance.", points: ["Compte et dashboard", "Documentation", "Support Discord"] },
    { name: "Payant", slot: "pricing-paid", text: "Relais, santé du flux et multistream pour streamer chaque semaine.", points: ["Relais SRTLA et RTMP", "Santé du flux et mire", "Contrôle à distance d'OBS"], featured: true },
    { name: "Partenaire", slot: "pricing-partner", text: "Pour les créateurs et les régies accompagnés par l'équipe.", points: ["Accès illimité", "Espaces partagés", "Contact direct avec l'équipe"] },
  ];
  return (
    <section className="border-b border-line py-20 lg:py-28">
      <Container>
        <h2 className={h2}>Choisis ta formule.</h2>
        <p className={lead}>Les prix seront annoncés bientôt. L&apos;accès se fait sur invitation.</p>
        <div className="mt-12 grid items-stretch gap-4 md:grid-cols-3">
          {plans.map((p) => (
            <article key={p.name} className={`bento-cell flex flex-col p-5 ${p.featured ? "!border-line-strong bg-surface-2 md:-my-3 md:py-8" : ""}`}>
              <VisualSlot name={p.slot} />
              <h3 className="mt-6 text-xl font-semibold tracking-tight">{p.name}</h3>
              <p className="mt-1 text-sm text-muted">{p.text}</p>
              <p className="mt-5 text-2xl font-medium tracking-tight text-foreground/70">Bientôt disponible</p>
              <ul className="mt-5 flex-1 space-y-2 text-sm text-muted">
                {p.points.map((x) => (
                  <li key={x} className="flex gap-2.5"><span aria-hidden="true" className="text-foreground">+</span>{x}</li>
                ))}
              </ul>
              <div className="mt-6">
                <ButtonLink href={site.discord} external variant={p.featured ? "primary" : "secondary"} className="w-full">
                  Rejoindre le Discord
                </ButtonLink>
              </div>
            </article>
          ))}
        </div>
        <p className="mt-6 text-sm text-muted">
          Tarifs en vigueur : page{" "}
          <Link href="/tarifs" className="text-foreground underline-offset-4 hover:underline">Tarifs</Link>.
        </p>
      </Container>
    </section>
  );
}

export function FaqSection() {
  const items = [
    { q: "Faut-il un abonnement ?", a: "L'accès se fait sur invitation. Les formules Gratuit, Payant et Partenaire existent ; les prix seront annoncés bientôt." },
    { q: "Mon matériel est-il compatible ?", a: "OBS Studio et tout encodeur qui envoie en SRT, SRTLA ou RTMP. Colle l'adresse du relais, c'est tout." },
    { q: "Quand est-ce disponible ?", a: "Le service est disponible aujourd'hui pour les comptes invités. Demande ton accès depuis le bouton Commencer." },
    { q: "Comment obtenir de l'aide ?", a: "Le support se fait sur Discord. Donne ton ID de support dans ton ticket, on retrouve ton compte sans ton e-mail." },
    { q: "Où est le relais ?", a: "À Beauharnois, au Québec, derrière un nom de domaine stable. D'autres emplacements pourront venir plus tard." },
  ];
  return (
    <section className="border-b border-line py-20 lg:py-28">
      <Container>
        <h2 className={`${h2} mb-10 text-center`}>Questions fréquentes</h2>
        <Faq items={items} />
      </Container>
    </section>
  );
}

