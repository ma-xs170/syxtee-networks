import Link from "next/link";
import type { ReactNode } from "react";
import { site } from "@/lib/site";

export function DiscordIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className={className}>
      <path d="M20.3 4.4A19.8 19.8 0 0 0 15.4 3l-.6 1.2a18.4 18.4 0 0 0-5.6 0L8.6 3a19.7 19.7 0 0 0-4.9 1.4C.6 9 -.3 13.5.1 18a19.9 19.9 0 0 0 6 3l1.3-2.1c-.7-.3-1.4-.6-2-1l.5-.4a14.2 14.2 0 0 0 12.2 0l.5.4c-.6.4-1.3.7-2 1l1.3 2.1a19.8 19.8 0 0 0 6-3c.5-5.2-.9-9.7-3.6-13.6ZM8 15.3c-1.2 0-2.2-1.1-2.2-2.4S6.8 10.5 8 10.5s2.2 1.1 2.2 2.4-1 2.4-2.2 2.4Zm8 0c-1.2 0-2.2-1.1-2.2-2.4s1-2.4 2.2-2.4 2.2 1.1 2.2 2.4-1 2.4-2.2 2.4Z" />
    </svg>
  );
}

export function DiscordButton({
  children = "Rejoindre le Discord",
  variant = "primary",
  size = "md",
}: {
  children?: ReactNode;
  variant?: "primary" | "ghost";
  size?: "md" | "sm";
}) {
  const base = `inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full text-sm font-medium transition-colors ${size === "sm" ? "h-9 px-4" : "px-5 py-3"}`;
  const styles =
    variant === "primary"
      ? "bg-white text-black hover:bg-neutral-200"
      : "border border-line text-foreground hover:bg-white/5";
  return (
    <a href={site.discord} target="_blank" rel="noopener noreferrer" className={`${base} ${styles}`}>
      <DiscordIcon />
      {children}
    </a>
  );
}

export function SectionHeader({ kicker, title, children }: { kicker: string; title: ReactNode; children?: ReactNode }) {
  return (
    <div className="max-w-2xl">
      <p className="font-mono text-xs uppercase tracking-[0.2em] text-muted">{kicker}</p>
      <h2 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">{title}</h2>
      {children && <p className="mt-4 text-base leading-relaxed text-muted">{children}</p>}
    </div>
  );
}

export function Container({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`mx-auto w-full max-w-6xl px-4 sm:px-6 ${className}`}>{children}</div>;
}

export function MoreLink({ href, children = "En savoir plus" }: { href: string; children?: ReactNode }) {
  return (
    <Link href={href} className="group inline-flex items-center gap-2 text-sm text-muted transition-colors hover:text-foreground">
      {children}
      <span aria-hidden="true" className="transition-transform group-hover:translate-x-0.5">→</span>
    </Link>
  );
}

/** Inscription, puis l'assistant « Créer un relais » s'ouvre tout seul sur /dashboard/relais?nouveau=1. Même libellé partout. */
export const CREATE_RELAY_HREF = "/inscription?next=%2Fdashboard%2Frelais%3Fnouveau%3D1";

export function CreateRelayLink({ size = "md" }: { size?: "md" | "sm" }) {
  return (
    <Link
      href={CREATE_RELAY_HREF}
      className={`inline-flex items-center justify-center whitespace-nowrap rounded-full bg-white text-sm font-medium text-black transition-colors hover:bg-neutral-200 active:scale-[0.98] ${size === "sm" ? "h-9 px-4" : "px-5 py-3"}`}
    >
      Créer mon relais
    </Link>
  );
}
