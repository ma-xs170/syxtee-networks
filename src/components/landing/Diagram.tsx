// Schéma de branchement : caméra, téléphone, connexions, relais SYXTEE, OBS, plateformes. Les traits laissent circuler un flux (bond-dash).
const NODE = "fill-[var(--surface)] stroke-[var(--line-strong)]";
const T = "fill-[var(--foreground)] text-[13px] font-medium";
const S = "fill-[var(--muted)] text-[11px]";

function Node({ x, y, w = 128, title, sub }: { x: number; y: number; w?: number; title: string; sub?: string }) {
  return (
    <g>
      <rect x={x} y={y} width={w} height={56} rx={14} className={NODE} />
      <text x={x + w / 2} y={y + (sub ? 24 : 33)} textAnchor="middle" className={T}>{title}</text>
      {sub && <text x={x + w / 2} y={y + 41} textAnchor="middle" className={S}>{sub}</text>}
    </g>
  );
}
const flow = "fill-none stroke-[var(--foreground)] stroke-opacity-60 bond-dash";

export default function Diagram() {
  const conns = ["4G", "5G", "eSIM", "Wi-Fi"];
  return (
    <div className="overflow-x-auto">
      <svg viewBox="0 0 980 300" role="img" aria-label="Caméra, téléphone, quatre connexions, relais SYXTEE, OBS, puis Twitch et YouTube" className="mx-auto h-auto w-full min-w-[760px]" strokeWidth="1.25">
        {/* traits */}
        <path d="M144 150 H190" className={flow} strokeOpacity="0.6" />
        <path d="M318 150 H350" className={flow} strokeOpacity="0.6" />
        {conns.map((_, i) => (
          <g key={i}>
            <path d={`M350 150 C 380 150, 380 ${54 + i * 64}, 410 ${54 + i * 64}`} className={flow} strokeOpacity="0.6" />
            <path d={`M498 ${54 + i * 64} C 528 ${54 + i * 64}, 528 150, 558 150`} className={flow} strokeOpacity="0.6" />
          </g>
        ))}
        <path d="M686 150 H718" className={flow} strokeOpacity="0.6" />
        <path d="M818 150 C 842 150, 842 90, 866 90" className={flow} strokeOpacity="0.6" />
        <path d="M818 150 C 842 150, 842 210, 866 210" className={flow} strokeOpacity="0.6" />
        {/* nœuds */}
        <Node x={16} y={122} w={128} title="Caméra" sub="Source vidéo" />
        <Node x={190} y={122} w={128} title="Téléphone" sub="Encodeur SRTLA" />
        {conns.map((c, i) => (
          <g key={c}>
            <rect x={410} y={26 + i * 64} width={88} height={56} rx={14} className={NODE} />
            <text x={454} y={59 + i * 64} textAnchor="middle" className={T}>{c}</text>
          </g>
        ))}
        <Node x={558} y={122} w={128} title="Relais SYXTEE" sub="Bonding · Beauharnois" />
        <Node x={718} y={122} w={100} title="OBS" sub="Studio" />
        <Node x={866} y={62} w={100} title="Twitch" />
        <Node x={866} y={182} w={100} title="YouTube" />
      </svg>
    </div>
  );
}
