"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { btnFlat as flat, btnPrimary, field, Switch } from "./ui";

// Paramètres d'OBS à distance, comme la fenêtre Paramètres d'OBS : catégories à gauche, réglages à droite, Appliquer.
// Le plugin n'expose qu'une liste blanche (aucune clé de stream, aucun chemin) et refuse tout ce qui sort des bornes.

type Value = string | number | boolean | null;
type Def = {
  id: string;
  group: "output" | "video" | "audio" | "network";
  label: string;
  kind: "bool" | "int" | "enum" | "ro";
  value: Value;
  applies: "now" | "next_stream" | "restart";
  lockLive: boolean;
  min?: number;
  max?: number;
  options?: string[];
};
import type { Call } from "./useRemote";
type Category = Def["group"] | "stream";

const CATEGORIES: { id: Category; label: string }[] = [
  { id: "output", label: "Sortie" },
  { id: "video", label: "Vidéo" },
  { id: "audio", label: "Audio" },
  { id: "network", label: "Avancé" },
  { id: "stream", label: "Stream (flux)" },
];


/** Texte lisible d'une option (le plugin envoie les valeurs brutes d'OBS). */
function optionLabel(id: string, v: string) {
  if (id === "audio_bitrate") return `${v} kbit/s`;
  if (id === "sample_rate") return `${v} Hz`;
  if (id === "fps") return `${v} images/s`;
  if (id === "channels") return v === "Stereo" ? "Stéréo" : v;
  return v;
}

const NOTE: Record<Def["applies"], string> = { now: "", next_stream: "Pris en compte au prochain direct.", restart: "Pris en compte au redémarrage d'OBS." };

