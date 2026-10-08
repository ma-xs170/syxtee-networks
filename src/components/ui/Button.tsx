import Link from "next/link";
import type { ButtonHTMLAttributes, ReactNode } from "react";

// Bouton du design system : primaire (pilule blanche), secondaire (fond sombre, filet), danger, fantôme.
// `loading` désactive le bouton et affiche un petit indicateur.
type Variant = "primary" | "secondary" | "danger" | "ghost";

const base =
  "inline-flex items-center justify-center gap-2 whitespace-nowrap text-sm font-medium transition-[background-color,border-color,transform,opacity] duration-150 active:scale-[0.97] disabled:pointer-events-none disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground";
const variants: Record<Variant, string> = {
  primary: "btn-shine relative h-10 overflow-hidden rounded-full bg-accent px-5 text-on-accent hover:bg-accent-hover",
  secondary: "h-10 rounded-[10px] border border-line-strong bg-surface-2 px-4 text-foreground hover:border-foreground/30",
  danger: "h-10 rounded-[10px] bg-bad/15 px-4 text-bad hover:bg-bad/25",
  ghost: "h-10 rounded-[10px] px-3 text-muted hover:text-foreground",
};

export function buttonClass(variant: Variant = "primary", className = "") {
  return `${base} ${variants[variant]} ${className}`;
}

function Spinner() {
  return <span aria-hidden="true" className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent motion-reduce:animate-none" />;
}

export function Button({ variant = "primary", loading = false, children, className = "", disabled, ...rest }: { variant?: Variant; loading?: boolean; children: ReactNode } & ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button type="button" {...rest} disabled={disabled || loading} aria-busy={loading || undefined} className={buttonClass(variant, className)}>
      {loading && <Spinner />}
      {children}
    </button>
  );
}

export function ButtonLink({ href, variant = "primary", children, className = "", external = false }: { href: string; variant?: Variant; children: ReactNode; className?: string; external?: boolean }) {
  const cls = buttonClass(variant, className);
  return external ? (
    <a href={href} target="_blank" rel="noopener noreferrer" className={cls}>
      {children}
    </a>
  ) : (
    <Link href={href} className={cls}>
      {children}
    </Link>
  );
}
