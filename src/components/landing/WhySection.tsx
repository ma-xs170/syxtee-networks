import Link from "next/link";
import { Container } from "../ui";
import Highlight from "../ui/Highlight";
import Reveal from "../ui/Reveal";
import MacAndPc from "./MacAndPc";

const h2 = "h-serif text-[clamp(2.25rem,4.5vw,3.5rem)]";
const lead = "mt-4 max-w-[60ch] text-base leading-relaxed text-muted";
const svgBase = { fill: "none", stroke: "currentColor", strokeWidth: 1.5, strokeLinecap: "round", strokeLinejoin: "round" } as const;

function Cell({ n, title, text, children, delay = 0, className = "", href, cta }: { n: string; title: string; text: string; children: React.ReactNode; delay?: number; className?: string; href?: string; cta?: string }) {
  return (
    <Reveal as="article" delay={delay} className={`bento-cell flex flex-col p-6 sm:p-7 ${className}`}>
      <div className="flex h-44 items-center justify-center" aria-hidden="true">{children}</div>
      <p className="mt-6 font-mono text-xs uppercase tracking-wider text-muted">{n}</p>
      <h3 className="mt-1.5 text-lg font-semibold tracking-tight">{title}</h3>
      <p className="mt-1.5 max-w-[52ch] text-sm leading-relaxed text-muted">{text}</p>
      {href && cta && <Link href={href} className="mt-2 inline-flex min-h-11 items-center gap-1.5 text-sm text-foreground underline-offset-4 hover:underline">{cta} <span aria-hidden="true">→</span></Link>}
    </Reveal>
  );
}

/* Le flux tombe : la scène de retour prend le relais, puis le direct reprend. */
function FallbackVisual() {
  const steps: [string, string][] = [["En direct", "border-foreground/40 bg-surface-2"], ["Signal perdu", "border-warn text-warn"], ["Scène de retour", "border-line-strong bg-surface-2"], ["En direct", "border-foreground/40 bg-surface-2"]];
  return (
    <ol className="grid w-full grid-cols-2 gap-3">
      {steps.map(([s, c], i) => (
        <li key={i} className={`flex items-center justify-center gap-2 rounded-xl border px-3 py-3.5 text-center font-mono text-xs uppercase tracking-wide ${c}`}>
          {i === 0 && <span className="size-1.5 rounded-full bg-live" />}
          {s}
        </li>
      ))}
    </ol>
  );
}

/* Trois connexions du téléphone, un seul flux stable en sortie. */
function BondingVisual() {
  return (
    <svg viewBox="0 0 360 150" className="h-auto w-full max-w-[360px] text-foreground" {...svgBase}>
      {[["4G", 28], ["5G", 75], ["Wi-Fi", 122]].map(([l, y]) => (
        <g key={l}>
          <text x="0" y={Number(y) + 4} fill="currentColor" stroke="none" fontSize="11" className="font-mono" opacity="0.6">{l}</text>
          <path d={`M44 ${y}h110c30 0 40 ${75 - Number(y)} 70 ${75 - Number(y)}`} strokeOpacity="0.5" strokeDasharray="3 5" />
        </g>
      ))}
      <rect x="224" y="55" width="132" height="40" rx="10" fill="currentColor" fillOpacity="0.06" />
      <text x="290" y="79" textAnchor="middle" fill="currentColor" stroke="none" fontSize="12" className="font-mono">FLUX STABLE</text>
    </svg>
  );
}

/* Téléphone relié au serveur le plus proche parmi plusieurs, répartis dans le monde. */
function ServersVisual() {
  const pts: [number, number][] = [[60, 50], [130, 110], [250, 40], [310, 100]];
  return (
    <svg viewBox="0 0 360 150" className="h-auto w-full max-w-[360px] text-foreground" {...svgBase}>
      <ellipse cx="180" cy="75" rx="150" ry="62" strokeOpacity="0.35" />
      <ellipse cx="180" cy="75" rx="70" ry="62" strokeOpacity="0.2" />
      <path d="M30 75h300" strokeOpacity="0.2" />
      {pts.map(([x, y], i) => <rect key={i} x={x - 6} y={y - 6} width="12" height="12" rx="3" fill="currentColor" fillOpacity={i === 1 ? 0.9 : 0.25} />)}
      <circle cx="180" cy="128" r="5" fill="currentColor" stroke="none" />
      <path d="M180 123 133 114" strokeDasharray="3 4" />
    </svg>
  );
}