export default function SettingsPanel({ call, streaming, canRestart, onRestart, onClose }: { call: Call; streaming: boolean; canRestart: boolean; onRestart: () => void; onClose?: () => void }) {
  const [defs, setDefs] = useState<Def[] | null>(null);
  const [draft, setDraft] = useState<Record<string, Value>>({});
  const [cat, setCat] = useState<Category>("output");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [needsRestart, setNeedsRestart] = useState(false);

  useEffect(() => {
    let live = true;
    call<{ settings: Def[] }>("link.settingsGet").then(
      (r) => live && setDefs(r.settings),
      (e: Error) => live && setMsg({ ok: false, text: e.message }),
    );
    return () => {
      live = false;
    };
  }, [call]);

  const changed = useMemo(() => (defs ?? []).filter((d) => d.id in draft && draft[d.id] !== d.value), [defs, draft]);
  const shown = (defs ?? []).filter((d) => d.group === cat);
  const val = (d: Def): Value => (d.id in draft ? draft[d.id] : d.value);
  const set = (d: Def, v: Value) => {
    setMsg(null);
    setDraft((x) => ({ ...x, [d.id]: v }));
  };

  async function apply() {
    if (changed.length === 0) return;
    setBusy(true);
    setMsg(null);
    try {
      const r = await call<{ settings: Def[] }>("link.settingsSet", { changes: Object.fromEntries(changed.map((d) => [d.id, draft[d.id]])) });
      setNeedsRestart((n) => n || changed.some((d) => d.applies === "restart"));
      setDefs(r.settings);
      setDraft({});
      setMsg({ ok: true, text: "Réglages appliqués." });
    } catch (e) {
      setMsg({ ok: false, text: (e as Error).message });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex h-[min(36rem,68dvh)] min-w-0 flex-col gap-3">
      <div className="grid min-h-0 flex-1 grid-cols-1 gap-2 sm:grid-cols-[11rem_minmax(0,1fr)]">
        <nav aria-label="Catégories de réglages" className="flex gap-1 overflow-x-auto rounded-xl border border-line bg-surface p-1.5 sm:flex-col sm:overflow-visible">
          {CATEGORIES.map((c) => (
            <button key={c.id} type="button" aria-current={cat === c.id} onClick={() => setCat(c.id)} className={`min-h-9 shrink-0 rounded-lg px-3 text-left text-[13px] transition-colors ${cat === c.id ? "bg-foreground/15 font-medium text-foreground" : "text-foreground/80 hover:bg-foreground/[0.07]"}`}>
              {c.label}
            </button>
          ))}
        </nav>

        <section aria-label="Réglages" className="min-h-0 overflow-y-auto overscroll-contain rounded-xl border border-line bg-surface">
          {cat === "stream" ? (
            <div className="p-4 text-[13px] leading-relaxed text-foreground/80">
              <h2 className="text-[14px] font-semibold text-foreground">Stream (flux)</h2>
              <p className="mt-2">Le service, le serveur et la clé de stream ne se modifient pas à distance : ils restent sur l&apos;ordinateur, dans OBS (Paramètres, Stream).</p>
              <p className="mt-2 text-muted">C&apos;est voulu : une clé de stream ne doit jamais transiter par le site. Les sorties multistream se gèrent dans l&apos;onglet Multi.</p>
            </div>
          ) : defs === null ? (
            <p className="p-4 text-[13px] text-muted">{msg ? msg.text : "Lecture des réglages d'OBS…"}</p>
          ) : (
            <div className="divide-y divide-line">
              <h2 className="px-4 py-3 text-[14px] font-semibold">{CATEGORIES.find((c) => c.id === cat)?.label}</h2>
              {shown.map((d) => {
                const locked = streaming && d.lockLive;
                return (
                  <label key={d.id} className="grid min-h-12 grid-cols-1 items-center gap-1.5 px-4 py-2.5 sm:grid-cols-[minmax(0,1fr)_minmax(10rem,14rem)] sm:gap-4">
                    <span className="min-w-0 text-[13px] text-foreground/80">
                      {d.label}
                      {(locked || NOTE[d.applies]) && d.kind !== "ro" && <span className="block text-[11px] text-muted">{locked ? "Impossible pendant le direct." : NOTE[d.applies]}</span>}
                    </span>
                    <Control d={d} value={val(d)} disabled={locked || busy} onChange={(v) => set(d, v)} />
                  </label>
                );
              })}
              {cat === "output" && <p className="px-4 py-3 text-[12px] text-muted">Pendant le direct, le débit se change à chaud avec le curseur de l&apos;onglet Direct.</p>}
            </div>
          )}
        </section>
      </div>

      {(msg || needsRestart) && (
        <div role={msg && !msg.ok ? "alert" : "status"} className={`flex shrink-0 flex-wrap items-center gap-2 rounded-md border px-3 py-1.5 text-[13px] ${msg && !msg.ok ? "border-warn/50 bg-warn/10 text-warn" : "border-line bg-surface text-foreground/80"}`}>
          <span className="min-w-0 flex-1">{msg ? msg.text : "Des réglages attendent le redémarrage d'OBS."}</span>
          {needsRestart && canRestart && (
            <button type="button" disabled={streaming} onClick={onRestart} className={`${flat} h-7 px-3.5`} title={streaming ? "Pas pendant le direct" : undefined}>
              Redémarrer OBS
            </button>
          )}
        </div>
      )}

      <div className="flex shrink-0 items-center justify-end gap-2">
        <button type="button" disabled={busy || changed.length === 0} onClick={() => (setDraft({}), setMsg(null))} className={`${flat} h-9 px-4`}>
          Annuler
        </button>
        <button type="button" disabled={busy || changed.length === 0} onClick={() => void apply()} className={btnPrimary()}>
          {busy ? "Application…" : changed.length > 0 ? `Appliquer (${changed.length})` : "Appliquer"}
        </button>
        {onClose && (
          <button type="button" onClick={onClose} className={`${flat} h-9 px-5`}>
            Fermer
          </button>
        )}
      </div>
    </div>
  );
}

function Control({ d, value, disabled, onChange }: { d: Def; value: Value; disabled: boolean; onChange: (v: Value) => void }): ReactNode {
  if (d.kind === "ro") return <span className="text-[13px] text-muted">{String(value ?? "—")}</span>;
  if (d.kind === "bool")
    return (
      <span className="justify-self-start sm:justify-self-end"><Switch label={d.label} on={value === true} disabled={disabled} onClick={() => onChange(value !== true)} /></span>
    );
  if (d.kind === "int")
    return (
      <input type="number" inputMode="numeric" min={d.min} max={d.max} step={1} disabled={disabled} value={typeof value === "number" ? value : ""} onChange={(e) => onChange(e.target.value === "" ? null : Number(e.target.value))} aria-label={d.label} className={`${field} w-full`} />
    );
  return (
    <select disabled={disabled} value={String(value ?? "")} onChange={(e) => onChange(e.target.value)} aria-label={d.label} className={`${field} w-full`}>
      {(d.options ?? []).map((o) => (
        <option key={o} value={o}>
          {optionLabel(d.id, o)}
        </option>
      ))}
    </select>
  );
}
