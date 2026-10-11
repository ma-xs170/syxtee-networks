import { Illustration } from "@/components/illustrations/iso";

// Points forts : quatre cartes (1+2 puis 2+1), trait encre, une seule LED rouge « en direct ».
function Hdmi() {
  return (
    <Illustration viewBox="0 0 300 160">
      <path d="M60 80 H150" />
      <path d="M150 58 H234 L246 70 V90 L234 102 H150 Z" fill="currentColor" fillOpacity={0.07} />
      <path d="M162 70 H230 M162 90 H230" strokeOpacity={0.5} />
      {Array.from({ length: 10 }, (_, i) => <path key={i} d={`M${170 + i * 6} 76 v8`} strokeWidth={2} strokeOpacity={0.6} />)}
      <path d="M246 80 H282" strokeDasharray="3 5" strokeOpacity={0.5} />
      <text x={18} y={40} fill="currentColor" stroke="none" fontSize={13} className="font-mono" opacity={0.6}>1080p60</text>
    </Illustration>
  );
}

function Screen() {
  const rows = [14, 16, 12, 10];
  return (
    <Illustration viewBox="0 0 460 160">
      <rect x={30} y={20} width={400} height={120} rx={14} fill="currentColor" fillOpacity={0.05} />
      <rect x={70} y={38} width={250} height={84} rx={8} fill="currentColor" fillOpacity={0.08} />
      {rows.map((n, r) => (
        <g key={r}>
          <text x={82} y={62 + r * 19} fill="currentColor" stroke="none" fontSize={9} className="font-mono" opacity={0.55}>{["WIFI", "ETH", "4G/5G", "USB"][r]}</text>
          {Array.from({ length: 16 }, (_, c) => <rect key={c} x={124 + c * 12} y={55 + r * 19} width={9} height={9} rx={1.5} fill="currentColor" stroke="none" opacity={c < n ? 0.85 : 0.12} />)}
        </g>
      ))}
      <circle cx={376} cy={80} r={14} />
      <circle cx={376} cy={80} r={5} className="led-blink" fill="var(--live)" stroke="none" />
    </Illustration>
  );
}

function Relay() {
  return (
    <Illustration viewBox="0 0 460 160">
      {[34, 70, 106, 142].map((y, i) => (
        <g key={y}>
          <circle cx={36} cy={y - 4} r={4} fill="currentColor" stroke="none" opacity={i === 1 ? 0.2 : 0.85} />
          <path d={`M48 ${y - 4} H${i === 1 ? 150 : 230}`} strokeDasharray={i === 1 ? "2 6" : "0"} strokeOpacity={i === 1 ? 0.4 : 1} />
          {i === 1 && <path d="M168 54 l14 14 M182 54 l-14 14" strokeOpacity={0.6} />}
        </g>
      ))}
      <path d="M230 30 V138 M230 84 H300" />
      <rect x={300} y={60} width={110} height={48} rx={8} fill="currentColor" fillOpacity={0.06} />
      <path d="M314 84 H360" strokeWidth={3} strokeOpacity={0.55} />
      <circle cx={392} cy={84} r={3.5} className="led-blink" fill="var(--live)" stroke="none" />
    </Illustration>
  );
}

const cards = [
  { title: "Une caméra. Un câble HDMI.", text: "N'importe quelle caméra, en 1080p60, sans téléphone au milieu.", art: <Hdmi />, span: "lg:col-span-1" },
  { title: "Un écran sur le boîtier.", text: "Tu vois chaque connexion s'allumer, sans sortir ton téléphone.", art: <Screen />, span: "lg:col-span-2" },
  { title: "Une connexion lâche, le direct continue.", text: "Les autres liaisons prennent le relais, sans coupure.", art: <Relay />, span: "lg:col-span-2" },
] as const;

export default function Strengths() {
  return (
    <ul className="grid gap-4 lg:grid-cols-3">
      {cards.map((c) => (
        <li key={c.title} className={`bento-cell flex flex-col p-7 ${c.span}`}>
          <div className="h-40 w-full">{c.art}</div>
          <h3 className="mt-6 text-xl font-semibold tracking-tight">{c.title}</h3>
          <p className="mt-2 max-w-[44ch] text-sm leading-relaxed text-muted">{c.text}</p>
        </li>
      ))}
      <li className="bento-cell flex flex-col justify-between p-7 lg:col-span-1">
        <p className="font-mono text-[11px] uppercase tracking-[0.08em] text-muted">À venir</p>
        <p className="h-serif text-[clamp(2.5rem,5vw,3.75rem)]">Pas <em>cher.</em></p>
        <p className="text-sm leading-relaxed text-muted">Le principe d&apos;un TVU, au prix d&apos;un accessoire de streamer. Le tarif sera annoncé à la sortie.</p>
      </li>
    </ul>
  );
}
