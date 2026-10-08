import Link from "next/link";
import { ButtonLink } from "../ui/Button";
import { Container } from "../ui";
import Diagram from "./Diagram";
import Faq from "./Faq";
import Steps from "./Steps";
import VisualSlot from "./VisualSlot";
import ObsScreen from "../illustrations/ObsScreen";
import Streamer from "../illustrations/Streamer";
import { ctaLabel, product } from "@/config/product";
import RelayBox from "./RelayBox";
import AppMockup from "./AppMockup";

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

export function BentoSection() {
  const { specs } = product;
  return (
    <section className="border-b border-line py-20 lg:py-28">
      <Container>
        <h2 className={h2}>Une bête de course en petit boîtier.</h2>
        <p className={lead}>Branche-le, il s&apos;occupe du reste : connexions, relais et contrôle de ton OBS.</p>
        <div className="mt-12 grid gap-4 md:grid-cols-6">
          <Cell className="md:col-span-4" title="Plusieurs connexions, un seul flux" text="Le boîtier envoie sur tous tes réseaux à la fois. Le relais les réunit en un seul flux.">
            <div className="grid items-center gap-4 sm:grid-cols-[0.7fr_1.3fr]">
              <div>
                <p className={cap}>Jusqu&apos;à</p>
                <p className={big}>{specs.bondedConnections}×</p>
                <p className={cap}>connexions bondées</p>
              </div>
              <VisualSlot name="box-photo" fallback={<RelayBox />} />
            </div>
          </Cell>
          <Cell className="md:col-span-2" title="Latence maîtrisée" text="Mesurée en temps réel, par connexion.">
            <p className={cap}>Moyenne de bout en bout</p>
            <p className={big}>{specs.latencyMs}<span className="ml-1 text-2xl text-muted">ms</span></p>
            <p className={cap}>sur le relais {product.relayServer.code}</p>
          </Cell>
          <Cell className="md:col-span-2" title="Tous les protocoles" text="Ton OBS et ton encodeur envoient, le boîtier relaie.">
            <ul className="flex flex-wrap gap-2 pt-2">
              {specs.protocols.map((p) => (
                <li key={p} className="rounded-full border border-line-strong bg-background/60 px-4 py-2 font-mono text-sm">{p}</li>
              ))}
            </ul>
          </Cell>
          <Cell className="md:col-span-2" title="Tous les ports" text="Ce qu'il faut pour brancher modems, réseau et alimentation.">
            <ul className="grid gap-2 pt-1 text-sm">
              {specs.ports.map((p) => (
                <li key={p} className="flex items-center gap-2.5 rounded-lg border border-line bg-background/60 px-3 py-2"><span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-ok" />{p}</li>
              ))}
            </ul>
          </Cell>
          <Cell className="md:col-span-2" title="Compatible avec tes outils" text="Tes caméras, ton OBS et tes plateformes.">
            <div className="grid h-36 place-items-center rounded-xl bg-[radial-gradient(ellipse_at_50%_0%,color-mix(in_srgb,var(--ok)_14%,transparent),transparent_70%)]">
              <p className="flex flex-wrap justify-center gap-x-5 gap-y-2 px-4 text-center text-base font-semibold tracking-tight text-foreground/70">
                {[...product.compat, "Saily"].map((n) => <span key={n}>{n}</span>)}
              </p>
            </div>
          </Cell>
          <Cell className="md:col-span-3" title="Alimentation sobre" text="Assez petit pour rester dans une poche de sac.">
            <p className={cap}>Alimentation</p>
            <p className="font-mono text-4xl font-medium tracking-tight sm:text-5xl">{specs.power}</p>
            <p className={cap}>{specs.consumption}</p>
          </Cell>
          <Cell className="md:col-span-3" title="Relais au Canada" text="Un serveur à Beauharnois, joignable par un nom de domaine stable.">
            <p className={cap}>Serveur relais</p>
            <p className={big}>{product.relayServer.code}</p>
            <p className={cap}>{product.relayServer.region}</p>
          </Cell>
        </div>
        <p className="mt-4 text-xs text-muted">Caractéristiques indicatives, susceptibles d&apos;évoluer avant la sortie.</p>
      </Container>
    </section>
  );
}

