import type { InputHTMLAttributes } from "react";

/** Champ du design system : fond --input, filet fin, rayon 12 px. Libellé au-dessus, jamais en placeholder. */
export default function Input({ label, hint, className = "", id, ...rest }: { label: string; hint?: string } & InputHTMLAttributes<HTMLInputElement>) {
  const fid = id ?? `f-${label.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
  return (
    <div className="grid gap-2">
      <label htmlFor={fid} className="text-sm text-muted">
        {label}
      </label>
      <input id={fid} {...rest} className={`h-11 w-full max-w-[620px] rounded-xl border border-line bg-input px-3.5 text-sm text-foreground placeholder:text-muted/70 transition-colors focus:border-foreground/50 focus:outline-none ${className}`} />
      {hint && <p className="text-xs text-muted">{hint}</p>}
    </div>
  );
}
