"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { ArrowLeft, Eye, Plus, Trash } from "@/components/icons";
import { SceneView } from "./SceneScreen";
import ProtocolBadge from "../relais/ProtocolBadge";
import { sceneRelayIds, type Scene } from "@/lib/cloud-scenes";
import { camColor, isOn, type MixRelay } from "@/lib/mix-sim";

// Les docks d'OBS Cloud, dans l'ordre d'OBS : Scènes, Sources, Transitions. (Mixeur audio et Contrôles réutilisent AudioMixer et DirectPanel.)
// Chaque dock a une barre de titre, un corps qui défile, et une barre de boutons + / − en bas, comme dans OBS.

export type TransitionKind = "cut" | "mix";

const iconBtn = "grid h-7 w-7 place-items-center rounded-md border border-line text-muted transition-colors hover:bg-foreground/10 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/50 disabled:cursor-not-allowed disabled:opacity-40";

export function Dock({ title, children, footer, className = "" }: { title: string; children: ReactNode; footer?: ReactNode; className?: string }) {
  return (
    <section aria-label={title} className={`flex h-full min-h-0 min-w-0 flex-col overflow-hidden rounded-lg border border-line bg-surface ${className}`}>
      <h2 className="shrink-0 border-b border-line bg-surface-2 px-2.5 py-1 font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-muted">{title}</h2>
      <div className="min-h-0 flex-1 overflow-y-auto p-1.5">{children}</div>
      {footer && <div className="flex shrink-0 items-center gap-1 border-t border-line bg-surface-2 p-1">{footer}</div>}
    </section>
  );
}

/** Bouton qui demande un second appui (3 s) avant une suppression. */
function ArmButton({ label, disabled, onGo, children }: { label: string; disabled?: boolean; onGo: () => void; children: ReactNode }) {
  const [armed, setArmed] = useState(false);
  useEffect(() => {
    if (!armed) return;
    const t = setTimeout(() => setArmed(false), 3000);
    return () => clearTimeout(t);
  }, [armed]);
  return (
    <button type="button" disabled={disabled} aria-label={armed ? `${label} : appuie encore pour confirmer` : label} title={armed ? "Appuie encore pour confirmer" : label} onClick={() => (armed ? (setArmed(false), onGo()) : setArmed(true))} className={`${iconBtn} ${armed ? "border-live bg-live/15 text-foreground" : ""}`}>
      {children}
    </button>
  );
}

export function ScenesDock({ scenes, programId, previewId, studio, locked, onPick, onAdd, onRemove, onRename }: { scenes: Scene[]; programId: string; previewId: string; studio: boolean; locked: boolean; onPick: (id: string) => void; onAdd: () => void; onRemove: (id: string) => void; onRename: (id: string, name: string) => void }) {
  const [renaming, setRenaming] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const cur = studio ? previewId : programId;
  const done = () => {
    if (renaming && draft.trim()) onRename(renaming, draft.trim());
    setRenaming(null);
  };
  return (
    <Dock
      title="Scènes"
      footer={
        <>
          <button type="button" disabled={locked} onClick={onAdd} aria-label="Ajouter une scène" title="Ajouter une scène" className={iconBtn}>
            <Plus size={14} aria-hidden="true" />
          </button>
          <ArmButton label="Supprimer la scène" disabled={locked || scenes.length < 2} onGo={() => onRemove(cur)}>
            <Trash size={14} aria-hidden="true" />
          </ArmButton>
        </>
      }
    >
      <ul className="grid gap-0.5">
        {scenes.map((s) => {
          const isProgram = s.id === programId;
          const isPreview = studio && s.id === previewId && !isProgram;
          const selected = s.id === cur;
          return (
            <li key={s.id}>
              {renaming === s.id ? (
                <input autoFocus aria-label="Nom de la scène" value={draft} maxLength={60} onChange={(e) => setDraft(e.target.value)} onBlur={done} onKeyDown={(e) => (e.key === "Enter" ? done() : e.key === "Escape" && setRenaming(null))} className="h-8 w-full rounded-md border border-line-strong bg-background px-2 text-base text-foreground lg:text-xs" />
              ) : (
                <button
                  type="button"
                  disabled={locked}
                  aria-pressed={selected}
                  title="Clic : afficher la scène. Double-clic : renommer."
                  onClick={() => onPick(s.id)}
                  onDoubleClick={() => (setDraft(s.name), setRenaming(s.id))}
                  className={`flex h-8 w-full items-center justify-between gap-2 rounded-md border px-2 text-left text-xs transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/50 disabled:cursor-not-allowed ${selected ? "border-foreground/60 bg-foreground/10 font-medium" : "border-transparent hover:bg-foreground/5"}`}
                >
                  <span className="truncate">{s.name}</span>
                  {isProgram && <span className="shrink-0 rounded bg-live px-1 font-mono text-[9px] font-semibold tracking-wider text-on-accent">PGM</span>}
                  {isPreview && <span className="shrink-0 rounded bg-emerald-600 px-1 font-mono text-[9px] font-semibold tracking-wider text-on-accent">PVW</span>}
                </button>
              )}
            </li>
          );
        })}
      </ul>
    </Dock>
  );
}

