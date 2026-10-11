import CellTower from "@/components/illustrations/CellTower";
import { Illustration } from "@/components/illustrations/iso";

// « Il marche n'importe où » : six scènes filaires en trait encre (aucun aplat de couleur), avec profondeur (plans successifs, traits plus fins au loin).
// Le boîtier de chaque scène est le vrai Encodeur (dalle basse, barre lumineuse) ; la seule LED rouge est la barre « en direct ».

/** Le boîtier SYXTEE, vu de 3/4 : dessus, façade, barre lumineuse. Coin haut-gauche en (x, y), 40 x 17 avant échelle. */
function Unit({ x, y, s = 1 }: { x: number; y: number; s?: number }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <path d="M7 0 H33 L40 8 H0 Z" fill="currentColor" fillOpacity={0.14} />
      <path d="M0 8 H40 V14 Q40 17 37 17 H3 Q0 17 0 14 Z" fill="currentColor" fillOpacity={0.07} />
      <path d="M14 12.5 H26" className="led-blink" stroke="var(--live)" strokeWidth={2} />
    </g>
  );
}

/** Satellite : corps, deux panneaux quadrillés, antenne. Centré en (x, y). */
function Satellite({ x, y, s = 1 }: { x: number; y: number; s?: number }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <rect x={-7} y={-6} width={14} height={12} rx={2} fill="currentColor" fillOpacity={0.1} />
      <path d="M-7 0 H-12 M7 0 H12" />
      <rect x={-38} y={-7} width={26} height={14} rx={1} />
      <rect x={12} y={-7} width={26} height={14} rx={1} />
      <path d="M-29 -7 V7 M-20 -7 V7 M-38 0 H-12 M20 -7 V7 M29 -7 V7 M12 0 H38" strokeOpacity={0.45} strokeWidth={0.8} />
      <path d="M0 -6 V-12" />
      <circle cx={0} cy={-13} r={2} fill="currentColor" stroke="none" />
    </g>
  );
}

/** Antenne parabolique sur trépied, centrée en (x, y). */
function Dish({ x, y, s = 1 }: { x: number; y: number; s?: number }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <ellipse cx={0} cy={-6} rx={16} ry={5} fill="currentColor" fillOpacity={0.08} />
      <path d="M-16 -6 Q0 18 16 -6" fill="currentColor" fillOpacity={0.05} />
      <path d="M0 6 L-10 26 M0 6 L10 26 M0 6 V26 M0 -6 L10 -20" />
      <circle cx={10} cy={-21} r={2} fill="currentColor" stroke="none" />
    </g>
  );
}

/** Nuage : trait fin. */
function Cloud({ x, y, s = 1, o = 0.35 }: { x: number; y: number; s?: number; o?: number }) {
  return <path transform={`translate(${x} ${y}) scale(${s})`} d="M0 0 H46 A9 9 0 0 0 40 -14 A13 13 0 0 0 16 -18 A10 10 0 0 0 0 0 Z" strokeOpacity={o} />;
}

/** Semis d'étoiles (plus ou points), position fixe pour un rendu stable. */
function Stars({ pts }: { pts: [number, number, number?][] }) {
  return (
    <g stroke="none" fill="currentColor">
      {pts.map(([x, y, r = 1], i) => (
        <circle key={i} cx={x} cy={y} r={r} opacity={0.25 + (i % 4) * 0.12} />
      ))}
    </g>
  );
}

/** Arcs de signal pointillés. */
function Signal({ x, y, flip = false }: { x: number; y: number; flip?: boolean }) {
  const d = flip ? -1 : 1;
  return (
    <g transform={`translate(${x} ${y}) scale(${d} 1)`} strokeDasharray="2 4" strokeOpacity={0.6}>
      <path d="M8 -8 A12 12 0 0 1 8 8" />
      <path d="M16 -16 A24 24 0 0 1 16 16" />
      <path d="M24 -24 A36 36 0 0 1 24 24" />
    </g>
  );
}

const waves = (y: number, amp: number, step: number) => {
  let d = `M-10 ${y}`;
  for (let x = -10; x < 500; x += step) d += ` q${step / 4} ${-amp} ${step / 2} 0 t${step / 2} 0`;
  return d;
};