/* Tout ce qu'on pilote depuis le téléphone. */
function ControlVisual() {
  return (
    <div className="flex flex-wrap justify-center gap-2">
      {["Scènes", "Audio", "Direct", "Multistream", "Chat", "Enregistrement"].map((x) => (
        <span key={x} className="rounded-full border border-line-strong px-3 py-1.5 font-mono text-xs uppercase tracking-wide text-muted">{x}</span>
      ))}
    </div>
  );
}

/* Plusieurs caméras, une seule au programme. */
function DirectorVisual() {
  return (
    <div className="grid w-full grid-cols-3 gap-3">
      {["Osmo", "iPhone", "Drone"].map((x, i) => (
        <div key={x} className={`relative grid aspect-video place-items-center rounded-lg border font-mono text-[11px] uppercase tracking-wide ${i === 1 ? "border-foreground/60 bg-surface-2 text-foreground" : "border-line text-muted"}`}>
          {x}
          {i === 1 && <span className="absolute left-1.5 top-1.5 rounded bg-foreground px-1 text-[9px] text-background">PGM</span>}
        </div>
      ))}
    </div>
  );
}

const APPLE = "M12.152 6.896c-.948 0-2.415-1.078-3.96-1.04-2.04.027-3.91 1.183-4.961 3.014-2.117 3.675-.546 9.103 1.519 12.09 1.013 1.454 2.208 3.09 3.792 3.039 1.52-.065 2.09-.987 3.935-.987 1.831 0 2.35.987 3.96.948 1.637-.026 2.676-1.48 3.676-2.948 1.156-1.688 1.636-3.325 1.662-3.415-.039-.013-3.182-1.221-3.22-4.857-.026-3.04 2.48-4.494 2.597-4.559-1.429-2.09-3.623-2.324-4.39-2.376-2-.156-3.675 1.09-4.61 1.09zM15.53 3.83c.843-1.012 1.4-2.427 1.245-3.83-1.207.052-2.662.805-3.532 1.818-.78.896-1.454 2.338-1.273 3.714 1.338.104 2.715-.688 3.559-1.701";

