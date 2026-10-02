"use client";

import { useState } from "react";
import { maskUrl } from "@/lib/dashboard-data";
import { useStreamMode } from "./streamMode";

// URL de stream : clé masquée par défaut, bouton œil pour l'afficher (désactivé en mode stream), bouton Copier.

function Eye({ open }: { open: boolean }) {
  return (
    <svg viewBox="0 0 16 16" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={1.5} aria-hidden="true">
      <path d="M1.5 8s2.4-4.5 6.5-4.5S14.5 8 14.5 8s-2.4 4.5-6.5 4.5S1.5 8 1.5 8Z" />
      <circle cx="8" cy="8" r="2" />
      {!open && <path d="M2.5 13.5l11-11" />}
    </svg>
  );
}

export default function MaskedUrl({ url, label, size = "md" }: { url: string; label: string; size?: "sm" | "md" }) {
  const [shown, setShown] = useState(false);
  const [copied, setCopied] = useState(false);
  const streamMode = useStreamMode();
  const visible = shown && !streamMode;

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  const btn = "shrink-0 border-l border-line px-3 text-muted transition-colors hover:bg-foreground/10 hover:text-foreground disabled:opacity-40 disabled:hover:bg-transparent";
  return (
    <div className="flex items-stretch overflow-hidden rounded-xl border border-line bg-background">
      <code data-sensitive className={`min-w-0 flex-1 break-all font-mono ${size === "sm" ? "p-3 text-xs" : "p-4 text-sm"}`}>
        {visible ? url : maskUrl(url)}
      </code>
      <button
        type="button"
        onClick={() => setShown((v) => !v)}
        disabled={streamMode}
        className={btn}
        aria-pressed={visible}
        aria-label={streamMode ? `Clé ${label} masquée (mode stream)` : visible ? `Masquer la clé ${label}` : `Afficher la clé ${label}`}
        title={streamMode ? "Mode stream actif" : visible ? "Masquer" : "Afficher"}
      >
        <Eye open={visible} />
      </button>
      <button type="button" onClick={copy} className={`${btn} font-mono text-xs uppercase tracking-[0.1em]`} aria-label={`Copier l'URL ${label}`}>
        <span aria-live="polite">{copied ? "Copié" : "Copier"}</span>
      </button>
    </div>
  );
}
