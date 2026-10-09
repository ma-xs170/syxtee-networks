// Illustrations en fil de fer de la page Régie IA : de vrais appareils (DJI Osmo Pocket 3, iPhone, drone DJI Mini, micro) et les quatre automatismes.
// Traits en couleur d'encre ; le vert, l'ambre et le rouge ne servent qu'aux états (bonne prise, alerte, direct). Aucun texte codé en dur dans une couleur fixe.

const ink = { fill: "none", stroke: "var(--foreground)", strokeWidth: 1.5, strokeLinecap: "round", strokeLinejoin: "round" } as const;
const soft = { ...ink, strokeOpacity: 0.45 } as const;
const mono = "fill-[var(--muted)] font-mono text-[9px] uppercase tracking-[0.1em]";

/** DJI Osmo Pocket 3 : corps allongé, tête de nacelle en haut, écran, bouton. Origine en haut à gauche, 40 x 96. */
function Osmo({ x, y, on, s = 1 }: { x: number; y: number; on?: boolean; s?: number }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`} {...(on ? ink : soft)}>
      <rect x="9" y="0" width="22" height="22" rx="7" />
      <circle cx="20" cy="11" r="5.5" />
      <rect x="6" y="26" width="28" height="68" rx="9" />
      <rect x="11" y="32" width="18" height="18" rx="3" />
      <circle cx="20" cy="66" r="4.5" />
      <path d="M14 80 H26" />
    </g>
  );
}

/** iPhone vu de face : îlot dynamique, écran. 38 x 78. */
function Phone({ x, y, on, s = 1 }: { x: number; y: number; on?: boolean; s?: number }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`} {...(on ? ink : soft)}>
      <rect x="0" y="0" width="38" height="78" rx="10" />
      <rect x="13" y="5" width="12" height="4" rx="2" />
      <rect x="5" y="14" width="28" height="52" rx="3" strokeOpacity="0.5" />
      <path d="M14 73 H24" />
    </g>
  );
}

