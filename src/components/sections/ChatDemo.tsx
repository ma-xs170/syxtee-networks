"use client";

import { useEffect, useState } from "react";
import { useReducedMotion } from "motion/react";
import { siKick, siTwitch, siYoutube } from "simple-icons";

// Démo du Multichat sur l'accueil : des messages d'exemple arrivent l'un après l'autre, comme dans le vrai fil
// (même animation : la nouvelle ligne se déplie, les anciennes remontent). Aucun vrai chat, aucune connexion.
// Fixe sous prefers-reduced-motion.

type P = "twitch" | "kick";
const icons = { twitch: siTwitch, kick: siKick, youtube: siYoutube };

const POOL: { p: P; user: string; text: string }[] = [
  { p: "twitch", user: "Maëlys", text: "le signal tient bien dans le tunnel" },
  { p: "kick", user: "tonton_fibre", text: "quelle ville ce soir ?" },
  { p: "twitch", user: "Rayan_IRL", text: "salut tout le monde" },
  { p: "kick", user: "Noé", text: "la 5G passe nickel ici" },
  { p: "twitch", user: "Capucine", text: "on peut avoir le débit à l'écran ?" },
  { p: "kick", user: "Ilyes_974", text: "belle vue, tu es où exactement ?" },
  { p: "twitch", user: "Garance", text: "l'image est super fluide" },
  { p: "twitch", user: "Théo_Live", text: "tu passes sur Starlink après ?" },
  { p: "kick", user: "Lou", text: "le son est parfait" },
  { p: "twitch", user: "Mathéo", text: "premier live que je regarde en entier" },
  { p: "kick", user: "Sasha_fr", text: "bravo pour le direct" },
  { p: "twitch", user: "Anaïs", text: "on te voit très bien" },
];
// Plus de lignes que la hauteur du cadre : le haut est toujours rempli (les plus anciennes sortent par le haut, sous le dégradé).
const VISIBLE = 9;

function PlatformIcon({ p, size = 14 }: { p: keyof typeof icons; size?: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill={`#${icons[p].hex}`} aria-hidden="true" className="shrink-0">
      <path d={icons[p].path} />
    </svg>
  );
}

export default function ChatDemo() {
  const reduce = useReducedMotion();
  // Les premiers messages sont déjà là ; la suite arrive toutes les 1,8 s, en boucle.
  const [n, setN] = useState(VISIBLE);
  useEffect(() => {
    if (reduce) return;
    const t = setInterval(() => setN((v) => v + 1), 1800);
    return () => clearInterval(t);
  }, [reduce]);

  const rows = Array.from({ length: VISIBLE + 1 }, (_, i) => n - i)
    .filter((k) => k > 0)
    .map((k) => ({ k, ...POOL[(k - 1) % POOL.length] }));

  return (
    <div className="overflow-hidden rounded-2xl border border-line bg-surface shadow-[0_30px_80px_-30px_rgba(0,0,0,0.6)]">
      <div className="flex items-center gap-3 border-b border-line px-4 py-3 text-sm">
        <span className="rounded-md bg-accent px-3 py-1 text-on-accent">Tout</span>
        <span className="text-muted">YouTube</span>
        <span className="ml-auto flex items-center gap-3 text-muted">
          <PlatformIcon p="twitch" />
          <PlatformIcon p="kick" />
          <PlatformIcon p="youtube" />
        </span>
      </div>
      {/* Colonne inversée : les nouveaux messages arrivent en bas et poussent les autres vers le haut. */}
      <div
        className="flex h-[17rem] flex-col-reverse overflow-hidden px-4 py-3 text-sm [mask-image:linear-gradient(to_bottom,transparent,#000_28%)] [-webkit-mask-image:linear-gradient(to_bottom,transparent,#000_28%)]"
        role="img"
        aria-label="Exemple de messages Twitch et Kick dans un seul fil"
      >
        {rows.map((m) => (
          <div key={m.k} className="chat-row">
            <div>
              <p className="flex items-center gap-2 py-1.5">
                <PlatformIcon p={m.p} size={14} />
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
