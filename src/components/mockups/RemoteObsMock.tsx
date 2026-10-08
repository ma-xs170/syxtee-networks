// Aperçu réaliste du Contrôle à distance sur ordinateur : la fenêtre d'OBS dans un onglet (barre d'état, aperçu du programme,
// scènes, sources, mixeur audio avec vumètres, contrôles et débit). Statique, décoratif : aria-hidden.

const SCENES: [string, string][] = [
  ["", "DÉBUT DU STREAM"],
  ["", "EN DIRECT"],
  ["", "CONNEXION PERDUE"],
  ["", "FIN DU STREAM"],
];
const SOURCES: [string, string, boolean][] = [
  ["Flux › IPHONE 16", "Média", true],
  ["Chat en direct", "Navigateur", true],
  ["(TXT) Pseudo", "Texte", true],
  ["Caméra salon", "Caméra", false],
  ["Overlay alertes", "Navigateur", true],
];
const MIX: [string, number, number][] = [
  ["Micro", 66, 72],
  ["Flux IPHONE", 52, 58],
  ["Musique", 34, 40],
  ["Discord", 58, 46],
];

function Panel({ title, count, children, className = "" }: { title: string; count?: number; children: React.ReactNode; className?: string }) {
  return (
    <section className={`overflow-hidden rounded-lg border border-white/10 bg-[#0b0b0d] ${className}`}>
      <h3 className="flex items-center gap-2 border-b border-white/10 px-3.5 py-2.5 text-sm font-medium text-white">
        {title}
        {count != null && <span className="text-xs font-normal text-white/40">{count}</span>}
      </h3>
      {children}
    </section>
  );
}

