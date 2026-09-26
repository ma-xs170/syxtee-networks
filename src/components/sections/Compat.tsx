import { compat } from "@/lib/site";

export default function Compat() {
  const items = [...compat, ...compat];
  return (
    <section className="overflow-hidden border-b border-line py-6" aria-label="Compatibilité">
      <div className="marquee">
        {items.map((name, i) => (
          <span key={i} className="flex items-center gap-10 pr-10 font-mono text-sm uppercase tracking-[0.2em] text-muted">
            {name}
            <span className="text-white/20">/</span>
          </span>
        ))}
      </div>
    </section>
  );
}
