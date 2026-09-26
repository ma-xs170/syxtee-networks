import type { ReactNode } from "react";
import { site } from "@/lib/site";

export function DiscordIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className={className}>
      <path d="M20.3 4.4A19.8 19.8 0 0 0 15.4 3l-.6 1.2a18.4 18.4 0 0 0-5.6 0L8.6 3a19.7 19.7 0 0 0-4.9 1.4C.6 9 -.3 13.5.1 18a19.9 19.9 0 0 0 6 3l1.3-2.1c-.7-.3-1.4-.6-2-1l.5-.4a14.2 14.2 0 0 0 12.2 0l.5.4c-.6.4-1.3.7-2 1l1.3 2.1a19.8 19.8 0 0 0 6-3c.5-5.2-.9-9.7-3.6-13.6ZM8 15.3c-1.2 0-2.2-1.1-2.2-2.4S6.8 10.5 8 10.5s2.2 1.1 2.2 2.4-1 2.4-2.2 2.4Zm8 0c-1.2 0-2.2-1.1-2.2-2.4s1-2.4 2.2-2.4 2.2 1.1 2.2 2.4-1 2.4-2.2 2.4Z" />
    </svg>
  );
}

export function DiscordButton({ children = "Rejoindre le Discord", variant = "primary" }: { children?: ReactNode; variant?: "primary" | "ghost" }) {
  const base = "inline-flex items-center justify-center gap-2 rounded-full px-5 py-3 text-sm font-medium transition-colors";
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
