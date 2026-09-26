"use client";

import { useState } from "react";
import { isFilled, partners } from "@/lib/site";

// Code promo Saily à copier. Rien n'est affiché tant que partners.saily.code n'est pas rempli.
export default function PromoCode({ className = "" }: { className?: string }) {
  const code = partners.saily.code;
  const [copied, setCopied] = useState(false);
  if (!isFilled(code)) return null;

  async function copy() {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div className={`inline-flex items-stretch overflow-hidden rounded-xl border border-line bg-black ${className}`}>
      <div className="px-4 py-3">
        <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted">Code promo {partners.saily.name}</p>
        <p className="mt-1 font-mono text-xl tracking-[0.12em] text-foreground">{code}</p>
      </div>
      <button
        type="button"
        onClick={copy}
        className="border-l border-line px-4 font-mono text-xs uppercase tracking-[0.1em] text-muted transition-colors hover:bg-white/5 hover:text-foreground"
        aria-label={`Copier le code promo ${code}`}
      >
        <span aria-live="polite">{copied ? "Copié" : "Copier"}</span>
      </button>
    </div>
  );
}
