// Apple Watch réaliste en HTML/CSS : boîtier noir, couronne, bouton, bracelet sport perforé, et le chat du live à l'écran.
// Inclinée en 3D (perspective). Décoratif : aria-hidden. Les messages sont un exemple.

const CHAT: { t: string; u: string; m: string; c: string }[] = [
  { t: "12:13", u: "lea_irl", m: "gg le spot !", c: "#7ee0c8" },
  { t: "12:13", u: "maxime", m: "on te voit nickel", c: "#a99bff" },
  { t: "12:13", u: "sofia", m: "trop fort ce direct", c: "#ff8fa3" },
  { t: "12:14", u: "yanis", m: "goooo", c: "#ffd37a" },
  { t: "12:14", u: "tom", m: "bien joué !", c: "#7ec8ff" },
];

export default function WatchMock({ className = "" }: { className?: string }) {
  return (
    <div aria-hidden="true" className={`mx-auto w-[13rem] select-none py-24 sm:w-[15rem] ${className}`} style={{ perspective: "1100px" }}>
      <div className="relative" style={{ transform: "rotateY(-22deg) rotateX(10deg) rotateZ(-6deg)", transformStyle: "preserve-3d" }}>
        {/* Bracelet haut et bas */}
        <div className="absolute left-1/2 top-[-34%] h-[44%] w-[62%] -translate-x-1/2 rounded-t-[2.4rem] bg-[linear-gradient(90deg,#0c0c0d,#26262a_45%,#0c0c0d)]">
          {[0, 1, 2].map((i) => <span key={i} className="absolute left-1/2 size-2.5 -translate-x-1/2 rounded-full bg-black shadow-[inset_0_1px_2px_rgba(0,0,0,0.9),0_1px_0_rgba(255,255,255,0.08)]" style={{ top: `${14 + i * 20}%` }} />)}
        </div>
        <div className="absolute bottom-[-34%] left-1/2 h-[44%] w-[62%] -translate-x-1/2 rounded-b-[2.4rem] bg-[linear-gradient(90deg,#0c0c0d,#26262a_45%,#0c0c0d)]" />
        {/* Boîtier */}
        <div className="relative aspect-[4/5] rounded-[3rem] bg-[linear-gradient(145deg,#3a3a3f,#0d0d0e_40%,#2b2b30)] p-[3px] shadow-[0_40px_70px_-20px_rgba(0,0,0,0.95),0_0_0_1px_rgba(255,255,255,0.07)]">
          <div className="size-full rounded-[2.85rem] bg-black p-[7%]">
            {/* Écran */}
            <div className="relative size-full overflow-hidden rounded-[2.2rem] bg-[#050506] px-[9%] pt-[8%] shadow-[inset_0_0_0_1px_rgba(255,255,255,0.06)]">
              <div className="flex items-center justify-between font-mono text-[0.62rem] sm:text-[0.7rem]">
                <span className="flex items-center gap-1.5 font-semibold text-white"><span className="size-1.5 rounded-full bg-[var(--live)]" />LIVE</span>
                <span className="text-white">12:14</span>
              </div>
              <ul className="mt-[8%] space-y-[7%]">
                {CHAT.map((l, i) => (
                  <li key={i} className="flex gap-1.5 text-[0.7rem] leading-snug sm:text-[0.8rem]" style={{ opacity: 0.55 + i * 0.15 }}>
                    <span className="mt-[0.15rem] size-3 shrink-0 rounded-[4px] bg-white/15" />
                    <span className="min-w-0">
                      <span className="mr-1 font-semibold" style={{ color: l.c }}>{l.u}</span>
                      <span className="text-white/85">{l.m}</span>
                    </span>
                  </li>
                ))}
              </ul>
              <span className="absolute inset-x-0 top-0 h-1/3 bg-gradient-to-b from-white/[0.06] to-transparent" />
            </div>
          </div>
        </div>
        {/* Couronne et bouton */}
        <span className="absolute -right-[3.5%] top-[24%] h-[13%] w-[5%] rounded-r-md bg-[repeating-linear-gradient(0deg,#4a4a52_0_2px,#1a1a1d_2px_4px)] shadow-[0_0_0_1px_rgba(0,0,0,0.6)]" />
        <span className="absolute -right-[2%] top-[44%] h-[10%] w-[3%] rounded-r bg-[#2a2a2f]" />
      </div>
    </div>
  );
}
