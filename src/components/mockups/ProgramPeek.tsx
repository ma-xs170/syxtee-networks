// Aperçu du programme du Contrôle à distance, dessiné en HTML pour une tuile : l'image du direct, son état, les boutons son et aperçu,
// puis la barre d'onglets du bas. Remplit la largeur de son conteneur sans jamais être rogné. Décoratif : aria-hidden.

export default function ProgramPeek({ className = "" }: { className?: string }) {
  return (
    <div aria-hidden="true" className={`select-none overflow-hidden rounded-t-xl border border-b-0 border-line-strong bg-black text-white ${className}`}>
      <div className="flex items-center justify-between gap-2 border-b border-white/10 px-3 py-2 text-xs">
        <p className="flex min-w-0 items-baseline gap-2"><span className="truncate">🔴 EN DIRECT</span><span className="text-red-500">en direct</span></p>
        <div className="flex shrink-0 gap-1.5 text-[11px] text-white/75">
          <span className="rounded border border-white/15 bg-white/[0.06] px-2 py-1">Son</span>
          <span className="hidden rounded border border-white/15 bg-white/[0.06] px-2 py-1 sm:inline">Couper l&apos;aperçu</span>
        </div>
      </div>
      <div className="relative aspect-video bg-[linear-gradient(to_bottom,#3a3f52_0%,#8a6f66_46%,#c08a5e_58%,#2a2420_59%,#14110f_100%)]">
        <div className="absolute inset-x-[32%] bottom-0 h-[44%] bg-[#1a1512] [clip-path:polygon(24%_0,76%_0,100%_100%,0_100%)]" />
        <span className="absolute bottom-[40%] left-1/2 size-3 -translate-x-1/2 rounded-full bg-[#0c0a09]" />
        <span className="absolute inset-0 shadow-[inset_0_0_60px_rgba(0,0,0,0.5)]" />
      </div>
      <div className="grid grid-cols-4 border-t border-white/10 bg-black px-1 py-2 text-center text-[11px] text-white/45">
        {["Scènes", "Sources", "Mixer", "Contrôles"].map((t, i) => (
          <span key={t} className={i === 0 ? "text-white" : ""}>{t}</span>
        ))}
      </div>
    </div>
  );
}
