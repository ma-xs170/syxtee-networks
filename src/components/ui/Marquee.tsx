import type { ReactNode } from "react";

/** Défilement infini lent, fondu aux deux bords. Contenu dupliqué une fois ; figé en « réduire les animations ». */
export default function Marquee({ items, className = "" }: { items: ReactNode[]; className?: string }) {
  const row = (
    <ul className="flex shrink-0 items-center gap-12 pr-12" aria-hidden={false}>
      {items.map((it, i) => (
        <li key={i} className="shrink-0 text-foreground/50 grayscale">{it}</li>
      ))}
    </ul>
  );
  return (
    <div className={`marquee-wrap [mask-image:linear-gradient(to_right,transparent,#000_12%,#000_88%,transparent)] ${className}`}>
      <div className="marquee marquee-l !animate-[marquee-l_60s_linear_infinite] motion-reduce:!animate-none">
        {row}
        <span aria-hidden="true" className="contents">{row}</span>
      </div>
    </div>
  );
}
