"use client";

import { useInView, useReducedMotion } from "motion/react";
import { useEffect, useRef, useState } from "react";

// Bloc de code façon éditeur : onglets, numéros de ligne, saisie « machine à écrire » au scroll (curseur qui clignote), bouton copier avec coche animée.
type Tab = { label: string; code: string };

export default function CodeBlock({ code, title = "Terminal", tabs, typewriter = false }: { code?: string; title?: string; tabs?: Tab[]; typewriter?: boolean }) {
  const list: Tab[] = tabs ?? [{ label: title, code: code ?? "" }];
  const [i, setI] = useState(0);
  const text = list[i].code;
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.4 });
  const reduce = useReducedMotion();
  const [typed, setTyped] = useState({ t: "", n: 0 });
  const [copied, setCopied] = useState(false);
  // Nombre de caractères affichés : tout si pas de machine à écrire, sinon la progression de ce texte (repart de 0 à chaque onglet).
  const n = !typewriter || reduce ? text.length : typed.t === text ? typed.n : 0;

  useEffect(() => {
    if (!typewriter || reduce || !inView) return;
    let k = 0;
    const id = setInterval(() => {
      k += 2;
      setTyped({ t: text, n: k });
      if (k >= text.length) clearInterval(id);
    }, 18);
    return () => clearInterval(id);
  }, [typewriter, reduce, inView, text]);

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      /* presse-papier refusé */
    }
  }
  const shown = text.slice(0, n).split("\n");
  const typing = typewriter && n < text.length;
  return (
    <div ref={ref} className="overflow-hidden rounded-[20px] border border-line bg-surface">
      <div className="flex items-center justify-between gap-3 border-b border-line px-4 py-2.5">
        <div className="flex items-center gap-1.5" aria-hidden="true">
          {[0, 1, 2].map((k) => (
            <span key={k} className="h-2.5 w-2.5 rounded-full bg-foreground/15" />
          ))}
        </div>
        <div role="tablist" className="flex gap-1">
          {list.map((t, k) => (
            <button key={t.label} role="tab" type="button" aria-selected={k === i} onClick={() => setI(k)} className={`rounded-md px-2.5 py-1 font-mono text-xs transition-colors ${k === i ? "bg-surface-2 text-foreground" : "text-muted hover:text-foreground"}`}>
              {t.label}
            </button>
          ))}
        </div>
        <button type="button" onClick={copy} aria-label="Copier le code" className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs text-muted transition-colors hover:text-foreground">
          <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            {copied ? (
              <path d="M3 8.5l3.2 3.2L13 5" className="check-draw" />
            ) : (
              <>
                <rect x="5.5" y="5.5" width="8" height="8" rx="2" />
                <path d="M10.5 5.5V4a1.5 1.5 0 0 0-1.5-1.5H4A1.5 1.5 0 0 0 2.5 4v5A1.5 1.5 0 0 0 4 10.5h1.5" />
              </>
            )}
          </svg>
          <span aria-live="polite">{copied ? "Copié" : "Copier"}</span>
        </button>
      </div>
      <pre className="overflow-x-auto px-4 py-4 font-mono text-[13px] leading-6 tabular-nums">
        {shown.map((l, k) => (
          <div key={k} className="flex gap-4">
            <span aria-hidden="true" className="w-4 shrink-0 select-none text-right text-foreground/25">
              {k + 1}
            </span>
            <code className="whitespace-pre text-foreground/90">
              {l}
              {typing && k === shown.length - 1 && <span aria-hidden="true" className="caret ml-0.5 inline-block h-4 w-[7px] translate-y-0.5 bg-foreground/80" />}
            </code>
          </div>
        ))}
      </pre>
    </div>
  );
}
