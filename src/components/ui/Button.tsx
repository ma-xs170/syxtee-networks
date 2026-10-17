"use client";

import Link from "next/link";
import { useFormStatus } from "react-dom";
import type { ButtonHTMLAttributes, ReactNode } from "react";
import { buttonClass, type Variant } from "./button-styles";

// Bouton du design system : primaire (pilule blanche), secondaire (fond sombre, filet), danger, fantôme.
// `loading` désactive le bouton et affiche un petit indicateur. Un bouton `type="submit"` dans un formulaire
// s'active tout seul pendant l'envoi : pas de double clic, même sans `loading`.
function Spinner() {
  return <span aria-hidden="true" className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent motion-reduce:animate-none" />;
}

export function Button({ variant = "primary", loading = false, children, className = "", disabled, ...rest }: { variant?: Variant; loading?: boolean; children: ReactNode } & ButtonHTMLAttributes<HTMLButtonElement>) {
  const { pending } = useFormStatus();
  const busy = loading || (pending && rest.type === "submit");
  return (
    <button type="button" {...rest} disabled={disabled || busy} aria-busy={busy || undefined} className={buttonClass(variant, className)}>
      {busy && <Spinner />}
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
