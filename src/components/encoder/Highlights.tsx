// « Points forts » : cartes noires larges qui défilent à l'horizontale (scroll-snap, sans JavaScript), visuels en tuiles de couleur.
function Tile({ label, sub, tint, dim = false }: { label: string; sub?: string; tint: string; dim?: boolean }) {
  return (
    <div className={`grid aspect-square w-16 shrink-0 place-items-center rounded-xl bg-gradient-to-br ${tint} text-center text-white shadow-lg sm:w-20 ${dim ? "opacity-25 saturate-0" : ""}`}>
      <span className="font-mono text-base font-semibold sm:text-xl">{label}{sub && <span className="block text-[8px] font-normal uppercase tracking-[0.08em] sm:text-[10px]">{sub}</span>}</span>
    </div>
  );
}

const cards: { title: string; visual: React.ReactNode }[] = [
  { title: "Une caméra. Un câble HDMI.", visual: <Tile label="HDMI" sub="1080p60" tint="from-sky-500 to-blue-700" /> },
  {
    title: "4G, 5G, Wi-Fi et satellite. Tout à la fois.",
    visual: (
      <>
        <Tile label="4G" tint="from-emerald-400 to-teal-700" />
        <Tile label="5G" tint="from-violet-500 to-fuchsia-600" />
        <Tile label="Wi-Fi" tint="from-sky-400 to-indigo-600" />
        <Tile label="SAT" tint="from-amber-400 to-orange-600" />
      </>
    ),
  },
  {
    title: "Une connexion lâche. Les autres prennent le relais.",
    visual: (
      <>
        <Tile label="4G" tint="from-emerald-400 to-teal-700" />
        <Tile label="5G" tint="from-violet-500 to-fuchsia-600" dim />
        <Tile label="SAT" tint="from-amber-400 to-orange-600" />
      </>
    ),
  },
  { title: "Un écran sur le boîtier. Tu vois tout, sans téléphone.", visual: <Tile label="LIVE" sub="en direct" tint="from-rose-500 to-red-700" /> },
  { title: "Pas cher. À venir.", visual: <Tile label="€" sub="tarif à la sortie" tint="from-slate-500 to-slate-800" /> },
];

export default function Highlights() {
  return (
    <ul className="no-scrollbar -mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-4 sm:-mx-6 sm:px-6">
      {cards.map((c) => (
        <li key={c.title} className="flex h-[26rem] w-[85%] shrink-0 snap-start flex-col rounded-[2rem] border border-line bg-background p-8 sm:w-[60%] lg:w-[46%]">
          <h3 className="max-w-[18ch] text-2xl font-semibold leading-tight tracking-tight">{c.title}</h3>
          <div className="flex flex-1 items-center justify-center gap-4">{c.visual}</div>
        </li>
      ))}
    </ul>
  );
}
