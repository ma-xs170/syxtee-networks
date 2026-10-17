"use client";

import { useCallback, useEffect, useId, useRef, useState, type ReactNode } from "react";

// Briques communes du Contrôle à distance. Tout passe par les jetons du site (--background, --surface, --line, --foreground,
// --accent, --live, --ok, --warn, --bad) : l'interface suit donc les trois modes (Auto, Sombre, Clair), sans noir ni blanc écrits en dur.

export const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(" ");

// ── Styles ───────────────────────────────────────────────────────────────────────────────────────────────────────────

export const panel = "flex min-h-0 min-w-0 flex-col rounded-xl border border-line bg-surface";
export const panelHead = "flex shrink-0 items-center gap-2 border-b border-line px-3.5 py-2.5 text-sm font-semibold tracking-tight";
const btnBase =
  "inline-flex shrink-0 select-none items-center justify-center gap-2 whitespace-nowrap rounded-full text-sm font-medium transition-[background-color,border-color,transform,color] duration-150 active:scale-[0.97] disabled:pointer-events-none disabled:opacity-40 motion-reduce:transition-none motion-reduce:active:scale-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground";
/** Bouton neutre sans taille imposée (les écrans compacts fixent leur hauteur). */
export const btnFlat = cx(btnBase, "btn-tonal max-lg:min-h-11");
/** Bouton neutre (fond tonal, fine bordure). `size` : sm 32 px, md 40 px (44 px au doigt), lg 48 px. */
export const btn = (size: "sm" | "md" | "lg" = "md") => cx(btnBase, "btn-tonal", size === "sm" ? "h-8 px-3.5 max-lg:h-11" : size === "md" ? "h-10 px-4 max-lg:h-12" : "h-12 px-5");
/** Action principale : le rouge-accent du site. */
export const btnPrimary = (size: "sm" | "md" | "lg" = "md") =>
  cx(btnBase, "border border-transparent bg-accent text-on-accent hover:bg-accent-hover", size === "sm" ? "h-8 px-3.5 max-lg:h-11" : size === "md" ? "h-10 px-4 max-lg:h-12" : "h-12 px-5");
/** Arrêter / supprimer : couleur « en direct » du site, jamais un aplat qui crie. */
export const btnLive = (size: "sm" | "md" | "lg" = "md") =>
  cx(btnBase, "border border-live bg-live/10 text-live hover:bg-live/20", size === "sm" ? "h-8 px-3.5 max-lg:h-11" : size === "md" ? "h-10 px-4 max-lg:h-12" : "h-12 px-5");
export const field =
  "h-10 w-full min-w-0 rounded-lg border border-line bg-input px-3 text-base text-foreground placeholder:text-faint focus-visible:border-foreground/50 focus-visible:outline-none disabled:opacity-40 sm:h-9 sm:text-sm max-lg:h-12 max-lg:text-base";
export const mono = "font-mono tabular-nums";

// ── Mise en forme ────────────────────────────────────────────────────────────────────────────────────────────────────

