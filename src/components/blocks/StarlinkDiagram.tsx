// Schéma Starlink Mini (Wi-Fi) + 4G/5G → iPhone (Moblin) → bonding SRTLA → Relais SYXTEE → OBS → plateformes.
// Deux versions : horizontale (sm et plus) et verticale (mobile), pour garder un texte lisible.

type Box = { x: number; y: number; w: number; h: number; label: string; sub?: string; strong?: boolean };

function Node({ x, y, w, h, label, sub, strong }: Box) {
  const cx = x + w / 2;
  const cy = y + h / 2;
  return (
    <g>
      <rect x={x} y={y} width={w} height={h} rx="10" fill={strong ? "#fff" : "#000"} stroke={strong ? "#fff" : "var(--line)"} />
      <text x={cx} y={sub ? cy - 3 : cy + 4} textAnchor="middle" fontSize="13" fontWeight="600" fill={strong ? "#000" : "var(--foreground)"}>
        {label}
      </text>
      {sub && (
        <text x={cx} y={cy + 14} textAnchor="middle" fontSize="10" fill={strong ? "#525252" : "var(--muted)"} className="font-mono">
          {sub}
        </text>
      )}
    </g>
  );
}

function Edge({ d, animated = true }: { d: string; animated?: boolean }) {
  return (
    <g>
      <path d={d} fill="none" stroke="var(--line)" strokeWidth="1.5" />
      {animated && <path d={d} fill="none" stroke="#fff" strokeWidth="1.5" className="bond-dash" />}
    </g>
  );
}

function Label({ x, y, children }: { x: number; y: number; children: string }) {
  return (
    <text x={x} y={y} textAnchor="middle" fontSize="10" fill="var(--muted)" className="font-mono">
      {children}
    </text>
  );
}

function Arrow({ x, y, dir }: { x: number; y: number; dir: "right" | "down" }) {
  const d = dir === "right" ? `M ${x - 6} ${y - 5} L ${x} ${y} L ${x - 6} ${y + 5}` : `M ${x - 5} ${y - 6} L ${x} ${y} L ${x + 5} ${y - 6}`;
  return <path d={d} fill="none" stroke="#fff" strokeWidth="1.5" />;
}

const title = "Le Starlink Mini fournit du Wi-Fi à l'iPhone, qui utilise aussi sa 4G/5G. Moblin combine les deux en bonding SRTLA vers le relais SYXTEE, qui envoie le flux en SRT à OBS, puis OBS diffuse sur Twitch, Kick ou YouTube.";

export default function StarlinkDiagram() {
  return (
    <figure className="rounded-2xl border border-line bg-white/[0.02] p-6 sm:p-8">
      {/* Horizontal */}
      <svg viewBox="0 0 960 240" className="hidden h-auto w-full sm:block" role="img" aria-labelledby="sl-h">
        <title id="sl-h">{title}</title>
        <Edge d="M 150 48 C 200 48, 200 120, 250 120" />
        <Edge d="M 150 192 C 200 192, 200 120, 250 120" />
        <Label x={172} y={40}>Wi-Fi</Label>
        <Label x={176} y={212}>4G/5G</Label>
        <Edge d="M 400 120 L 500 120" />
        <Arrow x={500} y={120} dir="right" />
        <Label x={450} y={108}>Bonding SRTLA</Label>
        <Edge d="M 610 120 L 660 120" />
        <Arrow x={660} y={120} dir="right" />
        <Label x={635} y={108}>SRT</Label>
        <Edge d="M 760 120 L 810 120" />
        <Arrow x={810} y={120} dir="right" />
        <Node x={0} y={24} w={150} h={48} label="Starlink Mini" sub="satellite" />
        <Node x={0} y={168} w={150} h={48} label="Réseau mobile" sub="4G · 5G" />
        <Node x={250} y={92} w={150} h={56} label="iPhone" sub="Moblin" />
        <Node x={500} y={96} w={110} h={48} label="Relais" sub="SYXTEE" strong />
        <Node x={660} y={96} w={100} h={48} label="OBS" sub="ton PC" />
        <Node x={810} y={96} w={150} h={48} label="Plateformes" sub="Twitch · Kick · YouTube" />
      </svg>

      {/* Vertical (mobile) */}
      <svg viewBox="0 0 320 610" className="h-auto w-full sm:hidden" role="img" aria-labelledby="sl-v">
        <title id="sl-v">{title}</title>
        <Edge d="M 80 60 C 80 100, 160 100, 160 140" />
        <Edge d="M 240 60 C 240 100, 160 100, 160 140" />
        <Label x={76} y={112}>Wi-Fi</Label>
        <Label x={250} y={112}>4G/5G</Label>
        <Edge d="M 160 196 L 160 280" />
        <Arrow x={160} y={280} dir="down" />
        <Label x={214} y={242}>Bonding SRTLA</Label>
        <Edge d="M 160 328 L 160 400" />
        <Arrow x={160} y={400} dir="down" />
        <Label x={184} y={368}>SRT</Label>
        <Edge d="M 160 448 L 160 520" />
        <Arrow x={160} y={520} dir="down" />
        <Node x={4} y={12} w={150} h={48} label="Starlink Mini" sub="satellite" />
        <Node x={166} y={12} w={150} h={48} label="Réseau mobile" sub="4G · 5G" />
        <Node x={85} y={140} w={150} h={56} label="iPhone" sub="Moblin" />
        <Node x={100} y={280} w={120} h={48} label="Relais" sub="SYXTEE" strong />
        <Node x={100} y={400} w={120} h={48} label="OBS" sub="ton PC" />
        <Node x={70} y={520} w={180} h={48} label="Plateformes" sub="Twitch · Kick · YouTube" />
      </svg>

      <figcaption className="mt-4 font-mono text-xs text-muted">
        Wi-Fi du Mini + 4G/5G → un seul flux stable dans ton OBS.
      </figcaption>
    </figure>
  );
}