/** Drone DJI Mini : corps, quatre bras avec hélices, nacelle caméra dessous. 76 x 56. */
function Drone({ x, y, on, s = 1 }: { x: number; y: number; on?: boolean; s?: number }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`} {...(on ? ink : soft)}>
      <rect x="28" y="16" width="20" height="14" rx="5" />
      <path d="M28 20 L10 10 M48 20 L66 10 M28 28 L12 40 M48 28 L64 40" />
      <ellipse cx="8" cy="9" rx="8" ry="2.5" />
      <ellipse cx="68" cy="9" rx="8" ry="2.5" />
      <ellipse cx="9" cy="41" rx="8" ry="2.5" />
      <ellipse cx="67" cy="41" rx="8" ry="2.5" />
      <rect x="34" y="31" width="8" height="8" rx="3" />
      <circle cx="38" cy="35" r="1.6" />
    </g>
  );
}

/** Un appareil seul (0 Osmo, 1 iPhone, 2 drone), pour les vignettes de la démo. */
export function DeviceGlyph({ cam, on }: { cam: number; on?: boolean }) {
  return (
    <svg viewBox="0 0 80 100" aria-hidden="true" className="h-full w-full" strokeWidth="1.5">
      {cam === 0 && <Osmo x={20} y={2} on={on} />}
      {cam === 1 && <Phone x={21} y={11} on={on} />}
      {cam === 2 && <Drone x={2} y={22} on={on} s={1.02} />}
    </svg>
  );
}

function Frame({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <svg viewBox="0 0 360 170" role="img" aria-label={label} className="h-full w-full" strokeWidth="1.5">
      {children}
    </svg>
  );
}

/** 1. Régie IA : trois vrais appareils, un nœud IA, un écran Programme. L'iPhone est choisi. */
export function MultiCamVisual() {
  return (
    <Frame label="Un Osmo, un iPhone et un drone envoient leurs images à l'IA, qui met l'iPhone au programme">
      <Osmo x={14} y={6} s={0.5} />
      <Phone x={16} y={64} s={0.6} on />
      <Drone x={6} y={122} s={0.6} />
      <text x={44} y={34} className={mono}>Osmo Pocket 3</text>
      <text x={46} y={92} className={mono}>iPhone</text>
      <text x={56} y={144} className={mono}>Drone</text>
      {/* traits vers l'IA : le trait de la caméra choisie circule */}
      <path d="M136 30 C154 30 154 82 172 86" {...soft} />
      <path d="M136 88 C150 88 158 88 172 88" {...ink} className="bond-dash" />
      <path d="M136 140 C154 140 154 94 172 90" {...soft} />
      <rect x={172} y={64} width={48} height={48} rx={12} {...ink} />
      <text x={196} y={92} textAnchor="middle" className="fill-[var(--foreground)] font-mono text-[13px]">IA</text>
      <path d="M220 88 H250" {...ink} className="bond-dash" />
      {/* écran Programme */}
      <rect x={250} y={42} width={102} height={92} rx={10} {...ink} />
      <rect x={258} y={50} width={86} height={58} rx={4} {...soft} />
      <Phone x={288} y={54} s={0.5} on />
      <circle cx={262} cy={122} r={3} fill="var(--live)" />
      <text x={270} y={125} className={mono}>Programme</text>
    </Frame>
  );
}

/** 2. Autogérance : une ligne de temps où le drone prend l'antenne le temps d'une belle prise, puis retour sur Live. */
export function TakesVisual() {
  return (
    <Frame label="Ligne de temps : la scène Live, puis le drone pendant une belle prise, puis retour sur Live">
      <Drone x={142} y={14} on />
      <path d="M180 62 V84" {...soft} strokeDasharray="3 4" />
      {/* piste */}
      <rect x="20" y="88" width="320" height="30" rx="8" {...soft} />
      <rect x="20" y="88" width="132" height="30" rx="8" {...soft} fill="var(--foreground)" fillOpacity="0.08" />
      <rect x="152" y="88" width="64" height="30" rx="8" fill="var(--ok)" fillOpacity="0.22" stroke="var(--ok)" strokeWidth="1.5" />
      <rect x="216" y="88" width="124" height="30" rx="8" {...soft} fill="var(--foreground)" fillOpacity="0.08" />
      <text x="86" y="107" textAnchor="middle" className="fill-[var(--foreground)] font-mono text-[10px] uppercase">Live</text>
      <text x="184" y="107" textAnchor="middle" className="fill-[var(--foreground)] font-mono text-[10px] uppercase">Drone</text>
      <text x="278" y="107" textAnchor="middle" className="fill-[var(--foreground)] font-mono text-[10px] uppercase">Live</text>
      <text x="146" y="138" textAnchor="end" className={mono}>belle prise</text>
      <text x="222" y="138" textAnchor="start" className={mono}>prise finie</text>
      <path d="M152 122 V128 M216 122 V128" {...soft} />
    </Frame>
  );
}

/** 3. Secours : le débit s'effondre, OBS passe sur la scène de secours, puis revient. */
export function BackupVisual() {
  return (
    <Frame label="Le débit s'effondre, OBS passe sur la scène de secours puis revient sur Live quand le flux repart">
      {/* courbe de débit */}
      <path d="M20 40 H20 L60 36 L100 44 L130 40 L150 100 L170 128 H240 L262 70 L290 44 L340 40" {...ink} />
      <path d="M150 100 L170 128 H240 L262 70" stroke="var(--warn)" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M20 128 H340" {...soft} strokeDasharray="3 5" />
      <text x="20" y="22" className={mono}>débit</text>
      <text x="200" y="146" textAnchor="middle" className={mono}>coupure</text>
      {/* scènes */}
      <rect x="40" y="76" width="64" height="26" rx="8" {...soft} />
      <text x="72" y="93" textAnchor="middle" className="fill-[var(--foreground)] font-mono text-[10px] uppercase">Live</text>
      <rect x="170" y="76" width="96" height="26" rx="8" fill="var(--warn)" fillOpacity="0.2" stroke="var(--warn)" strokeWidth="1.5" />
      <text x="218" y="93" textAnchor="middle" className="fill-[var(--foreground)] font-mono text-[10px] uppercase">Secours</text>
      <rect x="290" y="76" width="50" height="26" rx="8" {...soft} />
      <text x="315" y="93" textAnchor="middle" className="fill-[var(--foreground)] font-mono text-[10px] uppercase">Live</text>
    </Frame>
  );
}

/** 4. Garde audio : micro, signal qui s'éteint, alerte. */
export function AudioVisual() {
  const bars = [14, 26, 18, 34, 28, 40, 22, 30, 0, 0, 0, 0, 0];
  return (
    <Frame label="Le signal du micro devient plat, une alerte silence apparaît">
      {/* micro */}
      <g transform="translate(26 40)" {...ink}>
        <rect x="14" y="0" width="22" height="42" rx="11" />
        <path d="M6 30 C6 50 44 50 44 30 M25 52 V68 M14 68 H36" />
      </g>
      {/* signal */}
      {bars.map((h, i) => (
        <rect key={i} x={100 + i * 17} y={85 - Math.max(h, 2) / 2} width="9" height={Math.max(h, 2)} rx="3" fill={h ? "var(--ok)" : "var(--muted)"} fillOpacity={h ? 0.85 : 0.5} />
      ))}
      {/* alerte */}
      <rect x="210" y="118" width="130" height="30" rx="9" fill="var(--warn)" fillOpacity="0.2" stroke="var(--warn)" strokeWidth="1.5" />
      <text x="275" y="137" textAnchor="middle" className="fill-[var(--foreground)] font-mono text-[10px] uppercase">Silence 10 s</text>
    </Frame>
  );
}