export const clock = (ms: number) => {
  const s = Math.max(0, Math.floor(ms / 1000));
  return `${String(Math.floor(s / 3600)).padStart(2, "0")}:${String(Math.floor((s / 60) % 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
};
export const dbToPct = (db: number) => Math.max(0, Math.min(100, ((db + 60) * 100) / 60));

const KINDS: Record<string, string> = {
  ffmpeg_source: "Média",
  vlc_source: "Média VLC",
  browser_source: "Navigateur",
  image_source: "Image",
  slideshow: "Diaporama",
  text_ft2_source: "Texte",
  text_gdiplus: "Texte",
  av_capture_input: "Caméra",
  av_capture_input_v2: "Caméra",
  dshow_input: "Caméra",
  v4l2_input: "Caméra",
  display_capture: "Capture d'écran",
  screen_capture: "Capture d'écran",
  window_capture: "Capture de fenêtre",
  monitor_capture: "Capture d'écran",
  coreaudio_input_capture: "Entrée audio",
  coreaudio_output_capture: "Sortie audio",
  wasapi_input_capture: "Entrée audio",
  wasapi_output_capture: "Sortie audio",
  pulse_input_capture: "Entrée audio",
  color_source_v3: "Couleur",
  color_source: "Couleur",
  scene: "Scène",
  group: "Groupe",
  syxtee_flux: "Flux SYXTEE",
};
export const kindLabel = (k: string) => KINDS[k] ?? (k ? k.replace(/_/g, " ") : "Source");

/** Petit retour tactile (Android) sur les actions du direct. Silencieux ailleurs. */
export const buzz = (ms = 12) => {
  try {
    navigator.vibrate?.(ms);
  } catch {
    // non pris en charge
  }
};

// ── Icônes (filaires, à la couleur du texte) ─────────────────────────────────────────────────────────────────────────

const ico = { viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.7, strokeLinecap: "round", strokeLinejoin: "round", "aria-hidden": true, focusable: false } as const;

export function Svg({ children, className = "size-[18px]" }: { children: ReactNode; className?: string }) {
  return (
    <svg {...ico} className={cx("shrink-0", className)}>
      {children}
    </svg>
  );
}

export type IconName = "scenes" | "sources" | "mixer" | "live" | "multi" | "chat" | "settings" | "auto" | "eye" | "eye-off" | "mic" | "mic-off" | "headphones" | "headphones-off" | "speaker" | "speaker-off" | "back" | "close" | "chevron" | "plus" | "pause" | "play" | "gear" | "image" | "text" | "globe" | "audio" | "layers" | "camera" | "record" | "refresh" | "check" | "alert";

export function Icon({ name, className }: { name: IconName; className?: string }) {
  return <Svg className={className}>{PATHS[name]}</Svg>;
}

const PATHS: Record<IconName, ReactNode> = {
  scenes: (
    <>
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="M3 10h18M8 5l-2 5M14 5l-2 5M20 5l-2 5" />
    </>
  ),
  sources: (
    <>
      <path d="M12 3l9 5-9 5-9-5 9-5Z" />
      <path d="M3 13l9 5 9-5" />
    </>
  ),
  mixer: (
    <>
      <path d="M6 4v16M12 4v16M18 4v16" />
      <circle cx="6" cy="9" r="2" fill="currentColor" />
      <circle cx="12" cy="15" r="2" fill="currentColor" />
      <circle cx="18" cy="8" r="2" fill="currentColor" />
    </>
  ),
  live: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M10 8.5v7l6-3.5-6-3.5Z" />
    </>
  ),
  multi: (
    <>
      <circle cx="12" cy="12" r="2" fill="currentColor" />
      <path d="M8.5 8.5a5 5 0 0 0 0 7M15.5 8.5a5 5 0 0 1 0 7M5.5 5.5a9 9 0 0 0 0 13M18.5 5.5a9 9 0 0 1 0 13" />
    </>
  ),
  chat: <path d="M4 5h16v11H9l-5 4V5Z" />,
  settings: (
    <>
      <circle cx="12" cy="12" r="3" />
      <path d="M12 3v2.5M12 18.5V21M3 12h2.5M18.5 12H21M5.6 5.6l1.8 1.8M16.6 16.6l1.8 1.8M5.6 18.4l1.8-1.8M16.6 7.4l1.8-1.8" />
    </>
  ),
  auto: (
    <>
      <path d="M13 3 5 13h6l-1 8 8-10h-6l1-8Z" />
    </>
  ),
  eye: (
    <>
      <path d="M2 12s3.6-6.5 10-6.5S22 12 22 12s-3.6 6.5-10 6.5S2 12 2 12Z" />
      <circle cx="12" cy="12" r="3" />
    </>
  ),
  "eye-off": (
    <>
      <path d="M2 12s3.6-6.5 10-6.5S22 12 22 12s-3.6 6.5-10 6.5S2 12 2 12Z" opacity=".4" />
      <circle cx="12" cy="12" r="3" opacity=".4" />
      <path d="M4 4l16 16" />
    </>
  ),
  mic: (
    <>
      <rect x="9" y="3" width="6" height="11" rx="3" />
      <path d="M5 11a7 7 0 0 0 14 0M12 18v3" />
    </>
  ),
  "mic-off": (
    <>
      <rect x="9" y="3" width="6" height="11" rx="3" />
      <path d="M5 11a7 7 0 0 0 14 0M12 18v3M4 4l16 16" />
    </>
  ),
  headphones: (
    <>
      <path d="M4 15v-3a8 8 0 0 1 16 0v3" />
      <rect x="3" y="14" width="4" height="6" rx="1.5" />
      <rect x="17" y="14" width="4" height="6" rx="1.5" />
    </>
  ),
  "headphones-off": (
    <>
      <path d="M4 15v-3a8 8 0 0 1 16 0v3" />
      <rect x="3" y="14" width="4" height="6" rx="1.5" />
      <rect x="17" y="14" width="4" height="6" rx="1.5" />
      <path d="M4 4l16 16" />
    </>
  ),
  speaker: (
    <>
      <path d="M4 9v6h4l5 4V5L8 9H4Z" />
      <path d="M16.5 8.5a5 5 0 0 1 0 7" />
    </>
  ),
  "speaker-off": (
    <>
      <path d="M4 9v6h4l5 4V5L8 9H4Z" />
      <path d="M17 9l5 6M22 9l-5 6" />
    </>
  ),
  back: <path d="M15 5l-7 7 7 7" />,
  close: <path d="M6 6l12 12M18 6 6 18" />,
  chevron: <path d="M7 10l5 5 5-5" />,
  plus: <path d="M12 5v14M5 12h14" />,
  pause: <path d="M8 5v14M16 5v14" />,
  play: <path d="M8 5v14l11-7z" />,
  gear: (
    <>
      <circle cx="12" cy="12" r="3" />
      <path d="M19 12a7 7 0 0 0-.1-1.2l2-1.5-2-3.4-2.3.9a7 7 0 0 0-2-1.2L14.2 3h-4l-.4 2.6a7 7 0 0 0-2 1.2l-2.3-.9-2 3.4 2 1.5a7 7 0 0 0 0 2.4l-2 1.5 2 3.4 2.3-.9a7 7 0 0 0 2 1.2l.4 2.6h4l.4-2.6a7 7 0 0 0 2-1.2l2.3.9 2-3.4-2-1.5c.1-.4.1-.8.1-1.2Z" />
    </>
  ),
  image: (
    <>
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <circle cx="9" cy="10" r="1.6" />
      <path d="M21 16l-5-5-8 8" />
    </>
  ),
  text: <path d="M5 6h14M12 6v13" />,
  globe: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h18M12 3c3 3 3 15 0 18M12 3c-3 3-3 15 0 18" />
    </>
  ),
  audio: <path d="M4 10v4h3l5 4V6L7 10H4Z" />,
  layers: (
    <>
      <rect x="3" y="5" width="18" height="14" rx="1.5" />
      <path d="M3 10h18M9 5v14" />
    </>
  ),
  camera: (
    <>
      <path d="M4 8h3l1.5-2h7L17 8h3v11H4V8Z" />
      <circle cx="12" cy="13" r="3.2" />
    </>
  ),
  record: <circle cx="12" cy="12" r="6" />,
  refresh: <path d="M20 12a8 8 0 1 1-2.5-5.8M20 4v5h-5" />,
  check: <path d="M5 12.5l4.5 4.5L19 7.5" />,
  alert: (
    <>
      <path d="M12 4 2.5 20h19L12 4Z" />
      <path d="M12 10v4.5M12 17.5v.01" />
    </>
  ),
};

/** Icône d'une source d'après son type OBS. */
export function KindIcon({ kind }: { kind: string }) {
  const n: IconName = kind === "browser_source" ? "globe" : kind.startsWith("text") ? "text" : kind === "scene" ? "scenes" : kind.includes("audio") ? "audio" : kind === "image_source" || kind === "slideshow" ? "image" : kind.includes("capture") || kind.includes("input") ? "camera" : "layers";
  return <Icon name={n} className="size-4 text-muted" />;
}

// ── Commandes ────────────────────────────────────────────────────────────────────────────────────────────────────────

export function Switch({ label, on, disabled, onClick }: { label: string; on: boolean; disabled?: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-label={label}
      aria-checked={on}
      disabled={disabled}
      onClick={onClick}
      className={cx(
        "relative h-7 w-12 shrink-0 rounded-full border transition-colors duration-150 disabled:pointer-events-none disabled:opacity-40 motion-reduce:transition-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground",
        on ? "border-transparent bg-accent" : "border-line-strong bg-foreground/10",
      )}
    >
      <span aria-hidden="true" className={cx("absolute left-0.5 top-0.5 size-5 rounded-full transition-transform duration-150 motion-reduce:transition-none", on ? "translate-x-5 bg-on-accent" : "bg-foreground/70")} />
    </button>
  );
}

/** Ligne « titre + texte d'aide + commande à droite ». */
export function Row({ title, text, children, tone }: { title: string; text?: ReactNode; children: ReactNode; tone?: "warn" }) {
  return (
    <div className="flex items-center justify-between gap-4 py-2.5">
      <div className="min-w-0">
        <p className="text-sm font-medium">{title}</p>
        {text && <p className={cx("mt-0.5 text-[13px] leading-snug", tone === "warn" ? "text-warn" : "text-muted")}>{text}</p>}
      </div>
      {children}
    </div>
  );
}

export function Select({ label, value, options, onChange, placeholder = "Choisir…", disabled, className }: { label: string; value: string; options: string[]; onChange: (v: string) => void; placeholder?: string | null; disabled?: boolean; className?: string }) {
  // Une valeur absente de la liste (scène renommée) reste visible au lieu d'afficher un choix vide.
  const list = value && !options.includes(value) ? [value, ...options] : options;
  return (
    <label className={cx("grid gap-1 text-[13px] text-muted", className)}>
      {label}
      <select value={value} disabled={disabled} onChange={(e) => onChange(e.target.value)} className={field}>
        {placeholder !== null && <option value="">{placeholder}</option>}
        {list.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
    </label>
  );
}

/** Champ texte modifiable : le brouillon est local, l'enregistrement se fait en quittant le champ, et la valeur revient du serveur si elle change. */
export function Draft({ label, value, onCommit, type = "text", placeholder, maxLength, disabled, multiline, rows = 4, mono: m }: { label: string; value: string; onCommit: (v: string) => void; type?: string; placeholder?: string; maxLength?: number; disabled?: boolean; multiline?: boolean; rows?: number; mono?: boolean }) {
  const [draft, setV] = useState(value);
  const [focus, setFocus] = useState(false);
  // Pendant la saisie on montre le brouillon ; sinon la valeur du serveur (qui peut changer de l'extérieur).
  const v = focus ? draft : value;
  const common = {
    value: v,
    disabled,
    maxLength,
    placeholder,
    onFocus: () => (setV(value), setFocus(true)),
    onChange: (e: { target: { value: string } }) => setV(e.target.value),
    onBlur: () => {
      setFocus(false);
      if (v !== value) onCommit(v);
    },
  };
  return (
    <label className="grid gap-1 text-[13px] text-muted">
      {label}
      {multiline ? <textarea {...common} rows={rows} className={cx(field, "h-auto py-2 leading-relaxed")} /> : <input {...common} type={type} autoComplete="off" autoCapitalize="none" spellCheck={false} className={cx(field, m && "font-mono")} />}
    </label>
  );
}

/** Bloc repliable (réglages de la régie). */
export function Disclosure({ title, summary, status, children, defaultOpen }: { title: string; summary?: ReactNode; status?: ReactNode; children: ReactNode; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(!!defaultOpen);
  const id = useId();
  return (
    <section className="rounded-xl border border-line">
      <button type="button" aria-expanded={open} aria-controls={id} onClick={() => setOpen((o) => !o)} className="flex w-full items-center gap-3 px-4 py-3 text-left max-lg:min-h-14">
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-semibold">{title}</span>
          {summary && <span className="mt-0.5 block text-[13px] text-muted">{summary}</span>}
        </span>
        {status}
        <Icon name="chevron" className={cx("size-5 text-muted transition-transform motion-reduce:transition-none", open && "rotate-180")} />
      </button>
      {open && (
        <div id={id} className="border-t border-line px-4 pb-4 pt-3">
          {children}
        </div>
      )}
    </section>
  );
}

// ── Fenêtres ─────────────────────────────────────────────────────────────────────────────────────────────────────────

/** Fenêtre modale native (`<dialog>`) : focus piégé, Échap, fond inerte. Feuille du bas sur téléphone, fenêtre centrée au-delà. */
export function Sheet({ open, onClose, title, children, footer, size = "md", hideTitle }: { open: boolean; onClose: () => void; title: string; children: ReactNode; footer?: ReactNode; size?: "sm" | "md" | "lg"; hideTitle?: boolean }) {
  const ref = useRef<HTMLDialogElement>(null);
  const id = useId();
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    else if (!open && d.open) d.close();
  }, [open]);
  const w = size === "sm" ? "sm:max-w-md" : size === "lg" ? "sm:max-w-4xl" : "sm:max-w-xl";
  return (
    <dialog
      ref={ref}
      aria-labelledby={id}
      onClose={onClose}
      onClick={(e) => e.target === ref.current && onClose()}
      className={cx(
        "m-0 mt-auto max-h-[92dvh] w-full max-w-none overflow-hidden rounded-t-2xl border border-line bg-background p-0 text-foreground backdrop:bg-background/70 backdrop:backdrop-blur-[2px] sm:m-auto sm:w-[calc(100vw-2rem)] sm:rounded-2xl",
        w,
        "open:flex open:flex-col",
      )}
    >
      {open && (
        <>
          <header className="flex shrink-0 items-center justify-between gap-3 border-b border-line px-4 py-3">
            <h2 id={id} className={cx("min-w-0 truncate text-base font-semibold tracking-tight", hideTitle && "sr-only")}>
              {title}
            </h2>
            <button type="button" onClick={onClose} aria-label="Fermer" className="grid size-11 shrink-0 place-items-center rounded-full text-muted transition-colors hover:bg-foreground/10 hover:text-foreground">
              <Icon name="close" className="size-5" />
            </button>
          </header>
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4">{children}</div>
          {footer && <footer className="flex shrink-0 flex-wrap items-center justify-end gap-2 border-t border-line px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">{footer}</footer>}
        </>
      )}
    </dialog>
  );
}

export type ConfirmAsk = { title: string; text: ReactNode; ok: string; danger?: boolean; run: () => void } | null;

export function Confirm({ ask, onClose }: { ask: ConfirmAsk; onClose: () => void }) {
  // La dernière demande reste affichée pendant la fermeture (sinon le texte disparaît avant la fin).
  const [last, setLast] = useState<ConfirmAsk>(null);
  if (ask && ask !== last) setLast(ask);
  const a = ask ?? last;
  return (
    <Sheet
      open={!!ask}
      onClose={onClose}
      size="sm"
      title={a?.title ?? ""}
      footer={
        <>
          <button type="button" onClick={onClose} className={btn()}>
            Annuler
          </button>
          <button
            type="button"
            autoFocus
            onClick={() => {
              onClose();
              a?.run();
            }}
            className={a?.danger ? btnLive() : btnPrimary()}
          >
            {a?.ok}
          </button>
        </>
      }
    >
      <p className="text-sm leading-relaxed text-muted">{a?.text}</p>
    </Sheet>
  );
}

// ── Messages ─────────────────────────────────────────────────────────────────────────────────────────────────────────

export type Toast = { id: number; text: string; kind: "error" | "info" };

/** Messages courts qui disparaissent seuls (une erreur d'OBS ne reste plus collée en haut de la page). */
export function useToasts() {
  const [list, setList] = useState<Toast[]>([]);
  const seq = useRef(0);
  const timers = useRef(new Set<ReturnType<typeof setTimeout>>());
  useEffect(() => {
    const t = timers.current;
    return () => t.forEach(clearTimeout);
  }, []);
  const push = useCallback((text: string, kind: Toast["kind"] = "error") => {
    const id = ++seq.current;
    setList((l) => [...l.filter((x) => x.text !== text).slice(-2), { id, text, kind }]);
    const t = setTimeout(() => {
      timers.current.delete(t);
      setList((l) => l.filter((x) => x.id !== id));
    }, kind === "error" ? 6000 : 3500);
    timers.current.add(t);
  }, []);
  const dismiss = useCallback((id: number) => setList((l) => l.filter((x) => x.id !== id)), []);
  return { list, push, dismiss };
}

export function Toasts({ list, dismiss }: { list: Toast[]; dismiss: (id: number) => void }) {
  return (
    <div role="status" aria-live="polite" className="pointer-events-none fixed inset-x-3 bottom-[calc(env(safe-area-inset-bottom)+5.5rem)] z-[60] mx-auto flex max-w-md flex-col gap-2 lg:bottom-12">
      {list.map((t) => (
        <div key={t.id} className={cx("pointer-events-auto flex items-start gap-2.5 rounded-xl border bg-background px-3.5 py-2.5 text-sm shadow-[0_12px_32px_-12px_var(--shadow-pop)]", t.kind === "error" ? "border-warn/50" : "border-line-strong")}>
          <Icon name={t.kind === "error" ? "alert" : "check"} className={cx("mt-0.5 size-4", t.kind === "error" ? "text-warn" : "text-ok")} />
          <p className="min-w-0 flex-1 break-words">{t.text}</p>
          <button type="button" onClick={() => dismiss(t.id)} aria-label="Masquer" className="-mr-1 grid size-6 shrink-0 place-items-center rounded-full text-muted hover:text-foreground">
            <Icon name="close" className="size-3.5" />
          </button>
        </div>
      ))}
    </div>
  );
}
