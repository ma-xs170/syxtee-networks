"use client";

import { useState } from "react";

/** Bloc de code façon éditeur : trois points, numéros de ligne, bouton copier. */
export default function CodeBlock({ code, title = "Terminal" }: { code: string; title?: string }) {
  const [copied, setCopied] = useState(false);
  const lines = code.split("\n");
  async function copy() {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      /* presse-papier refusé : on ne fait rien */
    }
  }
  return (
    <div className="overflow-hidden rounded-2xl border border-line bg-surface">
      <div className="flex items-center justify-between border-b border-line px-4 py-2.5">
        <div className="flex items-center gap-1.5" aria-hidden="true">
          <span className="h-2.5 w-2.5 rounded-full bg-foreground/15" />
          <span className="h-2.5 w-2.5 rounded-full bg-foreground/15" />
          <span className="h-2.5 w-2.5 rounded-full bg-foreground/15" />
        </div>
        <span className="font-mono text-xs text-muted">{title}</span>
        <button type="button" onClick={copy} className="rounded-md px-2 py-1 text-xs text-muted transition-colors hover:text-foreground">
          {copied ? "Copié" : "Copier"}
        </button>
      </div>
      <pre className="overflow-x-auto px-4 py-4 font-mono text-[13px] leading-6">
        {lines.map((l, i) => (
          <div key={i} className="flex gap-4">
            <span aria-hidden="true" className="w-4 shrink-0 select-none text-right text-foreground/25">
              {i + 1}
            </span>
            <code className="whitespace-pre text-foreground/90">{l}</code>
          </div>
        ))}
      </pre>
    </div>
  );
}
