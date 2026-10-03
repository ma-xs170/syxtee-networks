"use client";

import { useCallback, useEffect, useState } from "react";
import { siKick, siTwitch, siYoutube } from "simple-icons";

// Comptes Twitch, Kick et YouTube reliés pour lire et écrire dans le Multichat (Mon compte). Les jetons restent côté serveur :
// on ne reçoit que le nom de chaque compte. Une plateforme non configurée sur le serveur n'est pas proposée.

const P = [
  { id: "youtube", label: "YouTube", icon: siYoutube },
  { id: "twitch", label: "Twitch", icon: siTwitch },
  { id: "kick", label: "Kick", icon: siKick },
] as const;

type State = { connections: Record<string, string>; configured: Record<string, boolean> };

export default function ChatAccounts() {
  const [s, setS] = useState<State | null>(null);
  const [failed, setFailed] = useState(false);

  const load = useCallback(async () => {
    try {
      const r = await fetch("/api/chat/connections", { cache: "no-store" });
      if (!r.ok) throw new Error(String(r.status));
      setS((await r.json()) as State);
    } catch {
      setFailed(true);
    }
  }, []);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  if (failed) return <p className="text-sm text-muted">Impossible de charger tes comptes reliés. Recharge la page.</p>;
  if (!s) return <div aria-hidden="true" className="h-40 animate-pulse rounded-xl bg-foreground/[0.06] motion-reduce:animate-none" />;

  return (
    <ul className="divide-y divide-line overflow-hidden rounded-xl border border-line">
      {P.map((p) => {
        const who = s.connections[p.id];
        const available = s.configured[p.id];
        return (
          <li key={p.id} className="flex items-center gap-4 px-4 py-3.5">
            <svg viewBox="0 0 24 24" width="22" height="22" fill={`#${p.icon.hex}`} aria-hidden="true" className="shrink-0">
              <path d={p.icon.path} />
            </svg>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium">{p.label}</p>
              <p className="truncate text-xs text-muted">{who ? `Relié : ${who}` : available ? "Pas encore relié" : "Bientôt disponible"}</p>
            </div>
            {who ? (
              <button
                type="button"
                onClick={async () => {
                  await fetch(`/api/chat/connections?platform=${p.id}`, { method: "DELETE" });
                  await load();
                }}
                className="h-9 rounded-lg border border-line px-3.5 text-sm text-muted transition-colors hover:bg-foreground/10 hover:text-foreground"
              >
                Délier
              </button>
            ) : (
              available && (
                <a href={`/api/chat/connect/${p.id}`} className="inline-flex h-9 items-center rounded-lg border border-line-strong px-3.5 text-sm font-medium transition-colors hover:bg-foreground/10">
                  Relier
                </a>
              )
            )}
          </li>
        );
      })}
    </ul>
  );
}
