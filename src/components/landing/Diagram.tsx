"use client";

import RelayBox from "./RelayBox";
import { useBoxState } from "./liveStore";

// Schéma de branchement : caméra, SYXTEE RELAIS (au centre, mis en valeur), quatre connexions, serveur relais, OBS, plateformes.
// Les traits laissent circuler un flux ; les nœuds de connexion et la LED du boîtier suivent l'état de la démo live.
const NODE = "fill-[var(--surface)] stroke-[var(--line-strong)]";
const T = "fill-[var(--foreground)] text-[13px] font-medium";
const S = "fill-[var(--muted)] text-[11px]";
const flow = "fill-none stroke-[var(--foreground)] bond-dash";
const COLOR = { ok: "var(--ok)", warn: "var(--warn)", bad: "var(--bad)", off: "var(--muted)" } as const;

function Node({ x, y, w = 124, title, sub }: { x: number; y: number; w?: number; title: string; sub?: string }) {
  return (
    <g>
      <rect x={x} y={y} width={w} height={56} rx={14} className={NODE} />
      <text x={x + w / 2} y={y + (sub ? 24 : 33)} textAnchor="middle" className={T}>{title}</text>
      {sub && <text x={x + w / 2} y={y + 41} textAnchor="middle" className={S}>{sub}</text>}
    </g>
  );
}

export default function Diagram() {
  const box = useBoxState();
  const conns = [
    { id: "4g", label: "4G" },
    { id: "5g", label: "5G" },
    { id: "esim", label: "eSIM" },
    { id: "sat", label: "Starlink Mini" },
  ] as const;
  const y = (i: number) => 26 + i * 64;
  return (
    <div className="overflow-x-auto">
      <svg viewBox="0 0 1180 300" role="img" aria-label="Caméra, SYXTEE RELAIS, quatre connexions, serveur relais, OBS, puis Twitch et YouTube" className="mx-auto h-auto w-full min-w-[900px]" strokeWidth="1.25">
        <path d="M140 150 H178" className={flow} strokeOpacity="0.6" />
        <path d="M358 150 H392" className={flow} strokeOpacity="0.6" />
        {conns.map((c, i) => (
          <g key={c.id}>
            <path d={`M392 150 C 416 150, 416 ${y(i) + 28}, 440 ${y(i) + 28}`} className={flow} strokeOpacity={box.leds[c.id] === "bad" ? 0.12 : 0.6} />
            <path d={`M556 ${y(i) + 28} C 580 ${y(i) + 28}, 580 150, 604 150`} className={flow} strokeOpacity={box.leds[c.id] === "bad" ? 0.12 : 0.6} />
          </g>
        ))}
        <path d="M728 150 H766" className={flow} strokeOpacity="0.6" />
        <path d="M890 150 H928" className={flow} strokeOpacity="0.6" />
        <path d="M1052 150 C 1072 150, 1072 90, 1092 90" className={flow} strokeOpacity="0.6" />
        <path d="M1052 150 C 1072 150, 1072 210, 1092 210" className={flow} strokeOpacity="0.6" />

        <Node x={16} y={122} w={124} title="Caméra" sub="iPhone, source vidéo" />
        {/* boîtier au centre, mis en valeur */}
        <rect x={178} y={100} width={180} height={100} rx={18} className="fill-[var(--surface-2)] stroke-[var(--foreground)]" strokeOpacity="0.35" />
        <foreignObject x={186} y={110} width={164} height={64}>
          <RelayBox leds={box.leds} live={box.status !== "offline"} />
        </foreignObject>
        <text x={268} y={190} textAnchor="middle" className={T}>SYXTEE RELAIS</text>
        {conns.map((c, i) => (
          <g key={c.id}>
            <rect x={440} y={y(i)} width={116} height={56} rx={14} className={NODE} />
            <circle cx={460} cy={y(i) + 28} r={4} fill={COLOR[box.leds[c.id]]} style={{ transition: "fill 0.3s" }} />
            <text x={500} y={y(i) + 33} textAnchor="middle" className={T}>{c.label}</text>
          </g>
        ))}
        <Node x={604} y={122} w={124} title="Serveur relais" sub="Beauharnois" />
        <Node x={766} y={122} w={124} title="OBS" sub="PC ou Mac" />
        <Node x={928} y={122} w={124} title="Plateformes" />
        <Node x={1092} y={62} w={80} title="Twitch" />
        <Node x={1092} y={182} w={80} title="YouTube" />
      </svg>
    </div>
  );
}
