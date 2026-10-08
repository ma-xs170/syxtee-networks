import { siFacebook, siInstagram, siKick, siTiktok, siTwitch, siX, siYoutube } from "simple-icons";

// Carte mère : la puce SYXTEE à gauche, une piste par plateforme (coudes à 45°), une lumière qui court sur chaque piste jusqu'au logo.
// Traits en couleur d'encre (clair et sombre). prefers-reduced-motion : lumières figées (voir globals.css, .cb-pulse).

const PLATFORMS = [
  { label: "YouTube", icon: siYoutube },
  { label: "Twitch", icon: siTwitch },
  { label: "Kick", icon: siKick },
  { label: "Instagram", icon: siInstagram },
  { label: "TikTok", icon: siTiktok },
  { label: "Facebook", icon: siFacebook },
  { label: "X", icon: siX },
];

const MID = 211; // axe de la puce et du logo central
const PIN_STEP = 14;
const ROW_STEP = 57;
const NODE_X = 700;

const track = (i: number) => {
  const k = i - 3;
  const pin = MID + k * PIN_STEP;
  const target = MID + k * ROW_STEP;
  const bend = 270 + (3 - Math.abs(k)) * 0 + (k < 0 ? i : 6 - i) * 18;
  const d = Math.abs(target - pin);
  const dir = target < pin ? -1 : 1;
  const path = d === 0 ? `M210 ${pin}H${NODE_X}` : `M210 ${pin}H${bend}L${bend + d} ${target}H${NODE_X}`;
  return { pin, target, path, bendEnd: bend + d };
};

export default function CircuitArt({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 900 430" role="img" aria-label="Le plugin SYXTEE envoie ton direct vers YouTube, Twitch, Kick, Instagram, TikTok, Facebook et X" className={`h-auto w-full text-foreground ${className}`} fill="none" strokeLinecap="round" strokeLinejoin="round">
      {/* puce */}
      <rect x="30" y="140" width="180" height="142" rx="16" stroke="currentColor" strokeWidth="1.5" fill="currentColor" fillOpacity="0.05" />
      <rect x="46" y="156" width="148" height="110" rx="8" stroke="currentColor" strokeOpacity="0.3" />
      <path d="M62 174h26M152 174h26M62 258h26M152 258h26" stroke="currentColor" strokeOpacity="0.25" />
      <text x="120" y="216" textAnchor="middle" fontSize="15" fontWeight="600" letterSpacing="3" fill="currentColor" fontFamily="var(--font-mono), monospace">SYXTEE</text>
      <text x="120" y="236" textAnchor="middle" fontSize="9" letterSpacing="2" fill="currentColor" fillOpacity="0.55" fontFamily="var(--font-mono), monospace">PLUGIN OBS</text>
      {PLATFORMS.map((p, i) => {
        const t = track(i);
        return (
          <g key={p.label}>
            {/* piste */}
            <path d={t.path} stroke="currentColor" strokeOpacity="0.28" strokeWidth="1.4" />
            {/* plot de départ et d'arrivée */}
            <circle cx="210" cy={t.pin} r="3" fill="currentColor" fillOpacity="0.6" />
            <circle cx={t.bendEnd} cy={t.target} r="2.2" fill="currentColor" fillOpacity="0.35" />
            {/* lumière qui court */}
            <path className="cb-pulse" d={t.path} pathLength="1000" stroke="currentColor" strokeWidth="2.2" style={{ animationDelay: `${-i * 0.55}s`, filter: "drop-shadow(0 0 5px currentColor) drop-shadow(0 0 11px currentColor)" }} />
            {/* logo */}
            <g transform={`translate(${NODE_X} ${t.target - 23})`}>
              <rect width="46" height="46" rx="12" stroke="currentColor" strokeOpacity="0.5" strokeWidth="1.4" fill="currentColor" fillOpacity="0.05" />
              <g transform="translate(11 11) scale(1)" fill="currentColor" stroke="none"><path d={p.icon.path} /></g>
            </g>
            <text x={NODE_X + 60} y={t.target + 4} fontSize="11" letterSpacing="1.5" fill="currentColor" fillOpacity="0.6" fontFamily="var(--font-mono), monospace">{p.label.toUpperCase()}</text>
          </g>
        );
      })}
    </svg>
  );
}