export function SourcesDock({ scene, relays, selected, locked, onSelect, onAdd, onRemove, onToggle, onMove }: { scene: Scene | undefined; relays: MixRelay[]; selected: string | null; locked: boolean; onSelect: (id: string) => void; onAdd: (relayId: string) => void; onRemove: (itemId: string) => void; onToggle: (itemId: string) => void; onMove: (itemId: string, dir: -1 | 1) => void }) {
  const [menu, setMenu] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!menu) return;
    const away = (e: PointerEvent) => !box.current?.contains(e.target as Node) && setMenu(false);
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setMenu(false);
    document.addEventListener("pointerdown", away);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("pointerdown", away);
      document.removeEventListener("keydown", esc);
    };
  }, [menu]);
  const items = scene ? [...scene.items].reverse() : []; // comme OBS : la source du dessus en haut de la liste
  const byId = (id: string) => relays.find((r) => r.id === id);
  return (
    <Dock
      title={scene ? `Sources · ${scene.name}` : "Sources"}
      footer={
        <>
          <div ref={box} className="relative">
            <button type="button" disabled={locked || !scene} aria-haspopup="menu" aria-expanded={menu} aria-label="Ajouter une source" title="Ajouter une source" onClick={() => setMenu((v) => !v)} className={iconBtn}>
              <Plus size={14} aria-hidden="true" />
            </button>
            {menu && (
              <ul role="menu" aria-label="Relais disponibles" className="absolute bottom-9 left-0 z-30 max-h-60 w-60 overflow-y-auto rounded-lg border border-line-strong bg-background p-1 shadow-lg">
                {relays.length === 0 && <li className="px-2 py-1.5 text-xs text-muted">Aucun relais. Crée-en un dans Mes relais.</li>}
                {relays.map((r) => (
                  <li key={r.id} role="none">
                    <button type="button" role="menuitem" onClick={() => (onAdd(r.id), setMenu(false))} className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs hover:bg-foreground/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/50">
                      <span aria-hidden="true" className="h-2 w-2 shrink-0 rounded-full" style={isOn(r) ? { background: camColor(r.n) } : { border: "1px solid var(--muted)" }} />
                      <span className="min-w-0 flex-1 truncate">CAM {r.n} · {r.name}</span>
                      <ProtocolBadge protocol={r.protocol} />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <ArmButton label="Retirer la source" disabled={locked || !selected} onGo={() => selected && onRemove(selected)}>
            <Trash size={14} aria-hidden="true" />
          </ArmButton>
          <button type="button" disabled={locked || !selected} aria-label="Monter la source" title="Monter" onClick={() => selected && onMove(selected, 1)} className={iconBtn}>
            <ArrowLeft size={14} className="rotate-90" aria-hidden="true" />
          </button>
          <button type="button" disabled={locked || !selected} aria-label="Descendre la source" title="Descendre" onClick={() => selected && onMove(selected, -1)} className={iconBtn}>
            <ArrowLeft size={14} className="-rotate-90" aria-hidden="true" />
          </button>
        </>
      }
    >
      {items.length === 0 ? (
        <p className="p-2 text-xs text-muted">Scène vide. Appuie sur + pour ajouter un relais comme source.</p>
      ) : (
        <ul className="grid gap-0.5">
          {items.map((it) => {
            const r = byId(it.relayId);
            return (
              <li key={it.id} className={`flex items-center gap-1 rounded-md border pr-1 ${selected === it.id ? "border-foreground/60 bg-foreground/10" : "border-transparent hover:bg-foreground/5"}`}>
                <button type="button" aria-pressed={selected === it.id} onClick={() => onSelect(it.id)} className={`flex h-8 min-w-0 flex-1 items-center gap-2 rounded-md px-2 text-left text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/50 ${it.visible ? "" : "text-muted line-through"}`}>
                  <span aria-hidden="true" className="h-2 w-2 shrink-0 rounded-full" style={r && isOn(r) ? { background: camColor(r.n) } : { border: "1px solid var(--muted)" }} />
                  <span className="truncate">{r ? `CAM ${r.n} · ${r.name}` : "Relais supprimé"}</span>
                  {r && !isOn(r) && <span className="shrink-0 font-mono text-[9px] tracking-wider text-muted">HORS LIGNE</span>}
                </button>
                <button type="button" disabled={locked} aria-pressed={it.visible} aria-label={`${it.visible ? "Masquer" : "Afficher"} la source`} onClick={() => onToggle(it.id)} className={`grid h-6 w-6 shrink-0 place-items-center rounded-md hover:bg-foreground/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/50 disabled:opacity-40 ${it.visible ? "text-foreground" : "text-muted"}`}>
                  <Eye size={14} weight={it.visible ? "fill" : "regular"} aria-hidden="true" />
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </Dock>
  );
}

export function TransitionsDock({ transition, onTransition, duration, onDuration, locked }: { transition: TransitionKind; onTransition: (t: TransitionKind) => void; duration: number; onDuration: (ms: number) => void; locked: boolean }) {
  const sel = "h-8 w-full rounded-md border border-line bg-background px-2 text-base text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/50 disabled:opacity-40 lg:text-xs";
  return (
    <Dock title="Transitions de scènes">
      <div className="grid gap-2 p-1">
        <label className="grid gap-1 font-mono text-[10px] uppercase tracking-wider text-muted">
          Transition
          <select className={sel} value={transition} disabled={locked} onChange={(e) => onTransition(e.target.value as TransitionKind)}>
            <option value="mix">Fondu</option>
            <option value="cut">Coupure</option>
          </select>
        </label>
        <label className="grid gap-1 font-mono text-[10px] uppercase tracking-wider text-muted">
          Durée
          <select className={sel} value={duration} disabled={locked || transition === "cut"} onChange={(e) => onDuration(Number(e.target.value))}>
            {[300, 500, 1000, 2000].map((ms) => (
              <option key={ms} value={ms}>
                {ms} ms
              </option>
            ))}
          </select>
        </label>
      </div>
    </Dock>
  );
}

/** Commutateur : la vue multiple de toutes les scènes (comme le projecteur « Vue multiple » d'OBS). Clic = aperçu, double-clic = programme. */
export function CommutateurDock({ scenes, byId, programId, previewId, studio, locked, onPick, onProgram, onCut, onAuto }: { scenes: Scene[]; byId: (id: string) => MixRelay | undefined; programId: string; previewId: string; studio: boolean; locked: boolean; onPick: (id: string) => void; onProgram: (id: string) => void; onCut: () => void; onAuto: () => void }) {
  const btn = "h-8 flex-1 rounded-md font-mono text-xs font-semibold tracking-wider focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/50 disabled:cursor-not-allowed disabled:opacity-40";
  const canSend = studio && !locked && previewId !== programId;
  return (
    <Dock
      title="Commutateur"
      footer={
        <>
          <button type="button" disabled={!canSend} onClick={onCut} title={studio ? "Envoie l'aperçu au programme, sans fondu" : "Active le Mode Studio pour préparer une scène"} className={`${btn} bg-live text-on-accent hover:opacity-90`}>
            CUT
          </button>
          <button type="button" disabled={!canSend} onClick={onAuto} title={studio ? "Envoie l'aperçu au programme avec la transition" : "Active le Mode Studio pour préparer une scène"} className={`${btn} border border-line-strong hover:bg-foreground/10`}>
            AUTO
          </button>
        </>
      }
    >
      <ul className="grid grid-cols-2 gap-1.5">
        {scenes.map((s, i) => {
          const isP = s.id === programId;
          const isV = studio && s.id === previewId && !isP;
          return (
            <li key={s.id} className={`relative overflow-hidden rounded-md border-2 ${isP ? "border-live" : isV ? "border-emerald-500" : "border-line"}`}>
              <button type="button" disabled={locked} onClick={() => onPick(s.id)} onDoubleClick={() => onProgram(s.id)} aria-label={`${s.name} : ${studio ? "aperçu" : "programme"} (double-clic : programme)`} className="absolute inset-0 z-10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-foreground/60 disabled:cursor-not-allowed" />
              <div className="pointer-events-none relative aspect-video bg-black">
                <SceneView scene={s} byId={byId} compact />
                <span className="absolute left-1 top-1 z-[1] rounded bg-background/80 px-1 font-mono text-[9px] font-semibold text-foreground">{i + 1}</span>
                <p className="absolute inset-x-0 bottom-0 z-[1] truncate px-1 pb-0.5 text-center text-[10px] font-bold uppercase text-white [text-shadow:0_1px_2px_rgb(0_0_0/0.9)]">{s.name}</p>
              </div>
              <span className="sr-only">{sceneRelayIds(s).length} sources</span>
            </li>
          );
        })}
      </ul>
    </Dock>
  );
}