/* Pourquoi nous : les raisons concrètes, une par cellule. */
export function WhySection() {
  return (
    <section id="pourquoi" className="scroll-mt-20 border-b border-line py-24 lg:py-36">
      <Container>
        <Reveal>
          <h2 className={h2}>Pourquoi <Highlight>nous</Highlight> ?</h2>
          <p className={lead}>Parce qu&apos;un live en mobilité ne doit pas dépendre d&apos;un seul signal, d&apos;un seul réseau ou d&apos;un seul écran.</p>
        </Reveal>
        <div className="mt-12 grid gap-4 md:grid-cols-6">
          <Cell n="01 · Fiabilité" delay={0} className="md:col-span-3" title="Ton stream ne se coupe jamais" text="Si le signal de ton téléphone tombe, une scène de retour, que tu as dessinée, prend le relais. Quand la connexion revient, ton direct reprend tout seul.">
            <FallbackVisual />
          </Cell>
          <Cell n="02 · Connexion" delay={0.08} className="md:col-span-3" title="Toutes tes connexions en même temps" text="4G, 5G et Wi-Fi s'additionnent. Si l'une faiblit, les autres continuent de porter la vidéo.">
            <BondingVisual />
          </Cell>
          <Cell n="03 · Serveurs" delay={0.16} className="md:col-span-2" title="Des serveurs près de toi" text="Ton téléphone envoie sa vidéo à un de nos serveurs, répartis dans le monde.">
            <ServersVisual />
          </Cell>
          <Cell n="04 · Pilotage" delay={0.24} className="md:col-span-2" title="Tout depuis ton téléphone" text="Change de scène, règle l'audio et lance ton direct depuis n'importe où.">
            <ControlVisual />
          </Cell>
          <Cell n="05 · Régie" delay={0.32} className="md:col-span-2" title="Une régie qui choisit pour toi" text="Plusieurs caméras : l'IA met au programme celle où il se passe quelque chose.">
            <DirectorVisual />
          </Cell>
          <Cell n="06 · Chez toi" delay={0.4} className="md:col-span-6" title="Tout tourne sur ton propre PC ou Mac" text="Ton OBS reste sur ton ordinateur. Zéro serveur à louer, zéro configuration lourde : tu relies ton ordinateur avec un code et c'est parti.">
            <MacAndPc className="mx-auto max-w-[440px]" />
          </Cell>
        </div>
        <Reveal className="mt-16 border-t border-line pt-12 lg:mt-20 lg:pt-16">
          <p className="font-mono text-xs uppercase tracking-wider text-muted">Pour envoyer ton flux</p>
          <h3 className="h-serif mt-3 text-[clamp(1.75rem,3.2vw,2.5rem)]">L&apos;app qu&apos;on <em>recommande.</em></h3>
          <p className={lead}>Installe-la sur ton téléphone, branche-la à l&apos;un de nos serveurs : ton flux arrive dans OBS, prêt à être piloté.</p>
        </Reveal>
        <Reveal delay={0.1} className="bento-cell mt-8 grid items-center gap-8 p-6 sm:p-10 lg:grid-cols-[auto_1fr_auto] lg:gap-12">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/images/moblin/icon.png" alt="Logo de Moblin" width={120} height={120} className="size-24 rounded-[26px] border border-line shadow-[0_18px_40px_-18px_rgba(0,0,0,0.8)] sm:size-[120px]" />
          <div>
            <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted">
              <span className="rounded-full border border-line-strong px-2.5 py-0.5 text-xs text-foreground">L&apos;app qu&apos;on recommande</span>
              Développée par eerimoq · Gratuite et open source
            </p>
            <h3 className="mt-3 text-2xl font-semibold tracking-tight">Moblin</h3>
            <p className="mt-3 max-w-[62ch] text-sm leading-relaxed text-muted">
              Moblin est l&apos;app d&apos;IRL qu&apos;on te conseille pour streamer depuis ton téléphone : sans abonnement ni filigrane, avec un code public. Elle envoie ta vidéo sur plusieurs connexions à la fois (4G, 5G, Wi-Fi) et se branche sur un de nos serveurs en quelques minutes.
            </p>
            <div className="mt-6 flex flex-wrap items-center gap-3">
              <Link href="/moblin" className="btn btn-primary">Connecter Moblin à un serveur</Link>
              <a href="https://apps.apple.com/app/id6466745933" target="_blank" rel="noopener noreferrer" aria-label="Télécharger Moblin sur l'App Store" className="inline-flex h-11 items-center gap-2.5 rounded-xl border border-line-strong bg-foreground px-4 text-background transition-opacity hover:opacity-90">
                <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor" aria-hidden="true"><path d={APPLE} /></svg>
                <span className="text-left leading-none"><span className="block text-[9px] opacity-80">Télécharger sur l&apos;</span><span className="block text-[15px] font-semibold tracking-tight">App Store</span></span>
              </a>
            </div>
          </div>
          <ul className="grid gap-3 text-sm lg:w-56">
            {["Envoi SRTLA multi-connexions", "Vidéo jusqu'en 4K60", "Compatible Apple Watch"].map((x) => (
              <li key={x} className="flex gap-2.5 text-muted"><span aria-hidden="true" className="text-foreground">+</span>{x}</li>
            ))}
          </ul>
        </Reveal>
      </Container>
    </section>
  );
}
