import CellTower from "@/components/illustrations/CellTower";
import { Illustration } from "@/components/illustrations/iso";

// « Il marche n'importe où » : six scènes filaires (trait encre, aucun aplat de couleur). Le petit boîtier de chaque scène est le vrai Encodeur (dalle basse, barre lumineuse), avec la seule LED rouge « en direct ».

/** Le boîtier SYXTEE en miniature, posé en (x, y) : coin haut-gauche. */
function Unit({ x, y, s = 1 }: { x: number; y: number; s?: number }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <path d="M3 4 H23 L26 9 V12 Q26 14 24 14 H2 Q0 14 0 12 V9 Z" fill="currentColor" fillOpacity={0.12} />
      <path d="M0 9 H26" strokeOpacity={0.45} />
      <path d="M9 11.5 H17" className="led-blink" stroke="var(--live)" strokeWidth={1.6} />
    </g>
  );
}

/** Antenne parabolique : coupelle + pied, centrée en (x, y). */
function Dish({ x, y, s = 1 }: { x: number; y: number; s?: number }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <path d="M-14 -4 Q0 12 14 -4 Z" fill="currentColor" fillOpacity={0.08} />
      <path d="M0 4 L-9 22 M0 4 L9 22 M0 -2 L8 -14" />
      <circle cx={8} cy={-15} r={1.8} fill="currentColor" stroke="none" />
    </g>
  );
}

const sea = "M10 205 q15 -8 30 0 t30 0 t30 0 t30 0 t30 0 t30 0 t30 0 t30 0 t30 0 t30 0 t30 0 t30 0 M10 222 q15 -8 30 0 t30 0 t30 0 t30 0 t30 0 t30 0 t30 0 t30 0 t30 0 t30 0 t30 0 t30 0";

function Boat() {
  return (
    <Illustration viewBox="0 0 400 240">
      <circle cx={334} cy={52} r={16} strokeDasharray="2 4" />
      <path d="M70 160 H330 L300 196 H100 Z" fill="currentColor" fillOpacity={0.06} />
      <path d="M200 158 V56 M200 62 L292 150 H200 Z M196 78 L128 150 H196 Z" />
      <path d="M126 156 H300" strokeOpacity={0.4} />
      <Dish x={252} y={134} s={0.8} />
      <Unit x={150} y={142} s={0.9} />
      <path d={sea} strokeOpacity={0.55} />
      <path d="M270 112 a24 24 0 0 1 22 -18 M270 100 a40 40 0 0 1 38 -30" strokeDasharray="3 4" strokeOpacity={0.6} />
    </Illustration>
  );
}

function Helicopter() {
  return (
    <Illustration viewBox="0 0 400 240">
      <path d="M0 226 L84 176 L146 212 L226 160 L304 214 L400 184" strokeOpacity={0.4} />
      <path d="M70 62 H316 M193 80 V62" />
      <ellipse cx={190} cy={118} rx={62} ry={36} fill="currentColor" fillOpacity={0.06} />
      <path d="M142 98 Q160 80 196 82 V116 H134 Q132 104 142 98 Z" />
      <path d="M250 108 L346 96 L350 106 L250 128 M336 98 L350 72 L358 74 L352 102" />
      <path d="M126 168 H258 M150 152 V168 M232 152 V168" />
      <path d="M124 130 l-14 4 v12 h22" />
      <Unit x={198} y={106} s={0.9} />
      <path d="M96 74 a40 40 0 0 0 -22 18" strokeDasharray="3 4" strokeOpacity={0.6} />
    </Illustration>
  );
}

function Mountain() {
  return (
    <Illustration viewBox="0 0 400 240">
      <path d="M10 210 L112 70 L160 138 L222 38 L340 210 Z" fill="currentColor" fillOpacity={0.05} />
      <path d="M112 70 L90 104 L106 96 L118 112 L130 94 L138 100 Z M222 38 L196 80 L212 70 L224 90 L238 68 L252 80 Z" />
      <path d="M10 210 H390" strokeOpacity={0.5} />
      <CellTower x={348} top={104} horizon={210} />
      <circle cx={158} cy={186} r={5} />
      <path d="M158 191 V204 M158 196 l-8 6 M158 196 l8 6 M158 204 l-6 6 M158 204 l6 6" />
      <Unit x={166} y={187} s={0.55} />
      <path d="M296 70 a28 28 0 0 1 40 14 M288 56 a46 46 0 0 1 66 22" strokeDasharray="3 4" strokeOpacity={0.6} />
    </Illustration>
  );
}

function Runner({ x, y, s = 1, unit = false }: { x: number; y: number; s?: number; unit?: boolean }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <circle cx={0} cy={-34} r={4.5} />
      <path d="M0 -29 V-12 M0 -26 l-9 8 M0 -26 l9 5 M0 -12 l-8 12 M0 -12 l9 10" />
      {unit && <Unit x={-6} y={-26} s={0.5} />}
    </g>
  );
}

