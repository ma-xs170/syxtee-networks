"use client";

import ProtocolBadge from "../relais/ProtocolBadge";
import { Feed, StatusPill, Vu } from "./parts";
import { isOn, tc, type MixRelay } from "@/lib/mix-sim";

// Colonne de gauche : un relais par carte, les relais actifs en haut. Clic : PREVIEW. Double-clic : PROGRAM.

export default function RelayList({ relays, program, preview, selected, locked, onPreview, onProgram, onSelect }: {
  relays: MixRelay[];
  program: string;
  preview: string;
  selected: string;
  locked: boolean;
  onPreview: (id: string) => void;
  onProgram: (id: string) => void;
  onSelect: (id: string) => void;
}) {
  const sorted = [...relays].sort((a, b) => Number(isOn(b)) - Number(isOn(a)) || a.n - b.n);
  return (
    <section aria-label="Relais" className="flex min-h-0 flex-col rounded-2xl border border-line bg-surface">
      <h2 className="border-b border-line px-4 py-3 text-sm font-semibold">Relais</h2>
      {relays.length === 0 ? (
        <p className="p-6 text-center text-sm text-muted">Aucun relais. Crée-en un dans Mes relais.</p>
      ) : (
        <ul className="min-h-0 flex-1 space-y-2 overflow-y-auto p-2.5 xl:max-h-[calc(100dvh-14rem)]">
          {sorted.map((r) => {
            const on = isOn(r);
            const isProgram = program === r.id;
            const isPreview = preview === r.id;
            return (
              <li key={r.id}>
                <button
                  type="button"
                  disabled={locked}
                  onClick={() => {
                    onSelect(r.id);
                    onPreview(r.id);
                  }}
                  onDoubleClick={() => onProgram(r.id)}
                  aria-pressed={isPreview || isProgram}
                  className={`block w-full overflow-hidden rounded-xl border text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/50 disabled:cursor-not-allowed ${
                    isProgram ? "border-live" : isPreview ? "border-emerald-500" : selected === r.id ? "border-line-strong" : "border-line hover:border-line-strong"
                  } ${on ? "" : "opacity-60"}`}
                >
                  <div className="relative aspect-video">
                    <Feed relay={r} className="absolute inset-0" />
                    <span className="absolute left-2 top-2 rounded bg-background/80 px-1.5 py-0.5 font-mono text-[10px] font-semibold tracking-wider">CAM {r.n}</span>
                    {(isProgram || isPreview) && (
                      <span className={`absolute right-2 top-2 rounded px-1.5 py-0.5 font-mono text-[10px] font-semibold tracking-wider text-on-accent ${isProgram ? "bg-live" : "bg-emerald-600"}`}>
                        {isProgram ? "PGM" : "PVW"}
                      </span>
                    )}
                    <div className="absolute inset-x-2 bottom-2">
                      <Vu active={on && !r.mute} level={r.status === "unstable" ? 0.5 : 0.7} />
                    </div>
                  </div>
                  <div className="space-y-2 p-3">
                    <div className="flex items-center justify-between gap-2">
                      <p className="min-w-0 truncate text-sm font-medium">{r.name}</p>
                      <ProtocolBadge protocol={r.protocol} />
                    </div>
                    <StatusPill status={r.status} />
                    {on && (
                      <dl className="grid grid-cols-3 gap-x-2 gap-y-1 font-mono text-[11px] tabular-nums text-muted">
                        <Stat k="kbps" v={r.kbps.toLocaleString("fr-FR")} />
                        <Stat k="fps" v={String(r.fps)} />
                        <Stat k="rés." v={r.res} />
                        <Stat k="lat." v={`${r.latencyMs} ms`} warn={r.latencyMs > 400} />
                        <Stat k="perte" v={`${r.lossPct} %`} warn={r.lossPct > 2} />
                        <Stat k="liens" v={String(r.links)} />
                        <Stat k="durée" v={tc(r.uptime)} wide />
                      </dl>
                    )}
                  </div>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

function Stat({ k, v, warn, wide }: { k: string; v: string; warn?: boolean; wide?: boolean }) {
  return (
    <div className={wide ? "col-span-3" : ""}>
      <dt className="sr-only">{k}</dt>
      <dd className={warn ? "text-orange-300" : "text-foreground"}>
        {v} <span className="text-muted">{k}</span>
      </dd>
    </div>
  );
}