function Boat() {
  return (
    <Illustration viewBox="0 0 480 300">
      <Stars pts={[[30, 30, 1.2], [76, 62], [124, 24], [210, 44, 1.4], [262, 20], [300, 70], [452, 28, 1.2], [420, 96], [60, 110], [470, 150]]} />
      {/* soleil bas sur l'horizon, rayé */}
      <path d="M282 196 A58 58 0 0 1 398 196" />
      <path d="M296 168 H384 M290 178 H390 M286 187 H394" strokeOpacity={0.5} />
      <path d="M0 196 H480" strokeOpacity={0.55} />
      {/* mer : rangées de vagues plus larges vers l'avant, reflet du soleil */}
      <path d={waves(206, 2, 28)} strokeOpacity={0.4} />
      <path d={waves(220, 3, 40)} strokeOpacity={0.5} />
      <path d={waves(240, 4, 56)} strokeOpacity={0.6} />
      <path d={waves(266, 5, 80)} strokeOpacity={0.7} />
      <path d="M318 206 H362 M308 222 H372 M300 242 H380" strokeOpacity={0.35} strokeDasharray="10 8" />
      {/* voilier */}
      <path d="M170 226 V80" />
      <path d="M176 88 L236 198 H176 Z M164 96 L110 198 H164 Z" fill="currentColor" fillOpacity={0.05} />
      <path d="M176 126 Q205 134 220 160 M176 156 Q200 164 212 182 M164 128 Q140 136 128 160 M164 160 Q146 168 138 182" strokeOpacity={0.4} strokeWidth={0.9} />
      <path d="M170 80 l16 -5 l-16 -5" fill="currentColor" fillOpacity={0.2} />
      <path d="M170 80 L88 218 M170 80 L262 218" strokeOpacity={0.3} strokeWidth={0.8} />
      <path d="M176 198 H238" />
      <path d="M82 218 H266 L242 252 H108 Z" fill="currentColor" fillOpacity={0.07} />
      <path d="M88 228 H260" strokeOpacity={0.45} />
      {[124, 146, 168, 190, 212].map((x) => <circle key={x} cx={x} cy={238} r={3.2} strokeOpacity={0.6} />)}
      {/* à bord : l'Encodeur et le terminal satellite */}
      <Unit x={112} y={201} s={0.8} />
      <Dish x={242} y={205} s={0.62} />
      {/* liaison vers le satellite */}
      <Satellite x={402} y={64} s={0.9} />
      <path d="M252 188 C 300 150, 350 100, 392 78" strokeDasharray="3 5" strokeOpacity={0.7} />
      <Signal x={254} y={186} />
      <text x={314} y={134} fill="currentColor" stroke="none" fontSize={9} className="font-mono" opacity={0.55}>SAT</text>
    </Illustration>
  );
}

function Helicopter() {
  return (
    <Illustration viewBox="0 0 480 300">
      <Stars pts={[[40, 40], [110, 26, 1.3], [380, 30], [430, 70, 1.3], [52, 96], [454, 128]]} />
      <Cloud x={20} y={110} s={1.2} />
      <Cloud x={360} y={86} s={0.9} o={0.25} />
      {/* crêtes en couches */}
      <path d="M0 262 L60 214 L110 240 L180 188 L250 244 L320 200 L390 246 L480 206 V300 H0 Z" fill="currentColor" fillOpacity={0.04} strokeOpacity={0.45} />
      <path d="M0 284 L70 250 L150 276 L240 240 L330 280 L420 250 L480 270" strokeOpacity={0.7} />
      <path d="M0 296 H480" strokeOpacity={0.3} />
      {/* rotor : flou de pales */}
      <ellipse cx={230} cy={84} rx={150} ry={9} fill="currentColor" fillOpacity={0.05} strokeOpacity={0.35} />
      <path d="M96 84 H364" />
      <path d="M230 84 V104" />
      {/* cellule */}
      <path d="M130 150 C130 118 168 104 214 104 C268 104 296 124 302 150 C306 172 286 190 250 190 H170 C146 190 130 174 130 150 Z" fill="currentColor" fillOpacity={0.08} />
      <path d="M140 140 C146 120 172 112 204 112 V150 H136 Z M214 112 C250 112 276 124 288 150 H214 Z" strokeOpacity={0.8} />
      <path d="M204 112 V150" />
      <path d="M290 140 L420 118 L430 128 L296 166" fill="currentColor" fillOpacity={0.05} />
      <path d="M408 120 L424 82 L436 84 L428 124" />
      <path d="M400 112 H452 M426 104 V140" strokeOpacity={0.55} />
      <circle cx={426} cy={122} r={14} strokeOpacity={0.35} />
      {/* patins, nacelle caméra */}
      <path d="M150 208 H292 M176 190 V208 M262 190 V208 M150 208 Q140 208 138 198" />
      <path d="M144 176 L122 192 H150 L158 182 Z" fill="currentColor" fillOpacity={0.1} />
      <circle cx={127} cy={197} r={7} />
      <circle cx={127} cy={197} r={2.4} fill="currentColor" stroke="none" />
      {/* le boîtier, visible dans l'habitacle */}
      <Unit x={218} y={132} s={0.9} />
      <path d="M236 150 V160" strokeOpacity={0.4} />
      {/* liaison vers une antenne sur la crête */}
      <CellTower x={96} top={180} horizon={218} />
      <path d="M126 192 L104 184" strokeDasharray="3 4" strokeOpacity={0.6} />
      <Signal x={316} y={134} />
    </Illustration>
  );
}

