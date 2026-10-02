import type { ReactNode } from "react";
import { Container } from "@/components/ui";
import { pro } from "@/lib/site";
import s from "./pro.module.css";

// Bento « Ce que tu peux faire » (/pro) : 7 cartes, 7 cases (3 colonnes × 3 rangées sur desktop).

function Art({ children }: { children: ReactNode }) {
  return (
    <svg
      viewBox="0 0 280 140"
      className="svg-hairline h-36 w-full text-foreground"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.25}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}

const mono = { fill: "var(--muted)", stroke: "none", className: "font-mono", fontSize: 10, letterSpacing: "0.08em" } as const;

/** Mini sac (vu de face), réutilisé dans plusieurs cartes. */
function MiniBag({ x, y, s: k = 1 }: { x: number; y: number; s?: number }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${k})`}>
      <path d="M8 2C-6 20 -6 50 4 70M52 2C66 20 66 50 56 70" opacity={0.6} />
      <rect x={0} y={0} width={60} height={76} rx={14} fill="var(--background)" />
      <rect x={9} y={30} width={42} height={38} rx={9} strokeDasharray="1.5 3" />
      <circle cx={30} cy={16} r={5} />
    </g>
  );
}

function Bonding() {
  const bars = [
    { l: "4G", w: 70 },
    { l: "5G", w: 110 },
    { l: "eSIM", w: 60 },
  ];
  return (
    <Art>
      {bars.map((b, i) => (
        <g key={b.l}>
          <text x={16} y={30 + i * 26} {...mono}>
            {b.l}
          </text>
          <rect x={56} y={22 + i * 26} width={b.w} height={8} rx={4} fill="currentColor" fillOpacity={0.6} stroke="none" className={s.grow} style={{ animationDelay: `${i * 0.3}s` }} />
        </g>
      ))}
      <path d="M16 106H264" opacity={0.3} />
      <text x={16} y={128} {...mono} fill="var(--foreground)">
        TOTAL
      </text>
      <rect x={56} y={120} width={200} height={10} rx={5} />
      <g className={s.grow} style={{ animationDelay: "0.9s" }}>
        <rect x={58} y={122} width={70} height={6} rx={3} fill="currentColor" fillOpacity={0.9} stroke="none" />
        <rect x={128} y={122} width={60} height={6} rx={0} fill="currentColor" fillOpacity={0.7} stroke="none" />
        <rect x={188} y={122} width={66} height={6} rx={3} fill="currentColor" fillOpacity={0.5} stroke="none" />
      </g>
    </Art>
  );
}

function IPhone() {
  return (
    <Art>
      <rect x={30} y={30} width={44} height={84} rx={9} />
      <path d="M44 38H60" opacity={0.6} />
      <path d="M74 72H118" strokeDasharray="2 4" opacity={0.5} />
      <g className={s.plug}>
        <path d="M118 72H176" strokeWidth={2} />
        <rect x={118} y={66} width={14} height={12} rx={3} fill="var(--background)" />
      </g>
      <MiniBag x={184} y={34} />
      <circle cx={232} cy={42} r={3} fill="var(--live)" stroke="none" className={s.on} />
    </Art>
  );
}

function Starlink() {
  return (
    <Art>
      <rect x={92} y={14} width={96} height={116} rx={18} fill="var(--background)" />
      <path d="M98 20C80 50 80 90 96 124M182 20C200 50 200 90 184 124" opacity={0.5} />
      <g className={s.slide}>
        <rect x={108} y={34} width={64} height={78} rx={6} fill="var(--background)" />
        <rect x={116} y={42} width={48} height={62} rx={4} opacity={0.4} />
      </g>
      <text x={140} y={138} textAnchor="middle" {...mono}>
        DANS LE DOS DU SAC
      </text>
    </Art>
  );
}

function Camera() {
  return (
    <Art>
      <rect x={18} y={48} width={70} height={44} rx={6} />
      <rect x={88} y={56} width={22} height={28} rx={4} />
      <circle cx={48} cy={70} r={12} />
      <circle cx={48} cy={70} r={5} opacity={0.5} />
      <path d="M110 70H196" className="bond-dash" strokeWidth={1.5} />
      <text x={153} y={60} textAnchor="middle" {...mono}>
        HDMI
      </text>
      <MiniBag x={200} y={32} />
    </Art>
  );
}

function Power() {
  return (
    <Art>
      {[92, 150].map((x, i) => (
        <g key={x}>
          <rect x={x} y={24} width={40} height={96} rx={9} />
          <rect x={x + 13} y={19} width={14} height={5} rx={2} />
          <rect x={x + 7} y={31} width={26} height={82} rx={5} fill="currentColor" fillOpacity={0.55} stroke="none" className={s.fill} style={{ animationDelay: `${i * 0.4}s` }} />
        </g>
      ))}
    </Art>
  );
}

function Relay() {
  return (
    <Art>
      <MiniBag x={14} y={34} s={0.8} />
      <path d="M70 66H112" className="bond-dash" strokeWidth={1.5} />
      <rect x={116} y={42} width={56} height={48} rx={6} />
      <path d="M124 56H164M124 66H164M124 76H150" opacity={0.5} />
      <circle cx={162} cy={76} r={2.5} fill="currentColor" stroke="none" className="led-blink" />
      <text x={144} y={108} textAnchor="middle" {...mono}>
        RELAIS
      </text>
      <path d="M176 66H214" className="bond-dash" strokeWidth={1.5} />
      <rect x={218} y={40} width={50} height={40} rx={4} />
      <path d="M232 92H254M243 80V92" />
      <text x={243} y={108} textAnchor="middle" {...mono}>
        OBS
      </text>
    </Art>
  );
}

type Card = { title: ReactNode; text: string; art?: ReactNode; className?: string; tone?: "grid" | "glow" };

const cards: Card[] = [
  {
    title: "4G + 5G + eSIM",
    text: "Plusieurs cartes SIM et eSIM en même temps : leurs débits s'additionnent.",
    art: <Bonding />,
    className: "lg:col-span-2",
    tone: "grid",
  },
  { title: "+ ton iPhone", text: "Branche ton iPhone en USB-C : sa connexion s'ajoute au bonding.", art: <IPhone /> },
  { title: "+ Starlink Mini", text: "Un compartiment dédié dans le dos du sac, alimenté par le sac.", art: <Starlink />, tone: "glow" },
  {
    title: "Toute caméra HDMI",
    text: "Caméra, câble HDMI, sac. Ton image part dès qu'il y a une connexion.",
    art: <Camera />,
    className: "lg:col-span-2",
  },
  { title: "Autonomie", text: "2 batteries USB-C haute puissance. Plusieurs heures selon l'usage.", art: <Power /> },
  { title: "Relais SYXTEE inclus", text: "Du sac au relais, puis directement dans ton OBS.", art: <Relay />, tone: "grid" },
];

export default function ProBento() {
  return (
    <section className="border-b border-line py-20 sm:py-28" aria-labelledby="pro-bento">
      <Container>
        <h2 id="pro-bento" className="max-w-2xl h-section">
          Ce que tu peux faire avec.
        </h2>
        <ul className="mt-12 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {cards.map((c) => (
            <li key={c.text} className={`relative overflow-hidden rounded-2xl border border-line p-6 ${c.className ?? ""}`}>
              {c.tone === "grid" && <div className="bg-grid pointer-events-none absolute inset-0 opacity-60" aria-hidden="true" />}
              {c.tone === "glow" && (
                <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_50%_30%,rgba(255,255,255,0.07),transparent_65%)]" aria-hidden="true" />
              )}
              <div className="relative">
                {c.art}
                <h3 className="mt-5 text-lg font-medium">{c.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted">{c.text}</p>
              </div>
            </li>
          ))}
          <li className="relative flex flex-col justify-end overflow-hidden rounded-2xl border border-accent/40 bg-accent/[0.08] p-6 md:col-span-2 lg:col-span-1">
            <p className="font-mono text-xs uppercase tracking-[0.2em] text-muted">Le moins cher du marché</p>
            <p className="mt-4 text-6xl font-semibold tracking-tight tabular-nums sm:text-7xl">{pro.launchPrice}</p>
            <p className="mt-3 text-sm text-muted">Prix de lancement</p>
          </li>
        </ul>
      </Container>
    </section>
  );
}
