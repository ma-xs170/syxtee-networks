"use client";

import { ArrowDown, ArrowUp, Eye, EyeSlash, Plus, Record as RecordIcon, SpeakerHigh, SpeakerSlash, Stop, Trash } from "@phosphor-icons/react";
import Image from "next/image";
import Link from "next/link";
import { forwardRef, useCallback, useEffect, useRef, useState } from "react";
import { StudioEngine } from "./engine";
import AutoPanel from "./AutoPanel";
import GoLive from "./GoLive";
import Multiview from "./Multiview";
import { H, KIND_LABEL, W, defaultBox, hasAudio, loadProject, uid, type Item, type Source, type SourceKind } from "./model";

// Studio SYXTEE : un OBS dans le navigateur. Scènes, sources (flux relais, webcam, micro, capture, image, texte, couleur),
// mode studio (aperçu / programme), transitions, mixeur audio avec niveaux, enregistrement. Le moteur est dans engine.ts.

type Relay = { id: string; name: string; live: boolean };
type Handle = "move" | "nw" | "ne" | "sw" | "se";

const panel = "panel min-h-0 overflow-y-auto p-3";
// Hauteur disponible pour l'image : écran moins barre (48), docks (300), marges et libellé.
const FIT = "min(100%, calc((100dvh - 408px) * 16 / 9))";
const title = "mb-2 flex items-center justify-between text-xs font-semibold uppercase tracking-[0.14em] text-muted";
const iconBtn = "rounded-md p-1 text-muted transition-colors hover:bg-accent/10 hover:text-foreground disabled:opacity-40";
const toDb = (v: number) => (v <= 0.0001 ? -100 : 20 * Math.log10(v));

function Meter({ db }: { db: number }) {
  const pct = Math.max(0, Math.min(100, ((db + 60) / 60) * 100));
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-accent/10" aria-hidden="true">
      <div className={`h-full rounded-full ${db > -6 ? "bg-live" : "bg-accent"}`} style={{ width: `${pct}%` }} />
    </div>
  );
}

