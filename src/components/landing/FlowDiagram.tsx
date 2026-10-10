import Image from "next/image";

// Trajet du flux vidéo en logos : Moblin, S (SYXTEE), OBS. Traits en couleur d'encre : valable en clair comme en sombre.
function Tile({ label, strong = false, children }: { label: string; strong?: boolean; children: React.ReactNode }) {
  return (
    <div className="flex shrink-0 flex-col items-center gap-3">
      <div className={`grid size-24 place-items-center rounded-[26px] border sm:size-28 ${strong ? "border-foreground/40 bg-surface-2" : "border-line bg-surface"}`}>{children}</div>
      <span className="font-mono text-xs uppercase tracking-wider text-muted">{label}</span>
    </div>
  );
}

function Link({ label }: { label: string }) {
  return (
    <div className="flex min-w-16 flex-1 flex-col items-center gap-2 pb-8 text-center">
      <span className="font-mono text-[10px] uppercase tracking-wider text-muted">{label}</span>
      <svg viewBox="0 0 100 8" preserveAspectRatio="none" className="h-2 w-full text-foreground" aria-hidden="true">
        <path d="M0 4h92" className="bond-dash" fill="none" stroke="currentColor" strokeOpacity="0.6" strokeWidth="1.5" vectorEffect="non-scaling-stroke" />
        <path d="M88 1l8 3-8 3" fill="none" stroke="currentColor" strokeOpacity="0.6" strokeWidth="1.5" vectorEffect="non-scaling-stroke" />
      </svg>
    </div>
  );
}

// Logo de type OBS : disque et trois lobes en rotation.
function ObsMark() {
  return (
    <svg viewBox="0 0 64 64" className="size-14 text-foreground sm:size-16" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
      <circle cx="32" cy="32" r="28" />
      {[0, 120, 240].map((r) => (
        <ellipse key={r} cx="32" cy="17" rx="8.5" ry="11" transform={`rotate(${r} 32 32)`} fill="currentColor" fillOpacity="0.9" stroke="none" />
      ))}
    </svg>
  );
}

export default function FlowDiagram() {
  return (
    <div role="img" aria-label="Ton flux part de Moblin sur ton téléphone, arrive dans les serveurs SYXTEE, puis dans ton OBS" className="mx-auto flex max-w-3xl items-center justify-between gap-2 sm:gap-4">
      <Tile label="Moblin">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/images/moblin/icon.png" alt="" width={112} height={112} className="size-full rounded-[26px]" />
      </Tile>
      <Link label="4G · 5G · Wi-Fi" />
      <Tile label="SYXTEE" strong>
        <Image src="/logo-400.png" alt="" width={44} height={60} className="ink-img h-auto w-9 sm:w-11" />
      </Tile>
      <Link label="Flux stable" />
      <Tile label="OBS">
        <ObsMark />
      </Tile>
    </div>
  );
}
