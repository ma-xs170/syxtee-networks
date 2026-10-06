// Aperçu réaliste du Contrôle à distance : la fenêtre d'OBS dans un onglet (barre d'état, aperçu du programme,
// scènes, sources, mélangeur audio avec vumètres, contrôles et débit). Statique, décoratif : aria-hidden.

const SCENES = ["Écran d'attente", "Caméra IRL", "Pause", "Fin"];
const SOURCES: [string, string][] = [["Flux SYXTEE", "Flux"], ["Webcam", "Caméra"], ["Titre", "Texte"], ["Chat", "Navigateur"]];
const MIX: [string, number, number][] = [["Micro", 62, 70], ["Son du jeu", 48, 55], ["Musique", 30, 36], ["Discord", 54, 40]];

function Panel({ title, children, className = "" }: { title: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={`overflow-hidden rounded-lg border border-white/10 bg-[#0c0c0e] ${className}`}>
      <p className="border-b border-white/10 px-2.5 py-1.5 text-[0.55rem] font-medium text-white/90 sm:text-[0.62rem]">{title}</p>
      {children}
    </div>
  );
}

export default function RemoteObsMock({ className = "" }: { className?: string }) {
  return (
    <div aria-hidden="true" className={`select-none overflow-hidden rounded-2xl border border-white/10 bg-[#060607] shadow-[0_40px_90px_-30px_rgba(0,0,0,0.95)] ${className}`}>
      <div className="flex items-center gap-1.5 border-b border-white/10 px-3.5 py-2.5">
        {[0, 1, 2].map((i) => <span key={i} className="size-2 rounded-full bg-white/20" />)}
      </div>
      <div className="space-y-2 p-2.5 text-white">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-lg border border-white/10 bg-[#0c0c0e] px-2.5 py-1.5 text-[0.55rem] sm:text-[0.62rem]">
          <span className="font-medium">PC de stream</span>
          <span className="flex items-center gap-1.5"><span className="size-1.5 rounded-full bg-white" />Flux reçu <span className="text-white/50">1920×1080</span></span>
          <span className="flex items-center gap-1.5"><span className="size-1.5 rounded-full bg-white" />Signal stable</span>
          <span className="ml-auto flex items-center gap-1.5 font-mono text-white/70"><span className="size-1.5 rounded-full bg-[var(--live)]" />EN LIVE 01:24:13</span>
        </div>

        {/* Aperçu du programme */}
        <div className="relative aspect-[16/7] overflow-hidden rounded-lg border border-white/10 bg-[radial-gradient(ellipse_at_50%_55%,#2a2b30,#0b0b0d_70%)]">
          <div className="absolute inset-y-0 left-1/2 w-[56%] -translate-x-1/2 bg-[linear-gradient(to_bottom,#3a3d44,#17181b)] opacity-90" />
          <div className="absolute left-1/2 top-[34%] size-[22%] -translate-x-1/2 rounded-full bg-[#55575d] opacity-70 blur-[2px]" />
          <div className="absolute bottom-[8%] right-[26%] h-[26%] w-[14%] rounded-md bg-white/10 ring-1 ring-white/15" />
          <span className="absolute left-2 top-1.5 font-mono text-[0.5rem] text-white/60 sm:text-[0.58rem]">PROGRAMME · Caméra IRL</span>
        </div>

        <div className="grid grid-cols-2 gap-2 sm:grid-cols-[1fr_1.4fr_1.4fr_1fr]">
          <Panel title="Scènes">
            <ul className="space-y-0.5 p-1.5 text-[0.55rem] sm:text-[0.62rem]">
              {SCENES.map((s, i) => <li key={s} className={`rounded px-1.5 py-1 ${i === 1 ? "bg-white/90 font-medium text-black" : "text-white/70"}`}>{s}</li>)}
            </ul>
          </Panel>
          <Panel title="Sources">
            <ul className="space-y-0.5 p-1.5 text-[0.55rem] sm:text-[0.62rem]">
              {SOURCES.map(([n, k]) => (
                <li key={n} className="flex items-center justify-between rounded px-1.5 py-1 text-white/80">
                  <span>{n}</span><span className="text-white/35">{k}</span>
                </li>
              ))}
            </ul>
          </Panel>
          <Panel title="Mélangeur audio">
            <div className="flex items-end justify-around gap-1 px-1.5 pb-1.5 pt-2">
              {MIX.map(([n, lvl, knob]) => (
                <div key={n} className="flex min-w-0 flex-col items-center gap-1">
                  <div className="relative h-14 w-4">
                    <span className="absolute inset-x-[5px] inset-y-0 rounded-full bg-white/10" />
                    <span className="absolute inset-x-[5px] bottom-0 rounded-full bg-gradient-to-t from-white/80 to-white/30" style={{ height: `${lvl}%` }} />
                    <span className="absolute left-0 h-2 w-4 rounded-sm bg-white shadow" style={{ bottom: `${knob - 6}%` }} />
                  </div>
                  <span className="max-w-full truncate text-[0.48rem] text-white/50 sm:text-[0.55rem]">{n}</span>
                </div>
              ))}
            </div>
          </Panel>
          <Panel title="Contrôles" className="col-span-2 sm:col-span-1">
            <div className="space-y-1 p-1.5 text-[0.55rem] sm:text-[0.62rem]">
              <span className="block rounded bg-[#26262a] px-2 py-1.5 text-center font-medium ring-1 ring-white/10">Arrêter le direct <span className="text-white/50">1:24:13</span></span>
              <span className="block rounded bg-white/[0.06] px-2 py-1.5 text-center text-white/80 ring-1 ring-white/10">Démarrer l&apos;enregistrement</span>
              <p className="flex justify-between gap-2 pt-1 font-mono text-white/50"><span>Débit</span><span className="whitespace-nowrap text-white">6 010</span></p>
              <p className="flex justify-between gap-2 font-mono text-white/50"><span>Perdues</span><span className="text-white">0</span></p>
            </div>
          </Panel>
        </div>
      </div>
    </div>
  );
}