function Pine({ x, y, s = 1 }: { x: number; y: number; s?: number }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <path d="M0 -26 L9 -10 H4 L12 4 H-12 L-4 -10 H-9 Z" fill="currentColor" fillOpacity={0.06} />
      <path d="M0 4 V10" />
    </g>
  );
}

function Mountain() {
  return (
    <Illustration viewBox="0 0 480 300">
      <Stars pts={[[40, 30], [96, 60, 1.3], [160, 24], [300, 32], [352, 70, 1.2], [440, 36], [66, 120]]} />
      <circle cx={382} cy={64} r={22} />
      {/* massifs lointains puis proches */}
      <path d="M0 214 L70 140 L120 188 L186 110 L260 204 L330 150 L400 200 L480 160 V300 H0 Z" fill="currentColor" fillOpacity={0.03} strokeOpacity={0.4} />
      <path d="M-4 268 L96 118 L150 196 L226 36 L330 216 L372 170 L480 268 Z" fill="currentColor" fillOpacity={0.06} />
      {/* neige et hachures de relief */}
      <path d="M226 36 L196 92 L214 80 L228 106 L244 76 L256 88 Z M96 118 L72 156 L88 148 L100 168 L112 146 L122 156 Z" fill="currentColor" fillOpacity={0.12} />
      <path d="M226 106 L196 196 M236 110 L214 210 M248 100 L246 220 M258 90 L286 214 M96 168 L72 234 M110 168 L100 244 M122 156 L140 232" strokeOpacity={0.3} strokeWidth={0.8} />
      <path d="M-4 268 H484" strokeOpacity={0.6} />
      {/* sentier et sapins */}
      <path d="M140 296 C 160 280, 200 276, 214 262 S 250 244, 262 236" strokeDasharray="3 6" strokeOpacity={0.5} />
      {[[40, 266, 1.1], [64, 270, 0.9], [92, 264, 1.2], [350, 266, 1], [380, 270, 1.3], [412, 264, 1]].map(([x, y, s], i) => <Pine key={i} x={x} y={y} s={s} />)}
      {/* l'antenne-relais sur la crête */}
      <CellTower x={414} top={110} horizon={206} />
      <Signal x={420} y={112} flip />
      {/* le randonneur et son sac */}
      <g transform="translate(236 252)">
        <circle cx={0} cy={-40} r={6} />
        <path d="M0 -34 V-12 M0 -30 l-10 14 M0 -30 l10 12 M0 -12 l-8 20 M0 -12 l9 20" />
        <path d="M-12 -34 H-4 V-14 H-12 Z" fill="currentColor" fillOpacity={0.1} />
      </g>
      <Unit x={206} y={209} s={0.55} />
      <path d="M244 218 C 300 190, 360 150, 408 124" strokeDasharray="3 5" strokeOpacity={0.6} />
    </Illustration>
  );
}

function Runner({ x, y, s = 1, unit = false }: { x: number; y: number; s?: number; unit?: boolean }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <circle cx={0} cy={-42} r={5.5} />
      <path d="M0 -36 L-2 -16 M-1 -32 L-12 -22 L-18 -28 M-1 -32 L10 -24 L16 -34 M-2 -16 L-14 -2 L-22 -6 M-2 -16 L10 -4 L8 8" />
      {unit && <Unit x={-9} y={-33} s={0.38} />}
    </g>
  );
}

