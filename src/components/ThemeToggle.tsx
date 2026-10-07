"use client";

import { useEffect, useState } from "react";

// Mode d'affichage : Automatique (suit le système), Sombre ou Clair. Le choix est mémorisé dans localStorage
// et appliqué avant l'affichage par THEME_SCRIPT (layout racine), sans flash. Automatique = pas d'attribut data-theme.

export type ThemeMode = "auto" | "dark" | "light";
const MODES: { id: ThemeMode; label: string }[] = [
  { id: "auto", label: "Auto" },
  { id: "dark", label: "Sombre" },
  { id: "light", label: "Clair" },
];
const KEY = "theme";

export const THEME_SCRIPT = `try{var t=localStorage.getItem("${KEY}");if(t==="dark"||t==="light")document.documentElement.setAttribute("data-theme",t)}catch(e){}`;

function read(): ThemeMode {
  try {
    const t = localStorage.getItem(KEY);
    return t === "dark" || t === "light" ? t : "auto";
  } catch {
    return "auto";
  }
}

function apply(mode: ThemeMode) {
  const root = document.documentElement;
  if (mode === "auto") root.removeAttribute("data-theme");
  else root.setAttribute("data-theme", mode);
  try {
    if (mode === "auto") localStorage.removeItem(KEY);
    else localStorage.setItem(KEY, mode);
  } catch {}
}

export default function ThemeToggle({ className = "" }: { className?: string }) {
  const [mode, setMode] = useState<ThemeMode | null>(null);
  useEffect(() => setMode(read()), []);

  return (
    <div role="radiogroup" aria-label="Mode d'affichage" className={`inline-flex rounded-full border border-line p-0.5 ${className}`}>
      {MODES.map((m) => (
        <button
          key={m.id}
          type="button"
          role="radio"
          aria-checked={mode === m.id}
          onClick={() => {
            setMode(m.id);
            apply(m.id);
          }}
          className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${mode === m.id ? "bg-accent text-on-accent" : "text-muted hover:text-foreground"}`}
        >
          {m.label}
        </button>
      ))}
    </div>
  );
}

const NEXT: Record<ThemeMode, ThemeMode> = { auto: "dark", dark: "light", light: "auto" };
const LABEL: Record<ThemeMode, string> = { auto: "Auto", dark: "Sombre", light: "Clair" };

/** Une seule ligne « Thème : Sombre » : chaque appui passe au mode suivant (Auto, Sombre, Clair). */
export function ThemeRow({ className = "", icon }: { className?: string; icon?: React.ReactNode }) {
  const [mode, setMode] = useState<ThemeMode | null>(null);
  useEffect(() => setMode(read()), []);
  return (
    <button
      type="button"
      onClick={() => {
        const n = NEXT[mode ?? "auto"];
        setMode(n);
        apply(n);
      }}
      aria-label={`Thème : ${LABEL[mode ?? "auto"]}. Changer de thème`}
      className={className}
    >
      {icon}
      <span className="truncate">Thème</span>
      <span className="ml-auto text-sm text-foreground/70">{mode ? LABEL[mode] : ""}</span>
    </button>
  );
}