function Marathon() {
  return (
    <Illustration viewBox="0 0 400 240">
      <path d="M118 222 L186 96 H214 L282 222" fill="currentColor" fillOpacity={0.04} />
      <path d="M200 100 V112 M200 128 V144 M200 160 V182 M200 198 V222" strokeDasharray="1 0" strokeOpacity={0.5} />
      <path d="M160 70 V42 H240 V70 M160 52 H240" />
      <path d="M170 70 V96 M230 70 V96" strokeOpacity={0.4} />
      <circle cx={92} cy={150} r={22} strokeOpacity={0.5} />
      <circle cx={314} cy={134} r={26} strokeOpacity={0.5} />
      <path d="M92 172 V196 M314 160 V196" strokeOpacity={0.5} />
      <Runner x={196} y={134} s={0.7} />
      <Runner x={168} y={176} s={1.1} />
      <Runner x={228} y={188} s={1.4} unit />
    </Illustration>
  );
}

function Desert() {
  return (
    <Illustration viewBox="0 0 400 240">
      <circle cx={310} cy={72} r={26} />
      <path d="M310 32 V24 M310 120 V112 M270 72 H262 M358 72 H350 M282 44 l-6 -6 M338 44 l6 -6" strokeOpacity={0.5} />
      <path d="M0 196 Q80 140 160 190 T320 172 T400 194 V240 H0 Z" fill="currentColor" fillOpacity={0.05} />
      <path d="M0 222 Q120 180 220 216 T400 210" strokeOpacity={0.5} />
      <rect x={60} y={40} width={22} height={10} rx={2} /><path d="M54 45 H60 M82 45 H88 M71 50 V56" />
      <path d="M82 52 L140 150" strokeDasharray="3 4" strokeOpacity={0.6} />
      <Dish x={146} y={168} s={1.1} />
      <Unit x={176} y={184} s={0.9} />
    </Illustration>
  );
}

function Crowd() {
  const rows = [0, 1, 2];
  return (
    <Illustration viewBox="0 0 800 240">
      <path d="M40 150 H268 V204 H40 Z" fill="currentColor" fillOpacity={0.04} />
      <rect x={78} y={56} width={152} height={78} rx={6} />
      <path d="M92 104 l22 -24 l18 18 l14 -12 l30 30" strokeOpacity={0.45} />
      <path d="M60 150 V44 M248 150 V44 M52 44 H68 M240 44 H256 M60 70 L248 70" strokeOpacity={0.5} />
      <path d="M40 204 H268" strokeOpacity={0.5} />
      {rows.map((r) =>
        Array.from({ length: 13 - r }, (_, j) => {
          const x = 300 + j * 40 + (r % 2) * 20;
          const y = 190 + r * 18 - 0;
          return (
            <g key={`${r}-${j}`} strokeOpacity={0.45 + r * 0.2}>
              <circle cx={x} cy={y - 28} r={7} />
              <path d={`M${x - 14} ${y + 6} Q${x} ${y - 20} ${x + 14} ${y + 6}`} />
              {(j + r) % 4 === 0 && <path d={`M${x + 8} ${y - 30} l6 -16 h8 v10 h-8`} />}
            </g>
          );
        }),
      )}
      <path d="M560 96 V62 M544 62 H576 M552 96 H568" />
      <Unit x={548} y={70} s={0.8} />
      <CellTower x={724} top={34} horizon={150} />
      <path d="M572 70 L720 40" strokeDasharray="3 4" strokeOpacity={0.6} />
    </Illustration>
  );
}

const scenes: { title: string; text: string; art: React.ReactNode; span: string; h: string }[] = [
  { title: "Sur un bateau", text: "Un terminal satellite en Ethernet, et le direct tient en pleine mer.", art: <Boat />, span: "lg:col-span-2", h: "h-56" },
  { title: "Dans un hélicoptère", text: "Des images aériennes en direct, sans attendre l'atterrissage.", art: <Helicopter />, span: "", h: "h-56" },
  { title: "En montagne", text: "Un sommet, un col, un sentier : la 4G et le satellite se complètent.", art: <Mountain />, span: "", h: "h-44" },
  { title: "Sur un marathon", text: "Un direct qui suit les coureurs sur 42 km, sans coupure.", art: <Marathon />, span: "", h: "h-44" },
  { title: "En plein désert", text: "Aucun réseau mobile à l'horizon : le ciel suffit.", art: <Desert />, span: "", h: "h-44" },
  { title: "Dans une foule", text: "Festival, manifestation : tes connexions se partagent, le flux reste stable.", art: <Crowd />, span: "sm:col-span-2 lg:col-span-3", h: "h-52" },
];

export default function Scenes() {
  return (
    <ul className="mt-16 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {scenes.map((s) => (
        <li key={s.title} className={`bento-cell flex flex-col p-6 ${s.span}`}>
          <div className={`${s.h} w-full`}>{s.art}</div>
          <h3 className="mt-5 text-lg font-semibold tracking-tight">{s.title}</h3>
          <p className="mt-1.5 max-w-[48ch] text-sm leading-relaxed text-muted">{s.text}</p>
        </li>
      ))}
    </ul>
  );
}
