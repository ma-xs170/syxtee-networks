"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Record as RecordIcon, Stop } from "@/components/icons";
import { setRecordAction } from "@/app/(dashboard)/dashboard/relais/actions";
import type { RelayProtocol } from "@/lib/core";
import { useLiveStatus } from "./LiveStatus";
import MultiChat, { type ChatDefaults } from "./MultiChat";
import StreamHealth from "./StreamHealth";
import ProtocolBadge from "../relais/ProtocolBadge";
import StreamPreview from "./StreamPreview";

// Studio d'aperçu, façon régie OBS : en haut le choix de la source (un relais = une source, point rouge s'il est en direct)
// et le mode, puis le flux en temps réel à côté du chat (même hauteur), puis la santé du flux (débit, latence, pertes).
// « Multi » affiche toutes les sources en direct côte à côte (4 max) ; un clic sur une vignette l'ouvre en grand.

type Source = { id: string; name: string; live: boolean; protocol: RelayProtocol; record: boolean; recordAvailable: boolean };
type Mode = "single" | "multi";

const MULTI_MAX = 4;

export default function LiveStudio({ sources, coreUrl, initial, chat }: { sources: Source[]; coreUrl: string; initial: string; chat: ChatDefaults }) {
  const [current, setCurrent] = useState(initial);
  const [mode, setMode] = useState<Mode>("single");
  const { state } = useLiveStatus();
  const router = useRouter();
  const [saving, startSaving] = useTransition();
  const [recError, setRecError] = useState<string | null>(null);
  // Choix en attente de confirmation du serveur, par relais (le bouton répond tout de suite).
  const [recOverride, setRecOverride] = useState<Record<string, boolean>>({});

  // Le statut en temps réel du Core prime sur l'état chargé avec la page.
  const liveIds = new Set(state?.relays?.filter((r) => r.live).map((r) => r.id) ?? sources.filter((s) => s.live).map((s) => s.id));
  const isLive = (id: string) => liveIds.has(id);
  const selected = sources.find((s) => s.id === current) ?? sources[0];
  const multi = sources.filter((s) => isLive(s.id)).slice(0, MULTI_MAX);

  const recOn = selected ? (recOverride[selected.id] ?? selected.record) : false;
  function toggleRecord() {
    if (!selected) return;
    const id = selected.id;
    const next = !recOn;
    setRecError(null);
    setRecOverride((o) => ({ ...o, [id]: next }));
    startSaving(async () => {
      const r = await setRecordAction(id, next);
      if (r.error) {
        setRecOverride((o) => ({ ...o, [id]: !next }));
        setRecError(r.error);
        return;
      }
      router.refresh();
    });
  }

  const tab = (m: Mode) =>
    `min-h-9 rounded-lg px-4 text-sm transition-colors ${mode === m ? "bg-accent text-on-accent" : "text-muted hover:text-foreground"}`;

  const chatTile = (
    <div className="flex min-h-[22rem] flex-col lg:min-h-0">
      <MultiChat defaults={chat} height="min-h-0 flex-1" compact />
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <div role="group" aria-label="Mode d'affichage" className="flex rounded-xl border border-line bg-surface p-1">
          <button type="button" className={tab("single")} aria-pressed={mode === "single"} onClick={() => setMode("single")}>
            Une vue
          </button>
          <button type="button" className={tab("multi")} aria-pressed={mode === "multi"} onClick={() => setMode("multi")}>
            Multi
          </button>
        </div>
        <ul aria-label="Sources" className="flex min-w-0 flex-1 gap-2 overflow-x-auto pb-1">
          {sources.map((s) => {
            const active = mode === "single" && selected?.id === s.id;
            return (
              <li key={s.id} className="shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    setCurrent(s.id);
                    setMode("single");
                  }}
                  aria-pressed={active}
                  className={`flex min-h-11 items-center gap-2.5 rounded-xl border px-4 text-sm transition-colors ${
                    active ? "border-line-strong bg-foreground/10 text-foreground" : "border-line text-muted hover:text-foreground"
                  }`}
                >
                  {isLive(s.id) ? <span className="live-dot shrink-0" aria-label="En direct" /> : <span className="h-2 w-2 shrink-0 rounded-full border border-muted" aria-label="Hors ligne" />}
                  <span className="max-w-[12rem] truncate">{s.name}</span>
                  <ProtocolBadge protocol={s.protocol} />
                </button>
              </li>
            );
          })}
        </ul>
        {mode === "single" && selected?.recordAvailable && (
          <div className="flex shrink-0 items-center gap-3">
            <button
              type="button"
              onClick={toggleRecord}
              disabled={saving}
              aria-pressed={recOn}
              className={`inline-flex h-12 items-center gap-2.5 whitespace-nowrap rounded-full px-6 text-base font-semibold transition-colors active:scale-[0.98] disabled:opacity-60 ${
                recOn ? "border-2 border-accent text-foreground hover:bg-foreground/10" : "bg-accent text-on-accent hover:bg-accent-hover"
              }`}
            >
              {recOn ? <Stop size={22} weight="fill" className="text-accent" aria-hidden="true" /> : <RecordIcon size={22} weight="fill" aria-hidden="true" />}
              {recOn ? "Arrêter l'enregistrement" : "Enregistrer"}
            </button>
            <Link href="/dashboard/enregistrements" className="whitespace-nowrap text-sm text-foreground/80 underline underline-offset-4 hover:text-foreground">
              Mes enregistrements
            </Link>
          </div>
        )}
      </div>
      {recError && (
        <p role="alert" className="text-sm text-red-400">
          {recError}
        </p>
      )}
      {mode === "single" && selected && recOn && (
        <p className="text-sm text-muted">{isLive(selected.id) ? "L'enregistrement est en cours, il continue même si tu quittes la page." : "L'enregistrement démarrera dès que ton direct sera en ligne."}</p>
      )}

      {mode === "single" && selected ? (
        <>
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            <div className="lg:col-span-2">
              <StreamPreview key={selected.id} coreUrl={coreUrl} relayId={selected.id} />
            </div>
            {chatTile}
          </div>
          <StreamHealth key={selected.id} coreUrl={coreUrl} relayId={selected.id} />
        </>
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <div className="lg:col-span-2">
            {multi.length === 0 ? (
              <div className="flex min-h-64 items-center justify-center rounded-2xl border border-line bg-surface px-6 text-center text-sm text-muted">
                Aucune source en direct. Lance ton live : les aperçus apparaissent ici.
              </div>
            ) : (
              <ul className={`grid grid-cols-1 gap-4 ${multi.length > 1 ? "md:grid-cols-2" : ""}`}>
                {multi.map((s) => (
                  <li key={s.id}>
                    <div className="mb-2 flex items-center justify-between gap-3">
                      <p className="flex items-center gap-2 font-mono text-xs text-muted">
                        {s.name}
                        <ProtocolBadge protocol={s.protocol} />
                      </p>
                      <button
                        type="button"
                        onClick={() => {
                          setCurrent(s.id);
                          setMode("single");
                        }}
                        className="text-xs text-muted underline-offset-4 transition-colors hover:text-foreground hover:underline"
                      >
                        Ouvrir en grand
                      </button>
                    </div>
                    <StreamPreview key={s.id} coreUrl={coreUrl} relayId={s.id} />
                  </li>
                ))}
              </ul>
            )}
          </div>
          {chatTile}
        </div>
      )}
    </div>
  );
}
