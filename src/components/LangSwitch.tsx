"use client";

import { useEffect, useRef, useState } from "react";

// Sélecteur de langue (drapeau + FR/EN) : choix gardé dans localStorage et un cookie « lang ». Le script de layout.tsx remet <html lang> avant l'affichage.

type Lang = "fr" | "en";

function Flag({ lang }: { lang: Lang }) {
  return lang === "fr" ? (
    <svg viewBox="0 0 3 2" width="28" height="19" aria-hidden="true" className="shrink-0 rounded-[5px] border border-line-strong">
      <rect width="1" height="2" fill="#1d3f9c" />
      <rect x="1" width="1" height="2" fill="#f4f4f4" />
      <rect x="2" width="1" height="2" fill="#d4202c" />
    </svg>
  ) : (
    <svg viewBox="0 0 60 40" width="28" height="19" aria-hidden="true" className="shrink-0 rounded-[5px] border border-line-strong">
      <rect width="60" height="40" fill="#1d3f9c" />
      <path d="M0 0l60 40M60 0L0 40" stroke="#f4f4f4" strokeWidth="8" />
      <path d="M0 0l60 40M60 0L0 40" stroke="#d4202c" strokeWidth="3" />
      <path d="M30 0v40M0 20h60" stroke="#f4f4f4" strokeWidth="13" />
      <path d="M30 0v40M0 20h60" stroke="#d4202c" strokeWidth="7" />
    </svg>
  );
}

export default function LangSwitch({ className = "" }: { className?: string }) {
  const [lang, setLang] = useState<Lang>("fr");
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setLang(document.documentElement.lang === "en" ? "en" : "fr");
  }, []);
  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (!box.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const pick = (l: Lang) => {
    setLang(l);
    setOpen(false);
    document.documentElement.lang = l;
    try {
      localStorage.setItem("lang", l);
    } catch {}
    document.cookie = `lang=${l}; path=/; max-age=31536000; samesite=lax`;
  };

  return (
    <div ref={box} className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={lang === "fr" ? "Langue : français" : "Language: English"}
        className="inline-flex h-10 items-center gap-2 rounded-xl px-2 text-sm font-medium text-foreground hover:bg-foreground/[0.06] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground"
      >
        <Flag lang={lang} />
        <span>{lang.toUpperCase()}</span>
        <svg viewBox="0 0 12 12" width="10" height="10" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className={`text-muted transition-transform ${open ? "rotate-180" : ""}`}>
          <path d="m2.5 4.5 3.5 3.5 3.5-3.5" />
        </svg>
      </button>
      {open && (
        <ul role="listbox" className="absolute right-0 top-[calc(100%+8px)] z-50 w-44 rounded-2xl border border-line-strong bg-surface p-1.5 shadow-lg">
          {(["fr", "en"] as const).map((l) => (
            <li key={l} role="option" aria-selected={l === lang}>
              <button type="button" onClick={() => pick(l)} className="flex min-h-11 w-full items-center gap-3 rounded-xl px-3 text-left text-sm hover:bg-foreground/[0.08] focus-visible:outline-2 focus-visible:outline-foreground">
                <Flag lang={l} />
                <span className="flex-1">{l === "fr" ? "Français" : "English"}</span>
                {l === lang && (
                  <svg viewBox="0 0 12 12" width="12" height="12" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <path d="m2 6.5 2.5 2.5L10 3.5" />
                  </svg>
                )}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
