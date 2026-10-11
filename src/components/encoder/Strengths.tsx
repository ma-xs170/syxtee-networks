import Link from "next/link";
import { product } from "@/config/product";
import { Illustration } from "@/components/illustrations/iso";

// Points forts : quatre cartes (1+2 puis 2+1), trait encre, boîtier dessiné comme le vrai Encodeur (dalle basse, ports à l'arrière, barre lumineuse en façade).
/** Arrière du boîtier : les cinq ports dessinés comme sur le vrai Encodeur. */
function Rear() {
  const ports = [
    { x: 56, w: 30, h: 14, l: "PWR" },
    { x: 108, w: 40, h: 34, l: "ETH" },
    { x: 170, w: 52, h: 16, l: "HDMI IN", hot: true },
    { x: 244, w: 30, h: 14, l: "USB-C" },
    { x: 296, w: 8, h: 8, l: "SYNC" },
  ];
  return (
    <Illustration viewBox="0 0 360 160">
      <path d="M24 40 H336 Q348 40 348 52 V122 Q348 134 336 134 H24 Q12 134 12 122 V52 Q12 40 24 40 Z" fill="currentColor" fillOpacity={0.06} />
      {ports.map((p) => (
        <g key={p.l}>
          <rect x={p.x - p.w / 2 + 15} y={88 - p.h / 2} width={p.w} height={p.h} rx={p.h > 20 ? 3 : p.h / 2} strokeWidth={p.hot ? 1.8 : 1.2} />
          <text x={p.x + 15} y={118} textAnchor="middle" fill="currentColor" stroke="none" fontSize={8} className="font-mono" opacity={p.hot ? 0.9 : 0.5}>{p.l}</text>
        </g>
      ))}
    </Illustration>
  );
}

/** Façade : la barre lumineuse dans ses trois états. */
function Led() {
  const states = [
    { y: 36, l: "Veille", c: "var(--warn)" },
    { y: 80, l: "Prêt", c: "var(--ok)" },
    { y: 124, l: "En direct", c: "var(--live)", live: true },
  ];
  return (
    <Illustration viewBox="0 0 460 160">
      {states.map((s) => (
        <g key={s.l}>
          <path d={`M60 ${s.y - 12} H170 L180 ${s.y - 2} V${s.y + 8} Q180 ${s.y + 14} 174 ${s.y + 14} H56 Q50 ${s.y + 14} 50 ${s.y + 8} V${s.y - 2} Z`} fill="currentColor" fillOpacity={0.06} />
          <path d={`M92 ${s.y + 2} H138`} strokeWidth={3} className={s.live ? "led-blink" : ""} stroke={s.c} />
          <text x={210} y={s.y + 5} fill="currentColor" stroke="none" fontSize={12} className="font-mono" opacity={0.65}>{s.l}</text>
        </g>
      ))}
    </Illustration>
  );
}

function Relay() {
  const links = [
    { y: 36, l: "4G", down: false },
    { y: 84, l: "5G", down: true },
    { y: 132, l: "Satellite", down: false },
  ];
  return (
    <Illustration viewBox="0 0 460 160">
      {links.map((k) => (
        <g key={k.l}>
          <circle cx={30} cy={k.y} r={4} fill="currentColor" stroke="none" opacity={k.down ? 0.25 : 0.85} />
          <text x={44} y={k.y + 4} fill="currentColor" stroke="none" fontSize={12} className="font-mono" opacity={k.down ? 0.4 : 0.8}>{k.l}</text>
          <path d={`M122 ${k.y} H${k.down ? 196 : 250}`} strokeDasharray={k.down ? "2 6" : "0"} strokeOpacity={k.down ? 0.4 : 1} />
          {k.down && <path d="M214 76 l16 16 M230 76 l-16 16" strokeOpacity={0.6} />}
        </g>
      ))}
      <path d="M250 36 V132 M250 84 H306" />
      <path d="M318 66 H394 L406 80 V96 Q406 104 398 104 H314 Q306 104 306 96 V80 Z" fill="currentColor" fillOpacity={0.07} />
      <path d="M306 80 H406" strokeOpacity={0.4} />
      <path d="M342 92 H372" strokeWidth={2.4} className="led-blink" stroke="var(--live)" />
    </Illustration>
  );
}

const cards = [
  { title: "Une caméra. Un câble HDMI.", text: "N'importe quelle caméra, en 1080p60, branchée à l'arrière. Pas de téléphone au milieu.", art: <Rear />, span: "lg:col-span-1" },
  { title: "Un voyant qui parle.", text: "Orange en veille, vert quand il est prêt, rouge qui pulse en direct.", art: <Led />, span: "lg:col-span-2" },
  { title: "Une connexion lâche, le direct continue.", text: "Les autres liaisons prennent le relais, sans coupure.", art: <Relay />, span: "lg:col-span-2" },
] as const;

export default function Strengths() {
  return (
    <ul className="grid gap-4 lg:grid-cols-3">
      {cards.map((c) => (
        <li key={c.title} className={`bento-cell flex flex-col p-7 ${c.span}`}>
          <div className="h-52 w-full">{c.art}</div>
          <h3 className="mt-6 text-xl font-semibold tracking-tight">{c.title}</h3>
          <p className="mt-2 max-w-[44ch] text-sm leading-relaxed text-muted">{c.text}</p>
        </li>
      ))}
      <li className="bento-cell flex flex-col justify-between p-7 lg:col-span-1">
        <p className="font-mono text-[11px] uppercase tracking-[0.08em] text-muted">À venir</p>
        <div>
          <p className="h-serif text-[clamp(2.5rem,5vw,3.75rem)]">{product.priceLabel(product.price)}</p>
          <Link href="/tarifs#encodeur" className="mt-3 inline-block text-sm text-foreground underline underline-offset-4 decoration-foreground/50 hover:decoration-foreground">Abonnement (requis)</Link>
        </div>
        <p className="text-sm leading-relaxed text-muted">Le principe d&apos;un TVU, au prix d&apos;un accessoire de streamer.</p>
      </li>
    </ul>
  );
}