function Marathon() {
  return (
    <Illustration viewBox="0 0 480 300">
      <Stars pts={[[40, 26], [120, 50, 1.2], [380, 24], [440, 60], [310, 40]]} />
      {/* route en perspective, ligne médiane pointillée, barrières */}
      <path d="M150 300 L224 112 H256 L330 300" fill="currentColor" fillOpacity={0.04} />
      <path d="M240 118 V132 M240 146 V168 M240 184 V214 M240 232 V268 M240 284 V300" strokeOpacity={0.55} />
      <path d="M0 112 H480" strokeOpacity={0.35} />
      <path d="M214 116 L96 300 M266 116 L384 300" strokeOpacity={0.35} />
      {[0, 1, 2, 3, 4, 5].map((i) => {
        const t = i / 5, y = 128 + t * 160, off = 22 + t * 66;
        return <path key={i} d={`M${240 - off - 18} ${y} h${14 + t * 6} M${240 + off + 4} ${y} h${14 + t * 6}`} strokeOpacity={0.4 + t * 0.4} />;
      })}
      {/* arche d'arrivée */}
      <path d="M200 112 V62 H280 V112 M200 74 H280" />
      <path d="M212 68 H268" strokeDasharray="1 4" strokeOpacity={0.6} />
      <text x={240} y={103} textAnchor="middle" fill="currentColor" stroke="none" fontSize={8} className="font-mono" opacity={0.7}>42,195 KM</text>
      {/* arbres */}
      <circle cx={80} cy={158} r={22} strokeOpacity={0.45} /><path d="M80 180 V212" strokeOpacity={0.45} />
      <circle cx={402} cy={146} r={26} strokeOpacity={0.45} /><path d="M402 172 V212" strokeOpacity={0.45} />
      <circle cx={34} cy={196} r={14} strokeOpacity={0.3} /><path d="M34 210 V226" strokeOpacity={0.3} />
      {/* coureurs, du plus loin au plus proche */}
      <Runner x={238} y={156} s={0.5} />
      <Runner x={256} y={176} s={0.7} />
      <Runner x={218} y={206} s={1} />
      <Runner x={276} y={268} s={1.45} unit />
      {/* drone qui suit le groupe */}
      <g transform="translate(332 80)">
        <rect x={-10} y={-4} width={20} height={8} rx={3} fill="currentColor" fillOpacity={0.1} />
        <path d="M-10 -2 L-24 -8 M10 -2 L24 -8 M-30 -10 H-18 M18 -10 H30" />
        <circle cx={0} cy={9} r={3} />
      </g>
      <path d="M322 92 L282 238" strokeDasharray="3 5" strokeOpacity={0.5} />
    </Illustration>
  );
}

function Desert() {
  return (
    <Illustration viewBox="0 0 480 300">
      <Stars pts={[[36, 30], [90, 66, 1.2], [150, 28], [220, 52], [300, 26, 1.3], [44, 120]]} />
      {/* soleil et rayons */}
      <circle cx={366} cy={92} r={36} />
      <path d="M366 40 V28 M366 156 V144 M314 92 H302 M430 92 H418 M328 54 l-8 -8 M404 54 l8 -8 M328 130 l-8 8 M404 130 l8 8" strokeOpacity={0.5} />
      {/* dunes, rides de sable */}
      <path d="M-4 204 Q80 148 170 198 T340 184 T484 206 V300 H-4 Z" fill="currentColor" fillOpacity={0.05} strokeOpacity={0.55} />
      <path d="M-4 252 Q110 202 230 246 T484 238 V300 H-4 Z" fill="currentColor" fillOpacity={0.07} />
      <path d="M40 222 q18 -8 36 0 M110 214 q16 -8 32 0 M290 206 q16 -8 32 0 M372 222 q16 -8 32 0 M60 270 q22 -8 44 0 M330 262 q22 -8 44 0" strokeOpacity={0.4} strokeWidth={0.9} />
      {/* cactus */}
      <g transform="translate(70 232)" strokeOpacity={0.8}>
        <path d="M0 0 V-50 M0 -20 H-14 V-34 M0 -30 H14 V-42" />
        <path d="M-4 0 H4" />
      </g>
      {/* installation : parabole, boîtier, empreintes */}
      <Dish x={206} y={226} s={1.15} />
      <Unit x={246} y={238} s={0.95} />
      <path d="M216 218 C 250 168, 290 118, 322 80" strokeDasharray="3 5" strokeOpacity={0.7} />
      <Signal x={218} y={206} />
      <Satellite x={338} y={52} s={0.85} />
      <text x={282} y={150} fill="currentColor" stroke="none" fontSize={9} className="font-mono" opacity={0.55}>SAT</text>
      <path d="M146 276 h4 M158 268 h4 M170 262 h4 M182 254 h4" strokeOpacity={0.4} strokeWidth={2} />
    </Illustration>
  );
}

