"use client";

import { useState } from "react";

// Bloc de code sur une ligne avec bouton « Copier ».
export default function CopyCode({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);

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
    <div className="flex items-stretch overflow-hidden rounded-xl border border-line bg-black">
      <code className="min-w-0 flex-1 break-all p-4 font-mono text-sm">{code}</code>
      <button
        type="button"
        onClick={copy}
        className="shrink-0 border-l border-line px-4 font-mono text-xs uppercase tracking-[0.1em] text-muted transition-colors hover:bg-white/5 hover:text-foreground"
        aria-label="Copier l'URL"
      >
        <span aria-live="polite">{copied ? "Copié" : "Copier"}</span>
      </button>
    </div>
  );
}
