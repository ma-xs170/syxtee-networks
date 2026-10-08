type Variant = "ok" | "live" | "unstable" | "offline" | "dev";
const dot: Record<Exclude<Variant, "dev">, string> = { ok: "var(--ok)", live: "var(--ok)", unstable: "var(--warn)", offline: "var(--bad)" };
const DEFAULT: Record<Variant, string> = { ok: "Opérationnel", live: "En direct", unstable: "Instable", offline: "Hors ligne", dev: "EN DÉVELOPPEMENT" };

/** Pastille de statut : pilule à fond 4 %, filet 8 %, point de 6 px dont le halo respire. `live` ajoute un timer mono. `dev` : sans point, filet pointillé. */
export default function StatusPill({ variant = "ok", label, timer, className = "" }: { variant?: Variant; label?: string; timer?: string; className?: string }) {
  const text = label ?? DEFAULT[variant];
  if (variant === "dev")
    return <span className={`inline-flex items-center rounded-full border border-dashed border-foreground/25 px-2.5 py-1 font-mono text-[11px] uppercase tracking-[0.08em] text-muted ${className}`}>{text}</span>;
  return (
    <span className={`inline-flex items-center gap-2 rounded-full border border-line bg-foreground/[0.04] px-2.5 py-1 text-[13px] text-foreground ${className}`}>
      <span aria-hidden="true" className="pill-dot h-1.5 w-1.5 rounded-full" style={{ background: dot[variant], ["--c" as string]: dot[variant] }} />
      {text}
      {timer && <span className="font-mono tabular-nums text-muted">{timer}</span>}
    </span>
  );
}
