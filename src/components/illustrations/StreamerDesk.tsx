// Streamer qui parle à son micro, casque sur les oreilles, devant un bureau : la « face cam » d'un direct sur PC.
// Silhouette filaire (trait de la couleur du texte). Les ondes de voix et la bulle de chat pulsent si `animated`.

export default function StreamerDesk({ className = "h-full w-full", animated = true }: { className?: string; animated?: boolean }) {
  const pulse = (delay: string) => (animated ? <animate attributeName="opacity" values="0.15;0.9;0.15" dur="1.6s" begin={delay} repeatCount="indefinite" /> : null);
  return (
    <svg viewBox="0 0 400 260" fill="none" className={`text-foreground ${className}`} role="img" aria-label="Un streamer parle à son micro devant sa caméra, en direct sur PC.">
      <g stroke="currentColor" strokeWidth={1.25} strokeLinecap="round" strokeLinejoin="round">
        {/* Bureau */}
        <path d="M20 205H380" />
        <path d="M60 205v40M340 205v40" strokeOpacity={0.5} />

        {/* Anneau lumineux */}
        <circle cx={62} cy={112} r={30} />
        <circle cx={62} cy={112} r={20} strokeOpacity={0.5} />
        <path d="M62 142v63" strokeOpacity={0.7} />

        {/* Épaules et cou */}
        <path d="M112 205C114 170 152 152 200 152C248 152 286 170 288 205" />
        <path d="M188 132v20M212 132v20" />

        {/* Tête, cheveux, visage */}
        <circle cx={200} cy={96} r={36} />
        <path d="M166 86c4-22 22-30 40-28c16 2 26 12 28 28c-14-10-36-14-68 0z" strokeOpacity={0.8} />
        <path d="M186 96h8M208 96h8" />
        <ellipse cx={201} cy={115} rx={7} ry={4.5} />

        {/* Casque */}
        <path d="M160 94a40 40 0 0 1 80 0" />
        <rect x={153} y={88} width={11} height={28} rx={5} />
        <rect x={236} y={88} width={11} height={28} rx={5} />

        {/* Bras de micro et micro */}
        <path d="M334 205V150L262 124" />
        <rect x={238} y={113} width={26} height={13} rx={6.5} transform="rotate(-18 251 119)" />

        {/* Ondes de voix */}
        <path d="M217 114q8 -3 14 -7" opacity={animated ? 0.15 : 0.7}>{pulse("0s")}</path>
        <path d="M221 121q11 -4 20 -10" opacity={animated ? 0.15 : 0.5}>{pulse("0.3s")}</path>

        {/* Bulle de chat */}
        <rect x={290} y={44} width={78} height={34} rx={6} strokeOpacity={0.7} />
        <path d="M308 78l-6 12l18 -12" strokeOpacity={0.7} />
        <path d="M300 56h44M300 66h28" strokeOpacity={0.5} />
      </g>
    </svg>
  );
}