export function SchemaSection() {
  return (
    <section className="border-b border-line py-20 lg:py-28">
      <Container>
        <h2 className={h2}>Le cerveau de ton stream.</h2>
        <p className={lead}>De la caméra aux plateformes, tout passe par {product.name}. Sa LED suit l&apos;état de la démo.</p>
        <div className="bento-cell mt-12 p-6">
          <Diagram />
        </div>
      </Container>
    </section>
  );
}

export function StepsSection() {
  const steps = [
    { title: "Allume le boîtier", text: "Il se connecte tout seul à tes réseaux et au relais." },
    { title: "Lance ton stream", text: "Depuis Moblin ou ta caméra, vers le boîtier : il relaie." },
    { title: `Pilote ton OBS`, text: `Avec ${product.remoteName}, depuis ton téléphone, où que tu sois.` },
  ];
  const art = [<RelayBox key="a" className="max-h-72" />, <Streamer key="b" animated={false} className="h-full w-full max-h-72" />, <ObsScreen key="c" animated={false} className="h-full w-full max-h-72" />];
  return (
    <section className="border-b border-line py-20 lg:py-28">
      <Container>
        <h2 className={`${h2} mb-12`}>Comment se passe une live ?</h2>
        <Steps steps={steps} art={art} />
      </Container>
    </section>
  );
}

export function AppSection() {
  return (
    <section className="border-b border-line py-20 lg:py-28">
      <Container>
        <h2 className={h2}>Une app pour tout configurer.</h2>
        <p className={lead}>Ton boîtier apparaît dans le dashboard comme un appareil lié : état, signal, firmware, redémarrage.</p>
        <div className="mt-12">
          <VisualSlot name="app-mockup" fallback={<AppMockup />} />
        </div>
      </Container>
    </section>
  );
}

export function PricingCards() {
  const v = product.variants;
  return (
    <section className="border-b border-line py-20 lg:py-28">
      <Container>
        <h2 className={h2}>Choisis ton {product.name}.</h2>
        <p className={lead}>Le boîtier, puis l&apos;abonnement qui va avec. Les prix seront annoncés bientôt.</p>
        <div className={`mt-12 grid items-stretch gap-4 ${v.length > 1 ? "md:grid-cols-3" : ""}`}>
          {v.map((x) => (
            <article key={x.id} className={`bento-cell grid gap-6 p-6 ${v.length === 1 ? "md:grid-cols-[1.2fr_1fr] md:items-center md:p-10" : ""} ${x.featured && v.length > 1 ? "!border-line-strong bg-surface-2 md:-my-3 md:py-8" : ""}`}>
              <VisualSlot name="box-hero" fallback={<RelayBox />} />
              <div>
                <h3 className="text-2xl font-semibold tracking-tight">{x.name}</h3>
                <p className="mt-1 text-sm text-muted">{x.pitch}</p>
                <p className="mt-5 text-3xl font-medium tracking-tight text-foreground/80">{product.priceLabel(x.price) ?? "Bientôt disponible"}</p>
                <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                  <ButtonLink href="/acces">{ctaLabel(product.availability)}</ButtonLink>
                  <ButtonLink href={product.discord} external variant="secondary">Rejoindre le Discord</ButtonLink>
                </div>
              </div>
            </article>
          ))}
        </div>

        <h3 className="mt-16 text-xl font-semibold tracking-tight">L&apos;abonnement {product.remoteName} et relais</h3>
        <div className="mt-6 grid items-stretch gap-4 md:grid-cols-3">
          {product.plans.map((p) => (
            <article key={p.id} className={`bento-cell flex flex-col p-6 ${"featured" in p && p.featured ? "!border-line-strong bg-surface-2" : ""}`}>
              <h4 className="text-lg font-semibold tracking-tight">{p.name}</h4>
              <p className="mt-1 text-sm text-muted">{p.text}</p>
              <p className="mt-5 text-2xl font-medium tracking-tight text-foreground/70">{product.priceLabel(p.price) ?? "Bientôt disponible"}</p>
              <ul className="mt-5 flex-1 space-y-2 text-sm text-muted">
                {p.points.map((x) => (
                  <li key={x} className="flex gap-2.5"><span aria-hidden="true" className="text-foreground">+</span>{x}</li>
                ))}
              </ul>
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

