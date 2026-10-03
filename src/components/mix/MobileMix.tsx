"use client";

import { useState } from "react";
import { Broadcast, Faders, Rows, SquaresFour } from "@phosphor-icons/react";
import AudioMixer from "./AudioMixer";
import DirectPanel from "./DirectPanel";
import type { MixModel } from "./model";
import { RelayCard } from "./RelayViews";
import { Screen, TransitionBar } from "./Stage";

// Vraie app mobile (< 1024 px) : barre d'onglets fixe en bas (RÉGIE, RELAIS, MIXEUR, DIRECT), cibles tactiles de 48 px ou plus,
// pas de survol (les détails passent par l'appui sur la carte et le tiroir de réglages). Paysage : PROGRAMME et APERÇU côte à côte.

const TABS = [
  { id: "regie", label: "Régie", Icon: SquaresFour },
  { id: "relais", label: "Relais", Icon: Rows },
  { id: "mixeur", label: "Mixeur", Icon: Faders },
  { id: "direct", label: "Direct", Icon: Broadcast },
] as const;
type Tab = (typeof TABS)[number]["id"];

export default function MobileMix({ m }: { m: MixModel }) {
  const [tab, setTab] = useState<Tab>("regie");
  const empty = m.relays.length === 0;

  return (
    <>
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-2 pb-3 pt-2" role="tabpanel" aria-label={TABS.find((t) => t.id === tab)?.label}>
        {empty && tab !== "direct" ? (
          <p className="grid h-full place-items-center text-center text-sm text-muted">Aucun relais. Crée-en un dans Mes relais.</p>
        ) : tab === "regie" ? (
          <div className="space-y-2">
            <div className="grid gap-2 landscape:grid-cols-2">
              <Screen relayId={m.program} kind="program" ms={m.programMs} slate={m.slate} byId={m.byId} />
              <Screen relayId={m.preview} kind="preview" ms={0} byId={m.byId} className="w-3/5 landscape:w-full" />
            </div>
            <TransitionBar relays={m.relays} program={m.program} preview={m.preview} locked={m.locked} transition={m.transition} onTransition={m.setTransition} duration={m.duration} onDuration={m.setDuration} onPreview={m.toPreview} onCut={m.cut} onAuto={m.auto} clock={m.clock} big />
          </div>
        ) : tab === "relais" ? (
          <ul className="space-y-3">
            {[...m.relays].sort((a, b) => a.n - b.n).map((r) => (
              <RelayCard key={r.id} relay={r} program={m.program} preview={m.preview} locked={m.locked} onPreview={() => m.toPreview(r.id)} onProgram={() => m.toProgram(r.id)} onSettings={() => m.openSettings(r.id)} />
            ))}
          </ul>
        ) : tab === "mixeur" ? (
          <AudioMixer relays={m.relays} program={m.program} locked={m.locked} master={m.master} onMaster={m.setMaster} masterMute={m.masterMute} onMasterMute={m.toggleMasterMute} onPatch={m.patch} big className="h-[calc(100dvh-10.5rem-env(safe-area-inset-bottom))] min-h-[22rem]" />
        ) : (
          <div className="mx-auto max-w-md pt-2">
            <DirectPanel locked={m.locked} live={m.live} liveSeconds={m.liveSeconds} onLive={m.toggleLive} rec={m.rec} recSeconds={m.recSeconds} onRec={m.toggleRec} slate={m.slate} onSlate={m.toggleSlate} onShot={m.shot} onMarker={m.marker} big />
          </div>
        )}
      </div>

      <nav aria-label="Navigation" className="shrink-0 border-t border-line bg-surface pb-[env(safe-area-inset-bottom)]">
        <ul className="grid h-14 grid-cols-4">
          {TABS.map(({ id, label, Icon }) => (
            <li key={id}>
              <button type="button" onClick={() => setTab(id)} aria-current={tab === id ? "page" : undefined} className={`relative flex h-full w-full flex-col items-center justify-center gap-0.5 text-[11px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-foreground/50 ${tab === id ? "text-foreground" : "text-muted"}`}>
                {tab === id && <span aria-hidden="true" className="absolute inset-x-6 top-0 h-0.5 rounded-full bg-accent" />}
                <Icon size={22} weight={tab === id ? "fill" : "regular"} aria-hidden="true" />
                {label}
              </button>
            </li>
          ))}
        </ul>
      </nav>
    </>
  );
}
