// iPhone en paysage, réaliste, qui filme dans une rue : cadre titane, Dynamic Island, image de rue (dégradés et façades),
// puis l'interface de live par-dessus (LIVE, batterie, zoom, REC, DIFFUSER). Décoratif : aria-hidden.

export default function PhoneLiveMock({ className = "" }: { className?: string }) {
  return (
    <div aria-hidden="true" className={`relative mx-auto w-full max-w-[34rem] select-none ${className}`}>
      <div className="relative aspect-[19.5/9] rounded-[2.6rem] bg-[linear-gradient(145deg,#4a4a50,#111113_35%,#34343a)] p-[3px] shadow-[0_40px_80px_-25px_rgba(0,0,0,0.95),0_0_0_1px_rgba(255,255,255,0.08)]">
        <div className="size-full rounded-[2.5rem] bg-black p-[2.2%]">
          <div className="relative size-full overflow-hidden rounded-[1.9rem] bg-[#15161a]">
            {/* Rue : ciel, façades, arbre, sol */}
            <div className="absolute inset-0 bg-[linear-gradient(to_bottom,#6f7580_0%,#454a53_38%,#22252b_70%,#121316_100%)]" />
            <div className="absolute inset-y-0 left-0 w-[30%] bg-[linear-gradient(100deg,#2b2a2a,#4a4540_70%,transparent)] [clip-path:polygon(0_0,100%_12%,78%_100%,0_100%)]" />
            <div className="absolute inset-y-0 right-0 w-[32%] bg-[linear-gradient(260deg,#2e2d2c,#5a544d_70%,transparent)] [clip-path:polygon(0_14%,100%_0,100%_100%,24%_100%)]" />
            <div className="absolute left-[18%] top-[14%] h-[60%] w-[7%] rounded-full bg-[#1d1f1c] opacity-80 blur-[2px]" />
            <div className="absolute left-[6%] top-[4%] h-[34%] w-[26%] rounded-full bg-[#3b4a38] opacity-60 blur-xl" />
            <div className="absolute inset-x-[36%] top-[34%] h-[24%] bg-[linear-gradient(to_bottom,#8a8d94,#52555c)] opacity-60 blur-[3px] [clip-path:polygon(30%_0,70%_0,100%_100%,0_100%)]" />
            <div className="absolute inset-x-0 bottom-0 h-[32%] bg-[linear-gradient(to_bottom,transparent,#0b0b0d_95%)]" />
            <div className="absolute inset-0 shadow-[inset_0_0_60px_rgba(0,0,0,0.55)]" />

            {/* Dynamic Island */}
            <span className="absolute left-[1.6%] top-1/2 h-[26%] w-[2.6%] -translate-y-1/2 rounded-full bg-black" />

            {/* HUD haut */}
            <div className="absolute left-[8%] top-[6%] flex items-center gap-2 rounded-full bg-black/45 px-2.5 py-1 font-mono text-[0.55rem] tracking-wide text-white backdrop-blur-md sm:text-[0.62rem]">
              <span className="font-bold">S</span><span className="font-semibold">SYXTEE LIVE</span><span className="text-white/60">14:31</span>
            </div>
            <div className="absolute right-[8%] top-[6%] flex items-center gap-2 rounded-full bg-black/45 px-2.5 py-1 font-mono text-[0.55rem] text-white backdrop-blur-md sm:text-[0.62rem]">
              <span className="flex items-end gap-[2px]">{[3, 5, 7, 9].map((h) => <span key={h} className="w-[2px] rounded-sm bg-white/90" style={{ height: h }} />)}</span>
              <span>80 %</span>
            </div>

            {/* Zoom */}
            <div className="absolute bottom-[26%] left-1/2 flex -translate-x-1/2 items-center gap-1.5 rounded-full bg-black/45 p-1 font-mono text-[0.55rem] text-white backdrop-blur-md sm:text-[0.62rem]">
              {["0.5x", "1x", "3x", "6x"].map((z, i) => (
                <span key={z} className={`rounded-full px-2 py-0.5 ${i === 0 ? "bg-white/90 font-bold text-black" : "text-white/80"}`}>{z}</span>
              ))}
            </div>

            {/* Barre du bas */}
            <div className="absolute inset-x-[8%] bottom-[6%] flex items-center justify-between gap-3">
              <div className="flex items-center gap-1.5">
                {["M5 12h14M12 5v14", "M12 3v12m0 0a3 3 0 0 0 3-3V6a3 3 0 0 0-6 0v6a3 3 0 0 0 3 3Z", "M13 2 4 14h7l-1 8 9-12h-7Z"].map((d, i) => (
                  <span key={i} className="grid size-6 place-items-center rounded-full bg-black/45 backdrop-blur-md sm:size-7">
                    <svg viewBox="0 0 24 24" className="size-3 text-white sm:size-3.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d={d} /></svg>
                  </span>
                ))}
              </div>
              <div className="flex items-center gap-2">
                <span className="flex items-center gap-1.5 rounded-full bg-black/55 px-3 py-1.5 font-mono text-[0.55rem] font-semibold text-white backdrop-blur-md sm:text-[0.62rem]">
                  <span className="size-1.5 rounded-full bg-[var(--live)]" />REC
                </span>
                <span className="rounded-full bg-[#26262a] px-3.5 py-1.5 font-mono text-[0.55rem] font-bold uppercase tracking-wide text-white ring-1 ring-white/20 sm:text-[0.62rem]">
                  <span className="mr-1.5 inline-block size-1.5 rounded-full bg-[var(--live)]" />Diffuser
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
