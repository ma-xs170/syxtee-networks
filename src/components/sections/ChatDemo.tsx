"use client";

import { useEffect, useState } from "react";
import { useReducedMotion } from "motion/react";
import { siKick, siTwitch, siYoutube } from "simple-icons";

// Démo du Multichat sur l'accueil, avec le même principe que le vrai : les logos se cliquent pour choisir une ou plusieurs
// plateformes (Twitch et Kick dans le même fil, YouTube dans son panneau). Des messages d'exemple arrivent l'un après
// l'autre (la nouvelle ligne se déplie, les anciennes remontent). Aucun vrai chat. Fixe sous prefers-reduced-motion.

type P = "twitch" | "kick" | "youtube";
const icons = { twitch: siTwitch, kick: siKick, youtube: siYoutube };
const LABEL: Record<P, string> = { twitch: "Twitch", kick: "Kick", youtube: "YouTube" };
const ALL: P[] = ["youtube", "twitch", "kick"];

const POOL: { p: P; user: string; text: string }[] = [
  { p: "twitch", user: "Maëlys", text: "le signal tient bien dans le tunnel" },
  { p: "youtube", user: "Camille", text: "belle qualité d'image" },
  { p: "kick", user: "tonton_fibre", text: "quelle ville ce soir ?" },
  { p: "twitch", user: "Rayan_IRL", text: "salut tout le monde" },
  { p: "youtube", user: "Hugo_974", text: "ça passe bien sur mon téléphone" },
  { p: "kick", user: "Noé", text: "la 5G passe nickel ici" },
  { p: "twitch", user: "Capucine", text: "on peut avoir le débit à l'écran ?" },
  { p: "kick", user: "Ilyes_974", text: "belle vue, tu es où exactement ?" },
  { p: "youtube", user: "Inès", text: "merci pour le live" },
  { p: "twitch", user: "Garance", text: "l'image est super fluide" },
  { p: "twitch", user: "Théo_Live", text: "tu passes sur Starlink après ?" },
  { p: "youtube", user: "Léo", text: "on te voit très bien d'ici" },
  { p: "kick", user: "Lou", text: "le son est parfait" },
  { p: "twitch", user: "Mathéo", text: "premier live que je regarde en entier" },
  { p: "kick", user: "Sasha_fr", text: "bravo pour le direct" },
  { p: "twitch", user: "Anaïs", text: "on te voit très bien" },
];
// Plus de lignes que la hauteur du cadre : le haut est toujours rempli (les plus anciennes sortent par le haut, sous le dégradé).
const VISIBLE = 9;

function PlatformIcon({ p, size = 14 }: { p: P; size?: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill={`#${icons[p].hex}`} aria-hidden="true" className="shrink-0">
      <path d={icons[p].path} />
    </svg>
  );
}

export default function ChatDemo({ heightClass = "h-[19rem]" }: { heightClass?: string }) {
  const reduce = useReducedMotion();
  const [sel, setSel] = useState<Set<P>>(new Set(ALL));
  // Les premiers messages sont déjà là ; la suite arrive toutes les 1,8 s, en boucle.
  const [n, setN] = useState(VISIBLE * 2);
  useEffect(() => {
    if (reduce) return;
    const t = setInterval(() => setN((v) => v + 1), 1800);
    return () => clearInterval(t);
  }, [reduce]);

  const allOn = sel.size === ALL.length;
  const toggle = (p: P) =>
    setSel((cur) => {
      const next = new Set(cur);
      if (next.has(p)) {
        if (next.size === 1) return cur; // il en reste toujours une
        next.delete(p);
      } else next.add(p);
      return next;
    });

  const rows = Array.from({ length: VISIBLE * 3 }, (_, i) => n - i)
    .filter((k) => k > 0)
    .map((k) => ({ k, ...POOL[(k - 1) % POOL.length] }))
    .filter((m) => sel.has(m.p))
    .slice(0, VISIBLE + 1);

  return (
    <div className="overflow-hidden rounded-2xl border border-line bg-surface shadow-[0_30px_80px_-30px_rgba(0,0,0,0.6)]">
      <div className="flex items-center gap-2 border-b border-line px-3 py-2.5 text-sm">
        <button
          type="button"
          aria-pressed={allOn}
          onClick={() => setSel(new Set(ALL))}
          className={`min-h-9 rounded-lg px-3 transition-colors ${allOn ? "bg-accent text-on-accent" : "border border-line text-muted hover:text-foreground"}`}
        >
          Tout
        </button>
        <div className="flex items-center gap-1" role="group" aria-label="Plateformes affichées">
          {ALL.map((p) => {
            const on = sel.has(p);
            return (
              <button
                key={p}
                type="button"
                aria-pressed={on}
                aria-label={LABEL[p]}
                onClick={() => toggle(p)}
                className={`flex min-h-9 items-center gap-2 rounded-lg border px-2.5 transition-colors ${on ? "border-line-strong bg-foreground/10 text-foreground" : "border-line text-muted opacity-60 hover:opacity-100"}`}
              >
                <PlatformIcon p={p} size={16} />
                <span className="hidden sm:inline">{LABEL[p]}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Un seul fil pour toutes les plateformes. Colonne inversée : les nouveaux messages arrivent en bas et poussent les autres vers le haut. */}
      <div
        className={`flex ${heightClass} flex-col-reverse overflow-hidden px-4 py-3 text-sm [mask-image:linear-gradient(to_bottom,transparent,#000_28%)] [-webkit-mask-image:linear-gradient(to_bottom,transparent,#000_28%)]`}
        role="img"
        aria-label="Exemple de messages YouTube, Twitch et Kick dans un seul fil"
      >
        {rows.map((m) => (
          <div key={m.k} className="chat-row">
            <div>
              <p className="flex items-center gap-2 py-1.5">
                <PlatformIcon p={m.p} />
                <span>
                  <span className="font-semibold">{m.user}</span>
                  <span className="text-muted">: {m.text}</span>
                </span>
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
