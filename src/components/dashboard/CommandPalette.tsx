"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { MagnifyingGlass } from "@/components/icons";

export type Command = { label: string; href: string; hint?: string };

// Ctrl/Cmd+K : saut rapide vers une page de l'espace client. Les pages sont fournies par le menu (Sidebar), une seule source.
export default function CommandPalette({ commands }: { commands: Command[] }) {
  const router = useRouter();
  const dialog = useRef<HTMLDialogElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [index, setIndex] = useState(0);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return commands;
    return commands.filter((c) => `${c.label} ${c.hint ?? ""}`.toLowerCase().includes(q));
  }, [commands, query]);

  const close = () => dialog.current?.close();
  const go = (c: Command | undefined) => {
    if (!c) return;
    close();
    router.push(c.href);
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        const d = dialog.current;
        if (!d) return;
        if (d.open) d.close();
        else {
          setQuery("");
          setIndex(0);
          d.showModal();
          input.current?.focus();
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <dialog
      ref={dialog}
      onClick={(e) => e.target === dialog.current && close()}
      aria-label="Palette de commandes"
      className="m-auto mt-[12vh] w-[min(34rem,calc(100vw-2rem))] rounded-2xl border border-line-strong bg-background p-0 text-foreground backdrop:bg-black/70"
    >
      <div className="flex items-center gap-3 border-b border-line px-4">
        <MagnifyingGlass size={16} className="shrink-0 text-muted" aria-hidden />
        <input
          ref={input}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setIndex(0);
          }}
          onKeyDown={(e) => {
            if (e.key === "ArrowDown") {
              e.preventDefault();
              setIndex((i) => Math.min(i + 1, results.length - 1));
            } else if (e.key === "ArrowUp") {
              e.preventDefault();
              setIndex((i) => Math.max(i - 1, 0));
            } else if (e.key === "Enter") {
              e.preventDefault();
              go(results[index]);
            }
          }}
          placeholder="Aller à une page…"
          aria-label="Rechercher une page"
          className="h-12 min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted"
        />
        <kbd className="rounded border border-line px-1.5 py-0.5 font-mono text-[10px] text-muted">ÉCHAP</kbd>
      </div>
      <ul role="listbox" aria-label="Pages" className="max-h-[50vh] overflow-y-auto p-2">
        {results.length === 0 && <li className="px-3 py-6 text-center text-sm text-muted">Aucune page trouvée.</li>}
        {results.map((c, i) => (
          <li key={c.href} role="option" aria-selected={i === index}>
            <button
              type="button"
              onClick={() => go(c)}
              onMouseEnter={() => setIndex(i)}
              className={`flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2.5 text-left text-sm ${i === index ? "bg-foreground/10" : ""}`}
            >
              <span>{c.label}</span>
              {c.hint && <span className="font-mono text-[11px] uppercase tracking-wider text-muted">{c.hint}</span>}
            </button>
          </li>
        ))}
      </ul>
    </dialog>
  );
}