export default function RemoteObsMock({ className = "" }: { className?: string }) {
  return (
    <div aria-hidden="true" className={`@container select-none overflow-hidden rounded-2xl border border-white/10 bg-[#050506] shadow-[0_40px_90px_-30px_rgba(0,0,0,0.95)] ${className}`}>
      <div className="flex items-center gap-2 border-b border-white/10 px-4 py-3">
        {[0, 1, 2].map((i) => <span key={i} className="size-2.5 rounded-full bg-white/20" />)}
        <span className="mx-auto rounded-md bg-white/[0.06] px-12 py-1 text-xs text-white/40">syxtee-networks.fr/dashboard/controle-a-distance</span>
      </div>
      <div className="space-y-3 p-3.5 text-white sm:p-4">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 rounded-lg border border-white/10 bg-[#0b0b0d] px-3.5 py-2.5 text-xs @lg:text-[13px]">
          <span className="font-medium">OBS-DJ-SYXTEE</span>
          <span className="text-white/40">38 ms</span>
          <span className="flex items-center gap-1.5"><span className="size-1.5 rounded-full bg-white" />Flux reçu <span className="text-white/45">1920×1080</span></span>
          <span className="flex items-center gap-1.5"><span className="size-1.5 rounded-full bg-white" />Signal stable</span>
          <span className="ml-auto flex items-center gap-1.5 font-mono text-white/75"><span className="size-1.5 rounded-full bg-[var(--live)]" />EN LIVE 01:24:13</span>
        </div>

        <div className="grid grid-cols-1 gap-3 @lg:grid-cols-[1.55fr_1fr]">
          {/* Aperçu du programme */}
          <div className="relative aspect-video overflow-hidden rounded-lg border border-white/10 bg-[linear-gradient(to_bottom,#3a3f52_0%,#8a6f66_48%,#c08a5e_58%,#2a2420_59%,#14110f_100%)]">
            <div className="absolute inset-x-[34%] bottom-0 h-[44%] bg-[#1a1512] [clip-path:polygon(24%_0,76%_0,100%_100%,0_100%)]" />
            <span className="absolute bottom-[41%] left-1/2 size-3 -translate-x-1/2 rounded-full bg-[#0c0a09]" />
            <span className="absolute inset-0 shadow-[inset_0_0_70px_rgba(0,0,0,0.55)]" />
            <span className="absolute left-3 top-2.5 rounded bg-black/50 px-2 py-0.5 font-mono text-[11px] text-white/75 backdrop-blur-sm">PROGRAMME · EN DIRECT</span>
            <div className="absolute bottom-3 right-3 flex gap-1.5 text-[11px]">
              <span className="rounded-full bg-black/55 px-2.5 py-1 text-white/80 backdrop-blur-sm">Muet</span>
              <span className="rounded-full bg-black/55 px-2.5 py-1 text-white/80 backdrop-blur-sm">Couper l&apos;aperçu</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 @lg:grid-cols-1 @lg:grid-rows-2">
            <Panel title="Scènes" count={4}>
              <ul className="space-y-0.5 p-1.5 text-xs @lg:text-[13px]">
                {SCENES.map(([e, n], i) => (
                  <li key={n} className={`flex items-center gap-2 rounded px-2 py-1.5 ${i === 1 ? "bg-white/[0.13] font-medium text-white" : "text-white/70"}`}>
                    <span className="truncate">› {n}</span>
                    {i === 1 && <span className="ml-auto text-[11px] text-white/80">direct</span>}
                  </li>
                ))}
              </ul>
            </Panel>
            <Panel title="Sources" count={SOURCES.length}>
              <ul className="space-y-0.5 p-1.5 text-xs @lg:text-[13px]">
                {SOURCES.map(([n, k, on]) => (
                  <li key={n} className="flex items-center gap-2 rounded px-2 py-1.5">
                    <svg viewBox="0 0 24 24" className={`size-4 shrink-0 ${on ? "text-white" : "text-white/30"}`} fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"><path d="M2 12s3.6-6.5 10-6.5S22 12 22 12s-3.6 6.5-10 6.5S2 12 2 12Z" /><circle cx="12" cy="12" r="3" />{!on && <path d="M4 4l16 16" />}</svg>
                    <span className={`truncate ${on ? "text-white/85" : "text-white/40"}`}>{n}</span>
                    <span className="ml-auto text-[11px] text-white/35">{k}</span>
                  </li>
                ))}
              </ul>
            </Panel>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 @lg:grid-cols-[1.5fr_1fr]">
          <Panel title="Mixeur audio">
            <div className="flex items-end justify-around gap-2 px-3 pb-3 pt-4">
              {MIX.map(([n, lvl, knob]) => (
                <div key={n} className="flex min-w-0 flex-col items-center gap-2">
                  <div className="flex h-24 items-stretch gap-1.5">
                    <div className="relative w-1.5 overflow-hidden rounded-sm bg-white/10">
                      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-emerald-600 via-emerald-500 to-red-500" style={{ height: `${lvl}%` }} />
                    </div>
                    <div className="relative w-5">
                      <span className="absolute inset-x-[8px] inset-y-0 rounded-full bg-white/15" />
                      <span className="absolute left-0 h-2.5 w-5 rounded-sm bg-white shadow" style={{ bottom: `${knob - 4}%` }} />
                    </div>
                  </div>
                  <span className="max-w-full truncate text-[11px] text-white/50">{n}</span>
                </div>
              ))}
            </div>
          </Panel>
          <Panel title="Contrôles">
            <div className="space-y-2 p-3 text-xs @lg:text-[13px]">
              <span className="block rounded-md bg-red-700 px-3 py-2 text-center font-medium">Arrêter le direct <span className="font-normal text-white/80">1:24:13</span></span>
              <span className="block rounded-md border border-white/10 bg-white/[0.05] px-3 py-2 text-center text-white/80">Démarrer l&apos;enregistrement</span>
              <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 pt-1 font-mono text-[11px]">
                {[["Débit", "6 010 kbit/s"], ["Congestion", "4 %"], ["Images perdues", "0"]].map(([a, b]) => (
                  <div key={a} className="contents">
                    <dt className="text-white/45">{a}</dt>
                    <dd className="text-right text-white">{b}</dd>
                  </div>
                ))}
              </dl>
            </div>
          </Panel>
        </div>
      </div>
    </div>
  );
}
