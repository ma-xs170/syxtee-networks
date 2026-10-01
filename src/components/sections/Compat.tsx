import { compat } from "@/lib/site";

// Icônes filaires génériques (aucun logo de marque) : téléphone, encodeur, écran, diffusion.
type Kind = "phone" | "encoder" | "screen" | "live";
const kinds: Record<string, Kind> = {
  Moblin: "phone",
  "IRL Pro": "phone",
  BELABOX: "encoder",
  "OBS Studio": "screen",
};

function Icon({ kind }: { kind: Kind }) {
  return (
    <svg viewBox="0 0 16 16" className="h-3.5 w-3.5 flex-none" fill="none" stroke="currentColor" strokeWidth={1.2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {kind === "phone" && (
        <>
          <rect x={4.5} y={1.5} width={7} height={13} rx={1.6} />
          <path d="M7 3.6h2" />
        </>
      )}
      {kind === "encoder" && (
        <>
          <rect x={1.5} y={5} width={13} height={7} rx={1.2} />
          <path d="M4 8.5h3M10.5 8.5h.01M12.5 8.5h.01M5 5V2.5M11 5V3.5" />
        </>
      )}
      {kind === "screen" && (
        <>
          <rect x={1.5} y={2.5} width={13} height={8.5} rx={1.2} />
          <path d="M6 14h4M8 11v3M4 5.5h3" />
        </>
      )}
      {kind === "live" && (
        <>
          <rect x={1.5} y={3.5} width={13} height={9} rx={1.6} />
          <path d="M6.8 6.2v3.6L9.8 8z" />
        </>
      )}
    </svg>
  );
}

export default function Compat() {
  const items = [...compat, ...compat];
  return (
    <section className="overflow-hidden border-b border-line py-6" aria-label="Compatibilité">
      <div className="marquee">
        {items.map((name, i) => (
          <span key={i} className="flex items-center gap-10 pr-10 font-mono text-sm uppercase tracking-[0.2em] text-muted">
            <span className="flex items-center gap-3">
              <Icon kind={kinds[name] ?? "live"} />
              {name}
            </span>
            <span className="text-foreground/20">/</span>
          </span>
        ))}
      </div>
    </section>
  );
}
