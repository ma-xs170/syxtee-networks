import { siFacebook, siInstagram, siKick, siTiktok, siTwitch, siX, siYoutube } from "simple-icons";

// Réseau : le logo SYXTEE à gauche, une branche courbe et fine vers chaque plateforme, un signal doux qui glisse sur chaque branche.
// Traits en couleur d'encre (clair et sombre). prefers-reduced-motion : signal figé (voir globals.css, .cb-pulse).

const PLATFORMS = [
  { label: "YouTube", icon: siYoutube },
  { label: "Twitch", icon: siTwitch },
  { label: "Kick", icon: siKick },
  { label: "Instagram", icon: siInstagram },
  { label: "TikTok", icon: siTiktok },
  { label: "Facebook", icon: siFacebook },
  { label: "X", icon: siX },
];

const MID = 211;
const ROW = 57;
const HUB_X = 150;
const NODE_X = 730;

const branch = (i: number) => {
  const y = MID + (i - 3) * ROW;
  return { y, path: `M${HUB_X} ${MID}C${HUB_X + 190} ${MID} ${NODE_X - 230} ${y} ${NODE_X} ${y}` };
};

export default function CircuitArt({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 800 430" role="img" aria-label="Le plugin SYXTEE envoie ton direct vers YouTube, Twitch, Kick, Instagram, TikTok, Facebook et X" className={`h-auto w-full text-foreground ${className}`} fill="none" strokeLinecap="round">
      {PLATFORMS.map((p, i) => {
        const b = branch(i);
        return (
          <g key={p.label}>
            <path d={b.path} stroke="currentColor" strokeOpacity="0.16" strokeWidth="1.2" />
            <path className="cb-pulse" d={b.path} pathLength="1000" stroke="currentColor" strokeWidth="1.8" style={{ animationDelay: `${-i * 0.6}s`, filter: "drop-shadow(0 0 6px currentColor)" }} />
            <g transform={`translate(${NODE_X} ${b.y - 22})`}>
              <rect width="44" height="44" rx="12" stroke="currentColor" strokeOpacity="0.22" strokeWidth="1.2" fill="currentColor" fillOpacity="0.04" />
              <g transform="translate(10 10) scale(1)" fill="currentColor" fillOpacity="0.9" stroke="none"><path d={p.icon.path} /></g>
            </g>
          </g>
        );
      })}
      {/* centre : le logo SYXTEE */}
      <circle cx={HUB_X - 62} cy={MID} r="64" fill="currentColor" fillOpacity="0.04" stroke="currentColor" strokeOpacity="0.22" strokeWidth="1.2" />
      <image href="/logo-400.png" x={HUB_X - 62 - 20} y={MID - 28} width="40" height="56" className="ink-img" />
    </svg>
  );
}
