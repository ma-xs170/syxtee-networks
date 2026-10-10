import Image from "next/image";

// Trajet du flux vidéo en logos : Moblin, S (SYXTEE), OBS (logo officiel). Trois tuiles identiques, rangées dans une carte.
function Tile({ label, strong = false, children }: { label: string; strong?: boolean; children: React.ReactNode }) {
  return (
    <div className="flex shrink-0 flex-col items-center gap-5">
      <div className={`grid size-[4.5rem] place-items-center overflow-hidden rounded-[1.25rem] border sm:size-20 ${strong ? "border-foreground/40 bg-surface-2" : "border-line bg-surface"}`}>{children}</div>
      <span className="font-mono text-[11px] uppercase tracking-wider text-muted">{label}</span>
    </div>
  );
}

function Hop({ label }: { label: string }) {
  return (
    <div className="flex min-w-14 flex-1 flex-col items-center gap-2.5 px-3 pb-10 text-center sm:px-6">
      <span className="font-mono text-[10px] uppercase tracking-wider text-muted">{label}</span>
      <svg viewBox="0 0 100 8" preserveAspectRatio="none" className="h-2 w-full text-foreground" aria-hidden="true">
        <path d="M0 4h92" className="bond-dash" fill="none" stroke="currentColor" strokeOpacity="0.6" strokeWidth="1.5" vectorEffect="non-scaling-stroke" />
        <path d="M88 1l8 3-8 3" fill="none" stroke="currentColor" strokeOpacity="0.6" strokeWidth="1.5" vectorEffect="non-scaling-stroke" />
      </svg>
    </div>
  );
}

export default function FlowDiagram() {
  return (
    <div role="img" aria-label="Ton flux part de Moblin sur ton téléphone, arrive dans les serveurs SYXTEE, puis dans ton OBS" className="bento-cell flex items-center justify-between px-6 pb-2 pt-10 sm:px-12 sm:pt-12">
      <Tile label="Moblin">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/images/moblin/icon.png" alt="" width={80} height={80} className="size-full" />
      </Tile>
      <Hop label="4G · 5G · Wi-Fi" />
      <Tile label="SYXTEE" strong>
        <Image src="/logo-400.png" alt="" width={32} height={44} className="ink-img h-auto w-6 sm:w-7" />
      </Tile>
      <Hop label="Flux stable" />
      <Tile label="OBS">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/images/obs/logo.png" alt="" width={80} height={80} className="size-full p-2.5" />
      </Tile>
    </div>
  );
}