export default function Studio({ relays, coreUrl }: { relays: Relay[]; coreUrl: string }) {
  const programRef = useRef<HTMLCanvasElement>(null);
  const previewRef = useRef<HTMLCanvasElement>(null);
  const editRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [, bump] = useState(0);
  const [e, setEngine] = useState<StudioEngine | null>(null);
  const [levels, setLevels] = useState<Record<string, number>>({});
  const [selected, setSelected] = useState<string | null>(null);
  const [menu, setMenu] = useState(false);
  const [fadeMode, setFadeMode] = useState(true);
  const [listen, setListen] = useState(true);
  const [elapsed, setElapsed] = useState(0);
  const [view, setView] = useState<"studio" | "multiview">("studio");
  const [auto, setAuto] = useState(false);
  const [golive, setGolive] = useState(false);
  const drag = useRef<{ handle: Handle; id: string; sx: number; sy: number; box: Item } | null>(null);

  useEffect(() => {
    const eng = new StudioEngine(loadProject(), coreUrl);
    eng.onChange = () => bump((n) => n + 1);
    eng.sync();
    setEngine(eng);
    const t = setInterval(() => setLevels(eng.levels()), 100);
    return () => {
      clearInterval(t);
      eng.dispose();
      setEngine(null);
    };
  }, [coreUrl]);

  const studio = e?.studioMode ?? false;

  useEffect(() => {
    if (view === "studio") e?.attach(programRef.current, studio ? previewRef.current : null);
  });

  useEffect(() => {
    if (!e?.recording) return setElapsed(0);
    const t0 = Date.now();
    const t = setInterval(() => setElapsed(Math.floor((Date.now() - t0) / 1000)), 500);
    return () => clearInterval(t);
  }, [e?.recording, e]);

  const editId = e ? (studio ? e.project.preview : e.project.program) : "";
  const editScene = e?.scene(editId);
  const selItem = editScene?.items.find((i) => i.id === selected) ?? null;
  const selSource = selItem ? e?.source(selItem.sourceId) : undefined;

  const patchItem = useCallback(
    (id: string, patch: Partial<Item>) =>
      e?.update((p) => ({ ...p, scenes: p.scenes.map((s) => (s.id === editId ? { ...s, items: s.items.map((i) => (i.id === id ? { ...i, ...patch } : i)) } : s)) })),
    [e, editId],
  );
  const patchSource = (id: string, patch: Partial<Source>) => e?.update((p) => ({ ...p, sources: p.sources.map((s) => (s.id === id ? { ...s, ...patch } : s)) }));

  const addSource = (src: Omit<Source, "id">) => {
    if (!e) return;
    const source: Source = { ...src, id: uid() };
    const item: Item = { id: uid(), sourceId: source.id, visible: true, ...defaultBox(source) };
    e.update((p) => ({ ...p, sources: [...p.sources, source], scenes: p.scenes.map((s) => (s.id === editId ? { ...s, items: [...s.items, item] } : s)) }));
    setSelected(item.id);
    setMenu(false);
  };

  const removeItem = (item: Item) => {
    e?.update((p) => {
      const scenes = p.scenes.map((s) => (s.id === editId ? { ...s, items: s.items.filter((i) => i.id !== item.id) } : s));
      const used = new Set(scenes.flatMap((s) => s.items.map((i) => i.sourceId)));
      return { ...p, scenes, sources: p.sources.filter((s) => used.has(s.id)) };
    });
    setSelected(null);
  };

  const moveItem = (id: string, dir: -1 | 1) =>
    e?.update((p) => ({
      ...p,
      scenes: p.scenes.map((s) => {
        if (s.id !== editId) return s;
        const i = s.items.findIndex((x) => x.id === id);
        const j = i + dir;
        if (i < 0 || j < 0 || j >= s.items.length) return s;
        const items = [...s.items];
        [items[i], items[j]] = [items[j], items[i]];
        return { ...s, items };
      }),
    }));

  // ---------- manipulation dans l'aperçu ----------
  const toCanvas = (ev: React.PointerEvent) => {
    const r = editRef.current!.getBoundingClientRect();
    return { x: ((ev.clientX - r.left) / r.width) * W, y: ((ev.clientY - r.top) / r.height) * H };
  };
  const onDown = (ev: React.PointerEvent, handle?: Handle) => {
    if (!editScene) return;
    const { x, y } = toCanvas(ev);
    let target = selItem;
    const h: Handle = handle ?? "move";
    if (!handle) {
      target = [...editScene.items].reverse().find((i) => i.visible && x >= i.x && x <= i.x + i.w && y >= i.y && y <= i.y + i.h) ?? null;
      setSelected(target?.id ?? null);
    }
    if (!target) return;
    (ev.currentTarget as HTMLElement).setPointerCapture(ev.pointerId);
    drag.current = { handle: h, id: target.id, sx: x, sy: y, box: target };
    ev.stopPropagation();
  };
  const onMove = (ev: React.PointerEvent) => {
    const d = drag.current;
    if (!d) return;
    const { x, y } = toCanvas(ev);
    const dx = x - d.sx;
    const dy = y - d.sy;
    const b = d.box;
    const min = 24;
    if (d.handle === "move") patchItem(d.id, { x: Math.round(b.x + dx), y: Math.round(b.y + dy) });
    else {
      const left = d.handle === "nw" || d.handle === "sw";
      const top = d.handle === "nw" || d.handle === "ne";
      const w = Math.max(min, left ? b.w - dx : b.w + dx);
      const h = Math.max(min, top ? b.h - dy : b.h + dy);
      patchItem(d.id, { x: Math.round(left ? b.x + b.w - w : b.x), y: Math.round(top ? b.y + b.h - h : b.y), w: Math.round(w), h: Math.round(h) });
    }
  };

  const pickScene = (id: string) => {
    if (!e) return;
    setSelected(null);
    if (studio) e.update((p) => ({ ...p, preview: id }));
    else if (fadeMode) e.fade(id);
    else e.cut(id);
  };
  const addScene = () => {
    const id = uid();
    e?.update((p) => ({ ...p, scenes: [...p.scenes, { id, name: `Scène ${p.scenes.length + 1}`, items: [] }], ...(studio ? { preview: id } : { program: id }) }));
  };
  const renameScene = (id: string, name: string) => {
    const n = name.trim();
    if (n) e?.update((p) => ({ ...p, scenes: p.scenes.map((s) => (s.id === id ? { ...s, name: n } : s)) }));
  };
  const deleteScene = (id: string) => {
    if (!e || e.project.scenes.length < 2) return;
    e.update((p) => {
      const scenes = p.scenes.filter((s) => s.id !== id);
      const first = scenes[0].id;
      return { ...p, scenes, program: p.program === id ? first : p.program, preview: p.preview === id ? first : p.preview };
    });
  };

  const audioSources = e?.project.sources.filter((s) => hasAudio(s.kind)) ?? [];
  const clock = `${String(Math.floor(elapsed / 60)).padStart(2, "0")}:${String(elapsed % 60).padStart(2, "0")}`;
  const btn = "inline-flex h-9 items-center justify-center gap-2 whitespace-nowrap rounded-full px-4 text-sm font-medium transition-colors";

  const boxStyle = (i: Item) => ({ left: `${(i.x / W) * 100}%`, top: `${(i.y / H) * 100}%`, width: `${(i.w / W) * 100}%`, height: `${(i.h / H) * 100}%` });

  if (!e) return <div className="flex min-h-dvh items-center justify-center text-sm text-muted">Chargement du studio…</div>;

  return (
    <div className="flex min-h-dvh flex-col bg-background text-foreground lg:h-dvh lg:overflow-hidden" onPointerDownCapture={() => e.unlock()}>
      <header className="flex h-12 shrink-0 items-center justify-between gap-4 border-b border-line px-4">
        <div className="flex items-center gap-3">
          <Image src="/logo-400.png" alt="" width={18} height={25} className="ink-img" priority />
          <h1 className="text-sm font-semibold tracking-[0.18em]">
            SYXTEE <span className="font-normal text-muted">STUDIO</span>
          </h1>
        </div>
        <div className="flex items-center gap-3">
          {e.recording && (
            <span className="flex items-center gap-2 font-mono text-xs text-live">
              <span className="live-dot" aria-hidden="true" /> REC {clock}
            </span>
          )}
          <button
            type="button"
            aria-pressed={golive}
            onClick={() => {
              setGolive((v) => !v);
              setAuto(false);
            }}
            className={`inline-flex items-center gap-2 rounded-full px-3.5 py-1 text-xs font-semibold transition-colors ${e.live === "live" || e.live === "connecting" ? "bg-live text-white" : "bg-accent text-on-accent hover:bg-accent-hover"}`}
          >
            {(e.live === "live" || e.live === "connecting") && <span className="h-1.5 w-1.5 rounded-full bg-white" aria-hidden="true" />}
            {e.live === "live" ? "En direct" : e.live === "connecting" ? "Connexion…" : "Diffuser"}
          </button>
          <button
            type="button"
            aria-pressed={auto}
            onClick={() => {
              setAuto((v) => !v);
              setGolive(false);
            }}
            className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${auto || e.settings.failover.on || e.settings.podcast.on ? "border-line-strong text-foreground" : "border-line text-muted hover:text-foreground"}`}
          >
            Automatisation{e.settings.podcast.on ? " · Podcast" : e.settings.failover.on ? " · Secours" : ""}
          </button>
          <div role="group" aria-label="Vue" className="flex rounded-full border border-line p-0.5">
            {(
              [
                ["studio", "Studio"],
                ["multiview", "Multiview"],
              ] as const
            ).map(([v, l]) => (
              <button
                key={v}
                type="button"
                aria-pressed={view === v}
                onClick={() => {
                  setView(v);
                  if (v === "multiview") e.setStudioMode(true);
                }}
                className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${view === v ? "bg-accent text-on-accent" : "text-muted hover:text-foreground"}`}
              >
                {l}
              </button>
            ))}
          </div>
          <Link href="/dashboard" className="text-sm text-muted transition-colors hover:text-foreground">
            Retour au dashboard
          </Link>
        </div>
      </header>
      {/* Aperçu / programme */}
      {view === "multiview" ? (
        <Multiview e={e} levels={levels} recClock={clock} fade={fadeMode} />
      ) : (
        <>
      <div className="flex min-h-0 flex-1 items-center justify-center gap-4 p-4">
        {studio && (
          <section aria-label="Aperçu" className="flex min-w-0 flex-1 flex-col items-center">
            <p className="mb-2 w-full font-mono text-xs uppercase tracking-[0.14em] text-muted" style={{ maxWidth: FIT }}>Aperçu : {e.scene(e.project.preview)?.name}</p>
            <div className="relative aspect-video w-full overflow-hidden rounded-xl border border-line-strong bg-black" style={{ maxWidth: FIT }}>
              <canvas ref={previewRef} width={W} height={H} className="h-full w-full" />
              <EditLayer ref={editRef} item={selItem} boxStyle={boxStyle} onDown={onDown} onMove={onMove} onUp={() => (drag.current = null)} />
            </div>
          </section>
        )}
        <section aria-label="Programme" className="flex min-w-0 flex-1 flex-col items-center">
          <p className="mb-2 flex w-full items-center gap-2 font-mono text-xs uppercase tracking-[0.14em] text-muted" style={{ maxWidth: FIT }}>
            <span className="live-dot" aria-hidden="true" /> Programme : {e.scene(e.project.program)?.name}
            {e.recording && <span className="ml-auto text-live">REC {clock}</span>}
          </p>
          <div className="relative aspect-video w-full overflow-hidden rounded-xl border border-line bg-black" style={{ maxWidth: FIT }}>
            <canvas ref={programRef} width={W} height={H} className="h-full w-full" />
            {!studio && <EditLayer ref={editRef} item={selItem} boxStyle={boxStyle} onDown={onDown} onMove={onMove} onUp={() => (drag.current = null)} />}
          </div>
        </section>
      </div>

      {/* Docks */}
      <div className="grid shrink-0 gap-3 border-t border-line p-3 md:grid-cols-2 xl:grid-cols-4 lg:h-[300px]">
        <section className={panel} aria-label="Scènes">
          <h2 className={title}>
            Scènes
            <button type="button" onClick={addScene} className={iconBtn} aria-label="Ajouter une scène">
              <Plus size={16} />
            </button>
          </h2>
          <ul className="space-y-1">
            {e.project.scenes.map((s) => {
              const isProg = s.id === e.project.program;
              const isPrev = studio && s.id === e.project.preview;
              return (
                <li key={s.id} className="group flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => pickScene(s.id)}
                    onDoubleClick={() => {
                      const n = window.prompt("Nom de la scène", s.name);
                      if (n) renameScene(s.id, n);
                    }}
                    className={`flex-1 truncate rounded-lg border px-3 py-2 text-left text-sm transition-colors ${isProg ? "border-live/50 text-foreground" : isPrev ? "border-line-strong bg-accent/10 text-foreground" : "border-transparent text-muted hover:bg-accent/[0.06] hover:text-foreground"}`}
                  >
                    {s.name}
                  </button>
                  <button type="button" onClick={() => deleteScene(s.id)} disabled={e.project.scenes.length < 2} className={`${iconBtn} opacity-0 group-hover:opacity-100 focus-visible:opacity-100`} aria-label={`Supprimer ${s.name}`}>
                    <Trash size={14} />
                  </button>
                </li>
              );
            })}
          </ul>
          <p className="mt-2 text-xs text-muted">Double-clic : renommer. Bordure rouge : programme.</p>
        </section>

        <section className={panel} aria-label="Sources">
          <h2 className={title}>
            Sources
            <span className="relative">
              <button type="button" onClick={() => setMenu((v) => !v)} className={iconBtn} aria-label="Ajouter une source" aria-expanded={menu}>
                <Plus size={16} />
              </button>
              {menu && (
                <div className="absolute right-0 z-20 mt-1 w-56 rounded-xl border border-line-strong bg-background p-1 text-sm normal-case tracking-normal shadow-[0_16px_40px_-12px_var(--shadow-pop)]">
                  {relays.map((r) => (
                    <button key={r.id} type="button" className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-foreground hover:bg-accent/10" onClick={() => addSource({ kind: "relay", name: r.name, relayId: r.id })}>
                      <span className="truncate">{r.name}</span>
                      <span className="font-mono text-[10px] text-muted">{KIND_LABEL.relay}</span>
                    </button>
                  ))}
                  {(["webcam", "mic", "screen"] as SourceKind[]).map((k) => (
                    <button key={k} type="button" className="w-full rounded-lg px-3 py-2 text-left text-foreground hover:bg-accent/10" onClick={() => addSource({ kind: k, name: KIND_LABEL[k] })}>
                      {KIND_LABEL[k]}
                    </button>
                  ))}
                  <button type="button" className="w-full rounded-lg px-3 py-2 text-left text-foreground hover:bg-accent/10" onClick={() => fileRef.current?.click()}>
                    Image…
                  </button>
                  <button type="button" className="w-full rounded-lg px-3 py-2 text-left text-foreground hover:bg-accent/10" onClick={() => addSource({ kind: "text", name: "Texte", text: "Mon texte", fontSize: 64, color: "#ffffff" })}>
                    Texte
                  </button>
                  <button type="button" className="w-full rounded-lg px-3 py-2 text-left text-foreground hover:bg-accent/10" onClick={() => addSource({ kind: "color", name: "Couleur", color: "#1a1a1a" })}>
                    Couleur
                  </button>
                </div>
              )}
            </span>
          </h2>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            hidden
            onChange={(ev) => {
              const f = ev.target.files?.[0];
              ev.target.value = "";
              if (!f) return;
              const r = new FileReader();
              r.onload = () => addSource({ kind: "image", name: f.name.replace(/\.[^.]+$/, ""), src: String(r.result) });
              r.readAsDataURL(f);
            }}
          />
          {editScene && editScene.items.length === 0 ? (
            <p className="text-sm text-muted">Scène vide. Ajoute une source avec +.</p>
          ) : (
            <ul className="space-y-1">
              {[...(editScene?.items ?? [])].reverse().map((it) => {
                const s = e.source(it.sourceId);
                return (
                  <li key={it.id}>
                    <div className={`flex items-center gap-1 rounded-lg border px-2 py-1.5 text-sm ${selected === it.id ? "border-line-strong bg-accent/10" : "border-transparent"}`}>
                      <button type="button" onClick={() => setSelected(it.id)} className="flex-1 truncate text-left">
                        {s?.name}
                        <span className="ml-2 font-mono text-[10px] text-muted">{s && KIND_LABEL[s.kind]}</span>
                      </button>
                      <button type="button" className={iconBtn} onClick={() => patchItem(it.id, { visible: !it.visible })} aria-label={it.visible ? "Masquer" : "Afficher"}>
                        {it.visible ? <Eye size={16} /> : <EyeSlash size={16} />}
                      </button>
                      <button type="button" className={iconBtn} onClick={() => moveItem(it.id, 1)} aria-label="Monter">
                        <ArrowUp size={14} />
                      </button>
                      <button type="button" className={iconBtn} onClick={() => moveItem(it.id, -1)} aria-label="Descendre">
                        <ArrowDown size={14} />
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}

          {selItem && selSource && (
            <div className="mt-3 space-y-2 border-t border-line pt-3 text-xs">
              <div className="grid grid-cols-4 gap-2">
                {(["x", "y", "w", "h"] as const).map((k) => (
                  <label key={k} className="block font-mono uppercase text-muted">
                    {k}
                    <input type="number" value={Math.round(selItem[k])} onChange={(ev) => patchItem(selItem.id, { [k]: Number(ev.target.value) })} className="mt-1 h-8 w-full rounded-md border border-line bg-background px-2 text-foreground" />
                  </label>
                ))}
              </div>
              {selSource.kind === "text" && (
                <>
                  <input value={selSource.text ?? ""} onChange={(ev) => patchSource(selSource.id, { text: ev.target.value })} aria-label="Texte" className="h-8 w-full rounded-md border border-line bg-background px-2 text-sm" />
                  <label className="flex items-center gap-2 text-muted">
                    Taille
                    <input type="number" value={selSource.fontSize ?? 64} onChange={(ev) => patchSource(selSource.id, { fontSize: Number(ev.target.value) })} className="h-8 w-20 rounded-md border border-line bg-background px-2 text-foreground" />
                  </label>
                </>
              )}
              {(selSource.kind === "text" || selSource.kind === "color") && (
                <label className="flex items-center gap-2 text-muted">
                  Couleur
                  <input type="color" value={selSource.color ?? "#ffffff"} onChange={(ev) => patchSource(selSource.id, { color: ev.target.value })} className="h-8 w-12 rounded-md border border-line bg-background" />
                </label>
              )}
              <button type="button" onClick={() => removeItem(selItem)} className="inline-flex items-center gap-1.5 text-live hover:underline">
                <Trash size={14} /> Retirer de la scène
              </button>
            </div>
          )}
        </section>

        <section className={panel} aria-label="Mixeur audio">
          <h2 className={title}>Mixeur audio</h2>
          {audioSources.length === 0 ? (
            <p className="text-sm text-muted">Ajoute un flux, une webcam ou un micro pour le voir ici.</p>
          ) : (
            <ul className="space-y-4">
              {audioSources.map((s) => {
                const m = e.mixer(s.id);
                return (
                  <li key={s.id}>
                    <div className="flex items-center justify-between gap-2 text-sm">
                      <span className="truncate">{s.name}</span>
                      <span className="font-mono text-xs tabular-nums text-muted">{m.error ?? (m.ready ? `${toDb(m.vol).toFixed(0)} dB` : "inactif")}</span>
                    </div>
                    <div className="mt-2">
                      <Meter db={m.muted || !e.isActive(s.id) && s.kind !== "mic" ? -100 : (levels[s.id] ?? -100)} />
                    </div>
                    <div className="mt-2 flex items-center gap-3">
                      <button type="button" className={`${iconBtn} ${m.muted ? "text-live" : ""}`} onClick={() => e.setMuted(s.id, !m.muted)} aria-pressed={m.muted} aria-label={m.muted ? `Réactiver ${s.name}` : `Couper ${s.name}`}>
                        {m.muted ? <SpeakerSlash size={18} /> : <SpeakerHigh size={18} />}
                      </button>
                      <input type="range" min={0} max={1} step={0.01} value={m.vol} onChange={(ev) => e.setVolume(s.id, Number(ev.target.value))} aria-label={`Volume de ${s.name}`} className="w-full accent-accent" />
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
          <label className="mt-4 flex items-center gap-2 text-xs text-muted">
            <input
              type="checkbox"
              checked={listen}
              onChange={(ev) => {
                setListen(ev.target.checked);
                e.setMonitor(ev.target.checked);
              }}
              className="accent-accent"
            />
            Écouter la sortie (casque conseillé)
          </label>
        </section>

        <section className={panel} aria-label="Contrôles">
          <h2 className={title}>Contrôles</h2>
          <div className="space-y-2">
            <label className="flex items-center justify-between gap-3 text-sm">
              Mode studio
              <input type="checkbox" checked={studio} onChange={(ev) => e.setStudioMode(ev.target.checked)} className="accent-accent" />
            </label>
            <label className="flex items-center justify-between gap-3 text-sm">
              Transition
              <select value={fadeMode ? "fade" : "cut"} onChange={(ev) => setFadeMode(ev.target.value === "fade")} className="h-8 rounded-md border border-line bg-background px-2 text-sm">
                <option value="fade">Fondu</option>
                <option value="cut">Coupure</option>
              </select>
            </label>
            {studio && (
              <button type="button" onClick={() => e.swap(fadeMode ? "fade" : "cut")} className={`${btn} btn-primary w-full`}>
                Transition
              </button>
            )}
            <button type="button" onClick={() => (e.recording ? e.stopRecording() : e.startRecording())} className={`${btn} w-full ${e.recording ? "bg-live text-white" : "btn-secondary"}`}>
              {e.recording ? <Stop size={16} weight="fill" /> : <RecordIcon size={16} weight="fill" />}
              {e.recording ? `Arrêter (${clock})` : "Enregistrer"}
            </button>
            <button type="button" onClick={() => setGolive(true)} className={`${btn} btn-secondary w-full`}>
              Diffuser vers Twitch, Kick…
            </button>
            <p className="text-xs leading-relaxed text-muted">L&apos;enregistrement est un fichier .webm téléchargé à l&apos;arrêt. Garde cet onglet ouvert pendant que le studio tourne.</p>
          </div>
        </section>
      </div>
        </>
      )}
      {auto && <AutoPanel e={e} levels={levels} onClose={() => setAuto(false)} />}
      {golive && <GoLive e={e} coreUrl={coreUrl} onClose={() => setGolive(false)} />}
    </div>
  );
}

/** Calque de sélection : clic = sélectionner, glisser = déplacer, poignées = redimensionner. */
const EditLayer = forwardRef<
  HTMLDivElement,
  { item: Item | null; boxStyle: (i: Item) => React.CSSProperties; onDown: (ev: React.PointerEvent, h?: Handle) => void; onMove: (ev: React.PointerEvent) => void; onUp: () => void }
>(function EditLayer({ item, boxStyle, onDown, onMove, onUp }, ref) {
  const corner = (h: Handle, pos: string, cursor: string) => (
    <span key={h} onPointerDown={(ev) => onDown(ev, h)} className={`absolute h-3 w-3 rounded-sm border border-background bg-foreground ${pos}`} style={{ cursor }} />
  );
  return (
    <div ref={ref} className="absolute inset-0 touch-none" onPointerDown={(ev) => onDown(ev)} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp}>
      {item && (
        <div className="pointer-events-none absolute border border-foreground" style={boxStyle(item)}>
          <div className="pointer-events-auto">
            {corner("nw", "-left-1.5 -top-1.5", "nwse-resize")}
            {corner("ne", "-right-1.5 -top-1.5", "nesw-resize")}
            {corner("sw", "-bottom-1.5 -left-1.5", "nesw-resize")}
            {corner("se", "-bottom-1.5 -right-1.5", "nwse-resize")}
          </div>
        </div>
      )}
    </div>
  );
});
