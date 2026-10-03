// Mire fictive (barres SMPTE) pour un relais sans signal. Composant autonome : dessin 100 % local en SVG et CSS,
// AUCUNE requête réseau, aucune image ni flux venant d'un serveur. Elle ne vit que dans l'interface : elle ne peut pas
// être confondue avec un vrai signal, et rien ici n'est jamais envoyé dans la sortie RTMP / PROGRAM.

// Barres à 75 % (blanc, jaune, cyan, vert, magenta, rouge, bleu), bande inversée, puis la rangée du bas (-I, blanc, +Q, noirs).
const BARS = ["#bfbfbf", "#bfbf00", "#00bfbf", "#00bf00", "#bf00bf", "#bf0000", "#0000bf"];
const REVERSE = ["#0000bf", "#131313", "#bf00bf", "#131313", "#00bfbf", "#131313", "#bfbfbf"];
const BOTTOM: [string, number][] = [
  ["#00214c", 1.25],
  ["#ebebeb", 1.25],
  ["#32006a", 1.25],
  ["#131313", 1.25],
  ["#050505", 0.34],
  ["#131313", 0.34],
  ["#1d1d1d", 0.34],
  ["#131313", 0.98],
];

// Départ de chaque bloc de la rangée du bas (cumul des largeurs).
const BOTTOM_X = BOTTOM.map((_, i) => BOTTOM.slice(0, i).reduce((a, [, bw]) => a + bw, 0));

export default function TestPattern({ label, compact = false }: { label: string; compact?: boolean }) {
  const w = 7;
  return (
    <div className="absolute inset-0 overflow-hidden bg-black" role="img" aria-label={`Mire fictive, signal absent : ${label}`}>
      <svg viewBox="0 0 7 4" preserveAspectRatio="none" className="absolute inset-0 h-full w-full" aria-hidden="true">
        {BARS.map((c, i) => (
          <rect key={c} x={i} y={0} width={1.0 + 0.01} height={2.68} fill={c} />
        ))}
        {REVERSE.map((c, i) => (
          <rect key={i} x={i} y={2.68} width={1.01} height={0.32} fill={c} />
        ))}
        {BOTTOM.map(([c, bw], i) => (
          <rect key={i} x={BOTTOM_X[i]} y={3} width={bw + 0.01} height={1} fill={c} />
        ))}
        {/* Bruit léger, généré dans le navigateur. */}
        <filter id="tp-noise" x="0" y="0" width="100%" height="100%">
          <feTurbulence type="fractalNoise" baseFrequency="2.4" numOctaves="1" seed="4" />
          <feColorMatrix type="saturate" values="0" />
        </filter>
        <rect width={w} height={4} filter="url(#tp-noise)" opacity="0.1" />
      </svg>
      {/* Lignes de balayage qui défilent. */}
      <div aria-hidden="true" className="tp-scan pointer-events-none absolute inset-0 opacity-30 [background:repeating-linear-gradient(0deg,transparent_0_2px,rgb(0_0_0/0.55)_2px_3px)]" />
      <div className="absolute inset-x-0 top-1/2 flex -translate-y-1/2 justify-center px-2">
        <p className={`max-w-full truncate rounded bg-black/80 text-center font-mono font-semibold tracking-[0.18em] text-white ${compact ? "px-1.5 py-0.5 text-[8px]" : "px-3 py-1.5 text-xs"}`}>
          SIGNAL ABSENT
          {!compact && <span className="mt-0.5 block text-[10px] font-normal tracking-[0.12em] text-white/70">{label}</span>}
        </p>
      </div>
      <span className={`absolute right-1 top-1 rounded bg-black/70 font-mono font-semibold tracking-[0.14em] text-white/70 ${compact ? "px-1 py-px text-[7px]" : "px-1.5 py-0.5 text-[9px]"}`}>MIRE</span>
    </div>
  );
}