function Person({ x, y, s = 1, up = false }: { x: number; y: number; s?: number; up?: boolean }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <circle cx={0} cy={-32} r={5.5} />
      <path d="M0 -26 V-8 M0 -8 l-6 14 M0 -8 l6 14" />
      <path d={up ? "M0 -22 l-9 -16 M0 -22 l9 -16" : "M0 -22 l-8 12 M0 -22 l8 12"} />
    </g>
  );
}

function Crowd() {
  const rows = [
    { y: 168, s: 0.7, n: 25, o: 0.28 },
    { y: 190, s: 0.85, n: 22, o: 0.4 },
    { y: 218, s: 1.05, n: 19, o: 0.58 },
    { y: 252, s: 1.3, n: 15, o: 0.85 },
  ];
  return (
    <Illustration viewBox="0 0 960 300">
      <Stars pts={[[40, 30], [120, 60, 1.3], [260, 24], [380, 56], [520, 30, 1.2], [640, 70], [760, 28], [860, 52, 1.3], [920, 100], [70, 110]]} />
      {/* faisceaux de projecteurs */}
      <path d="M260 12 L210 150 M260 12 L320 150 M480 12 L420 150 M480 12 L540 150 M700 12 L650 150 M700 12 L760 150" strokeOpacity={0.2} strokeWidth={0.9} />
      <circle cx={260} cy={8} r={6} /><circle cx={480} cy={8} r={6} /><circle cx={700} cy={8} r={6} />
      <path d="M0 160 H960" strokeOpacity={0.3} />
      {/* foule : rangées en profondeur, bras levés */}
      {rows.map((r, i) => (
        <g key={i} strokeOpacity={r.o}>
          {Array.from({ length: r.n }, (_, j) => (
            <Person key={j} x={30 + j * ((900 - (i % 2) * 20) / (r.n - 1)) + (i % 2) * 14} y={r.y + (j % 3) * 2} s={r.s} up={(j * 7 + i * 3) % 5 === 0} />
          ))}
        </g>
      ))}
      {/* l'antenne-relais au loin, l'Encodeur au premier plan */}
      <CellTower x={846} top={52} horizon={160} />
      <Signal x={852} y={54} flip />
      <Unit x={432} y={266} s={1.4} />
      <path d="M494 272 C 600 250, 740 150, 836 70" strokeDasharray="3 6" strokeOpacity={0.55} />
      <Signal x={496} y={274} />
    </Illustration>
  );
}

const scenes: { title: string; text: string; art: React.ReactNode; span: string; h: string }[] = [
  { title: "Sur un bateau", text: "Un terminal satellite en Ethernet, et le direct tient en pleine mer.", art: <Boat />, span: "lg:col-span-2", h: "h-72" },
  { title: "Dans un hélicoptère", text: "Des images aériennes en direct, sans attendre l'atterrissage.", art: <Helicopter />, span: "", h: "h-72" },
  { title: "En montagne", text: "Un sommet, un col, un sentier : la 4G et le satellite se complètent.", art: <Mountain />, span: "", h: "h-60" },
  { title: "Sur un marathon", text: "Un direct qui suit les coureurs sur 42 km, sans coupure.", art: <Marathon />, span: "", h: "h-60" },
  { title: "En plein désert", text: "Aucun réseau mobile à l'horizon : le ciel suffit.", art: <Desert />, span: "", h: "h-60" },
  { title: "Dans une foule", text: "Festival, manifestation : tes connexions se partagent, le flux reste stable.", art: <Crowd />, span: "sm:col-span-2 lg:col-span-3", h: "h-72" },
];

export default function Scenes() {
  return (
    <ul className="mt-16 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {scenes.map((s) => (
        <li key={s.title} className={`bento-cell flex flex-col p-5 ${s.span}`}>
          <div className={`${s.h} w-full`}>{s.art}</div>
          <h3 className="mt-5 px-2 text-lg font-semibold tracking-tight">{s.title}</h3>
          <p className="mt-1.5 max-w-[48ch] px-2 pb-1 text-sm leading-relaxed text-muted">{s.text}</p>
        </li>
      ))}
    </ul>
  );
}
