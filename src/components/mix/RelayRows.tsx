"use client";

import ProtocolBadge from "../relais/ProtocolBadge";
import { isOn, type MixRelay, type RelayStatus } from "@/lib/mix-sim";

// Relais en rangées compactes (une ligne chacun) : état, nom, protocole, débit. Les relais actifs en haut.
// Clic : sélectionne le relais et le met en APERÇU (les réglages s'ouvrent dans le panneau du dessus).

const DOT: Record<RelayStatus, string> = {
  live: "bg-live",
  online: "bg-emerald-500",
  unstable: "bg-orange-400",
  offline: "border border-muted",
};
const LABEL: Record<RelayStatus, string> = { live: "En direct", online: "En ligne", unstable: "Instable", offline: "Hors ligne" };

export default function RelayRows({ relays, program, preview, selected, locked, onSelect, realCount, useReal, onUseReal }: {
  relays: MixRelay[];
  program: string;
  preview: string;
  selected: string;
  locked: boolean;
  onSelect: (id: string) => void;
  realCount: number;
  useReal: boolean;
  onUseReal: (v: boolean) => void;
}) {
  const sorted = [...relays].sort((a, b) => Number(isOn(b)) - Number(isOn(a)) || a.n - b.n);
  return (
    <section aria-label="Relais" className="rounded-xl border border-line bg-surface">
      <div className="flex items-center justify-between gap-2 border-b border-line px-3 py-1.5">
        <h2 className="text-xs font-semibold">Relais</h2>
        {realCount > 0 && (
          <label className="flex items-center gap-1.5 text-[11px] text-muted" title="Décoché : relais de démonstration">
            <input type="checkbox" checked={useReal} onChange={(e) => onUseReal(e.target.checked)} className="h-3.5 w-3.5 accent-[var(--accent)]" />
            Mes relais
          </label>
        )}
      </div>
      {relays.length === 0 ? (
        <p className="px-3 py-3 text-center text-xs text-muted">Aucun relais. Crée-en un dans Mes relais.</p>
      ) : (
        <ul className="max-h-48 divide-y divide-line overflow-y-auto">
          {sorted.map((r) => {
            const on = isOn(r);
            return (
              <li key={r.id}>
                <button
                  type="button"
                  disabled={locked}
                  onClick={() => onSelect(r.id)}
                  aria-pressed={selected === r.id}
                  className={`flex h-7 w-full items-center gap-2 px-3 text-left text-xs transition-colors hover:bg-foreground/[0.06] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-foreground/50 disabled:cursor-not-allowed ${selected === r.id ? "bg-foreground/10" : ""} ${on ? "" : "text-muted"}`}
                >
                  <span className={`h-2 w-2 shrink-0 rounded-full ${DOT[r.status]}`} role="img" aria-label={LABEL[r.status]} />
                  <span className="min-w-0 flex-1 truncate">
                    <span className="font-mono text-[10px] text-muted">{r.n} </span>
                    {r.name}
                  </span>
                  {(r.id === program || r.id === preview) && <span className={`font-mono text-[9px] font-semibold ${r.id === program ? "text-live" : "text-emerald-400"}`}>{r.id === program ? "PGM" : "PVW"}</span>}
                  <ProtocolBadge protocol={r.protocol} className="border-line px-1 py-0 text-muted" />
                  <span className="w-12 text-right font-mono tabular-nums text-muted">{on && r.kbps ? r.kbps.toLocaleString("fr-FR") : "–"}</span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
