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

const CX = 380;
const HUB_Y = 36;
const NODE_Y = 150;
const STEP = 104;

const branch = (i: number) => {
  const x = CX + (i - 3) * STEP;
  return { x, path: `M${CX} ${HUB_Y + 28}C${CX} ${HUB_Y + 80} ${x} ${NODE_Y - 52} ${x} ${NODE_Y}` };
};

export default function CircuitArt({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 760 200" role="img" aria-label="Le plugin SYXTEE envoie ton direct vers YouTube, Twitch, Kick, Instagram, TikTok, Facebook et X" className={`h-auto w-full text-foreground ${className}`} fill="none" strokeLinecap="round">
      {PLATFORMS.map((p, i) => {
        const b = branch(i);
        return (
          <g key={p.label}>
            <path d={b.path} stroke="currentColor" strokeOpacity="0.16" strokeWidth="1.2" />
            <path className="cb-pulse" d={b.path} pathLength="1000" stroke="currentColor" strokeWidth="1.8" style={{ animationDelay: `${-i * 0.6}s`, filter: "drop-shadow(0 0 5px currentColor)" }} />
            <g transform={`translate(${b.x - 22} ${NODE_Y})`}>
              <rect width="44" height="44" rx="12" stroke="currentColor" strokeOpacity="0.22" strokeWidth="1.2" fill="currentColor" fillOpacity="0.04" />
              <g transform="translate(10 10) scale(1)" fill="currentColor" fillOpacity="0.9" stroke="none"><path d={p.icon.path} /></g>
            </g>
          </g>
        );
      })}
      {/* centre : le logo SYXTEE */}
      <circle cx={CX} cy={HUB_Y} r="28" fill="currentColor" fillOpacity="0.04" stroke="currentColor" strokeOpacity="0.22" strokeWidth="1.2" />
      <image href="/logo-400.png" x={CX - 9} y={HUB_Y - 13} width="18" height="26" className="ink-img" />
    </svg>
  );
}
