// Trajet du flux vidéo : téléphone (Moblin), serveurs SYXTEE NETWORKS, OBS. Même style de nœuds que le schéma de pilotage.
const NODE = "fill-[var(--surface)] stroke-[var(--line-strong)]";
const T = "fill-[var(--foreground)] text-[14px] font-medium";
const S = "fill-[var(--muted)] text-[11px]";
const M = "fill-[var(--muted)] text-[10px] font-mono uppercase";
const flow = "fill-none stroke-[var(--foreground)] stroke-opacity-60 bond-dash";

function Node({ x, w = 220, title, sub, strong = false }: { x: number; w?: number; title: string; sub: string; strong?: boolean }) {
  return (
    <g>
      <rect x={x} y={44} width={w} height={72} rx={18} className={strong ? "fill-[var(--surface-2)] stroke-[var(--foreground)]" : NODE} strokeOpacity={strong ? 0.4 : 1} />
      <text x={x + w / 2} y={76} textAnchor="middle" className={T}>{title}</text>
      <text x={x + w / 2} y={96} textAnchor="middle" className={S}>{sub}</text>
    </g>
  );
}

export default function FlowDiagram() {
  return (
    <div className="overflow-x-auto">
      <svg viewBox="0 0 900 160" role="img" aria-label="Ton flux part de ton téléphone, arrive dans nos serveurs, puis dans ton OBS" className="mx-auto h-auto w-full min-w-[640px]" strokeWidth="1.25">
        <path d="M236 80 H332" className={flow} />
        <path d="M568 80 H664" className={flow} />
        <text x="284" y="68" textAnchor="middle" className={M}>4G · 5G · Wi-Fi</text>
        <text x="616" y="68" textAnchor="middle" className={M}>Flux stable</text>
        <Node x={16} title="Ton téléphone" sub="Moblin envoie ta vidéo" />
        <Node x={340} w={220} title="Nos serveurs" sub="Ils reçoivent et stabilisent" strong />
        <Node x={672} w={212} title="Ton OBS" sub="Sur ton propre Mac ou PC" />
      </svg>
    </div>
  );
}
