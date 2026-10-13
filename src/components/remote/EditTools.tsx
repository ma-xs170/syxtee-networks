"use client";

import { useCallback, useEffect, useRef, useState } from "react";

// Édition à distance : tout passe par des demandes étroites du plugin (texte, lien, filtres, position, médias, replay, débit).
// Rien ici ne crée ni ne supprime : les bornes sont aussi appliquées côté plugin.

type Call = <T = Record<string, unknown>>(method: string, params?: Record<string, unknown>) => Promise<T>;

const flat = "inline-flex items-center justify-center whitespace-nowrap rounded-full border border-white/[0.14] bg-[#16161a] text-[13px] text-neutral-100 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] transition-colors hover:bg-[#1e1e23] disabled:opacity-40";
const field = "h-8 rounded-lg border border-white/10 bg-white/[0.03] px-2 text-[13px] text-neutral-100 disabled:opacity-40";
const MEDIA = new Set(["ffmpeg_source", "vlc_source", "slideshow", "slideshow_v2"]);

/** Un ordre au plus toutes les 150 ms pendant un glissement, le dernier toujours envoyé (le Core limite les ordres par seconde). */
function useThrottle(ms = 150) {
  const last = useRef(0);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);
  return useCallback(
    (fire: () => void) => {
      clearTimeout(timer.current);
      const wait = ms - (Date.now() - last.current);
      const go = () => {
        last.current = Date.now();
        fire();
      };
      if (wait <= 0) go();
      else timer.current = setTimeout(go, wait);
    },
    [ms],
  );
}

type Filter = { filterName: string; filterEnabled: boolean };
type Tf = { positionX: number; positionY: number; scaleX: number; scaleY: number; rotation: number };
type Editable = { inputName: string; field: "text" | "url"; value: string };

