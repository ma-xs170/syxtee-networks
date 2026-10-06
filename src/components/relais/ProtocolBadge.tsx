import { Broadcast, GitMerge, ShieldCheck } from "@/components/icons";
import type { RelayProtocol } from "@/lib/core";

// Mini badge du protocole d'un relais : SRTLA (liens agrégés), RTMP (diffusion), RIST (chiffré). Même badge partout
// (Mes relais, Aperçu, choix du relais). `className` pour l'adapter à un fond plein.

const MARK = {
  srtla: { label: "SRTLA", Icon: GitMerge },
  rtmp: { label: "RTMP", Icon: Broadcast },
  rist: { label: "RIST", Icon: ShieldCheck },
} as const;

export default function ProtocolBadge({ protocol, className = "border-line text-muted" }: { protocol: RelayProtocol; className?: string }) {
  const { label, Icon } = MARK[protocol] ?? { label: String(protocol).toUpperCase(), Icon: Broadcast };
  return (
    <span className={`inline-flex items-center gap-1 rounded border px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-[0.12em] ${className}`}>
      <Icon size={11} weight="bold" aria-hidden="true" />
      {label}
    </span>
  );
}