/** Panneau d'une source sélectionnée : texte ou lien, filtres, position, taille, rotation, médias. */
export function SourceEditor({ call, sceneName, itemId, name, kind, canEdit, only }: { call: Call; sceneName: string; itemId: number; name: string; kind: string; canEdit: boolean; /** Une seule section : « props » (texte, position, médias) ou « filters ». Sans valeur : tout. */ only?: "props" | "filters" }) {
  const [filters, setFilters] = useState<Filter[]>([]);
  const [tf, setTf] = useState<Tf | null>(null);
  const [editable, setEditable] = useState<Editable | null>(null);
  const [draft, setDraft] = useState("");
  const [msg, setMsg] = useState("");
  const throttle = useThrottle();

  useEffect(() => {
    let live = true;
    void call<{ filters: Filter[] }>("GetSourceFilterList", { sourceName: name }).then((r) => live && setFilters(r.filters ?? []), () => {});
    void call<{ sceneItemTransform: Tf }>("GetSceneItemTransform", { sceneName, sceneItemId: itemId }).then((r) => live && setTf(r.sceneItemTransform), () => {});
    void call<{ inputs: Editable[] }>("link.listEditable").then(
      (r) => {
        const e = (r.inputs ?? []).find((i) => i.inputName === name) ?? null;
        if (live) {
          setEditable(e);
          setDraft(e?.value ?? "");
        }
      },
      () => {},
    );
    return () => {
      live = false;
    };
  }, [call, name, sceneName, itemId]);

  const fail = (e: unknown) => setMsg((e as Error).message);
  const sendTf = (patch: Partial<Tf>) => {
    setTf((t) => (t ? { ...t, ...patch } : t));
    throttle(() => void call("SetSceneItemTransform", { sceneName, sceneItemId: itemId, sceneItemTransform: patch }).catch(fail));
  };
  const nudge = (dx: number, dy: number) => tf && sendTf({ positionX: tf.positionX + dx, positionY: tf.positionY + dy });
  const media = (a: string) => void call("TriggerMediaInputAction", { inputName: name, mediaAction: a }).catch(fail);

  async function applyText() {
    if (!editable) return;
    setMsg("");
    try {
      await call(editable.field === "text" ? "link.setText" : "link.setUrl", editable.field === "text" ? { inputName: name, text: draft } : { inputName: name, url: draft });
      setEditable({ ...editable, value: draft });
      setMsg("Appliqué.");
    } catch (e) {
      fail(e);
    }
  }

  const arrow = "grid size-8 place-items-center rounded-lg border border-white/10 bg-white/[0.03] text-neutral-200 hover:bg-white/[0.08] disabled:opacity-40";
  return (
    <div className="mx-1 mb-1.5 space-y-3 rounded-lg border border-white/[0.08] bg-[#0f0f12] p-3 text-[13px]">
      {only !== "filters" && editable && (
        <div>
          <label className="text-[12px] text-neutral-400" htmlFor={`ed-${itemId}`}>
            {editable.field === "text" ? "Texte" : "Adresse de la page (https://…)"}
          </label>
          <div className="mt-1 flex gap-2">
            {editable.field === "text" ? (
              <textarea id={`ed-${itemId}`} rows={2} maxLength={2000} disabled={!canEdit} value={draft} onChange={(e) => setDraft(e.target.value)} className={`${field} h-auto min-h-16 flex-1 py-1.5`} />
            ) : (
              <input id={`ed-${itemId}`} type="url" inputMode="url" maxLength={2000} disabled={!canEdit} value={draft} onChange={(e) => setDraft(e.target.value)} className={`${field} min-w-0 flex-1`} />
            )}
            <button type="button" disabled={!canEdit || draft === editable.value} onClick={() => void applyText()} className={`${flat} h-8 self-start px-3.5`}>
              Appliquer
            </button>
          </div>
        </div>
      )}

      {only !== "filters" && tf && (
        <div>
          <p className="text-[12px] text-neutral-400">Position et taille</p>
          <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-2">
            <div className="grid grid-cols-3 gap-1" role="group" aria-label="Déplacer la source">
              <span />
              <button type="button" className={arrow} disabled={!canEdit} aria-label="Monter" onClick={() => nudge(0, -20)}>↑</button>
              <span />
              <button type="button" className={arrow} disabled={!canEdit} aria-label="Gauche" onClick={() => nudge(-20, 0)}>←</button>
              <button type="button" className={`${arrow} text-[11px]`} disabled={!canEdit} aria-label="Centrer en haut à gauche" onClick={() => sendTf({ positionX: 0, positionY: 0 })}>0</button>
              <button type="button" className={arrow} disabled={!canEdit} aria-label="Droite" onClick={() => nudge(20, 0)}>→</button>
              <span />
              <button type="button" className={arrow} disabled={!canEdit} aria-label="Descendre" onClick={() => nudge(0, 20)}>↓</button>
              <span />
            </div>
            <div className="grid min-w-40 flex-1 gap-2">
              <label className="flex items-center gap-2 text-[12px] text-neutral-400">
                <span className="w-14 shrink-0">Taille</span>
                <input type="range" min={10} max={300} step={1} disabled={!canEdit} value={Math.round(tf.scaleX * 100)} onChange={(e) => sendTf({ scaleX: Number(e.target.value) / 100, scaleY: Number(e.target.value) / 100 })} className="min-w-0 flex-1 accent-white" />
                <span className="w-10 text-right tabular-nums text-neutral-300">{Math.round(tf.scaleX * 100)}%</span>
              </label>
              <label className="flex items-center gap-2 text-[12px] text-neutral-400">
                <span className="w-14 shrink-0">Rotation</span>
                <input type="range" min={-180} max={180} step={1} disabled={!canEdit} value={Math.round(tf.rotation)} onChange={(e) => sendTf({ rotation: Number(e.target.value) })} className="min-w-0 flex-1 accent-white" />
                <span className="w-10 text-right tabular-nums text-neutral-300">{Math.round(tf.rotation)}°</span>
              </label>
            </div>
          </div>
        </div>
      )}

      {only !== "props" && filters.length > 0 && (
        <div>
          <p className="text-[12px] text-neutral-400">Filtres</p>
          <ul className="mt-1 space-y-1">
            {filters.map((f) => (
              <li key={f.filterName} className="flex items-center justify-between gap-2">
                <span className={`min-w-0 truncate ${f.filterEnabled ? "text-neutral-100" : "text-neutral-500"}`}>{f.filterName}</span>
                <button
                  type="button"
                  role="switch"
                  aria-checked={f.filterEnabled}
                  aria-label={`Filtre ${f.filterName}`}
                  disabled={!canEdit}
                  onClick={() => {
                    setFilters((l) => l.map((x) => (x.filterName === f.filterName ? { ...x, filterEnabled: !x.filterEnabled } : x)));
                    void call("SetSourceFilterEnabled", { sourceName: name, filterName: f.filterName, filterEnabled: !f.filterEnabled }).catch(fail);
                  }}
                  className={`relative h-6 w-11 shrink-0 rounded-full border transition-colors disabled:opacity-40 ${f.filterEnabled ? "border-[#3157d6] bg-[#2548b8]" : "border-white/15 bg-white/[0.06]"}`}
                >
                  <span aria-hidden="true" className={`absolute top-0.5 size-4.5 rounded-full bg-white transition-[left] ${f.filterEnabled ? "left-[1.4rem]" : "left-0.5"}`} />
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {only !== "filters" && MEDIA.has(kind) && (
        <div>
          <p className="text-[12px] text-neutral-400">Média</p>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {(
              [
                ["PREVIOUS", "Précédent"],
                ["PLAY", "Lecture"],
                ["PAUSE", "Pause"],
                ["STOP", "Arrêt"],
                ["RESTART", "Relancer"],
                ["NEXT", "Suivant"],
              ] as const
            ).map(([a, t]) => (
              <button key={a} type="button" disabled={!canEdit} onClick={() => media(a)} className={`${flat} h-8 px-3`}>
                {t}
              </button>
            ))}
          </div>
        </div>
      )}

      {(only === "filters" ? filters.length === 0 : only === "props" ? !editable && !tf && !MEDIA.has(kind) : !editable && !tf && filters.length === 0 && !MEDIA.has(kind)) && <p className="text-neutral-500">{only === "filters" ? "Aucun filtre sur cette source." : "Rien à modifier sur cette source."}</p>}
      {msg && (
        <p role="status" className="text-[12px] text-amber-200">
          {msg}
        </p>
      )}
    </div>
  );
}

/** Direct : débit à chaud et tampon de relecture (replay). */
export function LiveExtras({ call, streaming, canEdit }: { call: Call; streaming: boolean; canEdit: boolean }) {
  const [kbps, setKbps] = useState<number | null>(null);
  const [replay, setReplay] = useState<boolean | null>(null);
  const [msg, setMsg] = useState("");
  const throttle = useThrottle(300);

  useEffect(() => {
    let live = true;
    void call<{ outputActive: boolean }>("GetReplayBufferStatus").then((r) => live && setReplay(r.outputActive), () => live && setReplay(null));
    if (streaming) void call<{ bitrate?: number }>("link.getBitrate").then((r) => live && setKbps(r.bitrate ?? null), () => live && setKbps(null));
    return () => {
      live = false;
    };
  }, [call, streaming]);

  const fail = (e: unknown) => setMsg((e as Error).message);
  async function replayAct(m: "StartReplayBuffer" | "StopReplayBuffer" | "SaveReplayBuffer") {
    setMsg("");
    try {
      await call(m);
      if (m === "SaveReplayBuffer") setMsg("Replay enregistré.");
      else setReplay(m === "StartReplayBuffer");
    } catch (e) {
      fail(e);
    }
  }

  if (replay === null && !streaming) return null;
  return (
    <section aria-label="Débit et replay" className="flex shrink-0 flex-col gap-2.5 rounded-xl border border-white/[0.08] bg-[#0b0b0d] p-3 text-[13px]">
      {streaming && kbps !== null && (
        <label className="grid gap-1 text-neutral-300">
          <span className="flex items-baseline justify-between">
            <span>Débit vidéo du direct</span>
            <span className="tabular-nums text-neutral-100">{kbps} kbit/s</span>
          </span>
          <input
            type="range"
            min={500}
            max={20000}
            step={100}
            disabled={!canEdit}
            value={kbps}
            onChange={(e) => {
              const v = Number(e.target.value);
              setKbps(v);
              throttle(() => void call("link.setBitrate", { kbps: v }).catch(fail));
            }}
            className="accent-white"
          />
          <span className="text-[11px] text-neutral-500">Appliqué tout de suite, jusqu&apos;à la fin du direct. Le réglage permanent est dans Paramètres.</span>
        </label>
      )}
      {replay !== null && (
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="mr-auto text-neutral-300">Replay {replay ? "actif" : "arrêté"}</span>
          <button type="button" disabled={!canEdit} onClick={() => void replayAct(replay ? "StopReplayBuffer" : "StartReplayBuffer")} className={`${flat} h-8 px-3.5`}>
            {replay ? "Arrêter" : "Démarrer"}
          </button>
          <button type="button" disabled={!canEdit || !replay} onClick={() => void replayAct("SaveReplayBuffer")} className={`${flat} h-8 px-3.5`}>
            Enregistrer le replay
          </button>
        </div>
      )}
      {msg && (
        <p role="status" className="text-[12px] text-amber-200">
          {msg}
        </p>
      )}
    </section>
  );
}
