"use client";

import { useEffect, useRef, useState } from "react";
import { siFacebook, siKick, siTiktok, siTwitch, siX, siYoutube } from "simple-icons";

// Multistream : envoyer le même direct vers d'autres plateformes, en un clic par logo (comme Aitum Multistream).
// Les sorties vivent dans le plugin SYXTEE Link, sur le PC d'OBS ; la clé de stream y reste, elle n'est jamais renvoyée ici.
// Chaque plateforme a son adresse de serveur toute prête ; on ne renseigne que la clé (et l'adresse pour celles qui en varient).

export type MsOutput = { id: string; name: string; service: string; server: string; hasKey: boolean; active: boolean; starting: boolean; error: string };
export type MsState = { outputs: MsOutput[]; mainActive: boolean };
type Call = <T = Record<string, unknown>>(method: string, params?: Record<string, unknown>) => Promise<T | null>;

type Preset = { id: string; label: string; server: string; /** L'adresse change selon le compte ou la région : à renseigner. */ custom?: boolean; hint: string; icon?: { hex: string; path: string }; letter?: string; color?: string };

export const PRESETS: Preset[] = [
  { id: "twitch", label: "Twitch", server: "rtmp://live.twitch.tv/app", hint: "Clé : Tableau de bord du créateur, Paramètres, Stream.", icon: siTwitch },
  { id: "youtube", label: "YouTube", server: "rtmp://a.rtmp.youtube.com/live2", hint: "Clé : YouTube Studio, Passer en direct, Clé de stream.", icon: siYoutube },
  { id: "facebook", label: "Facebook", server: "rtmps://live-api-s.facebook.com:443/rtmp/", hint: "Clé : Créateur de directs Facebook, Clé de stream.", icon: siFacebook },
  { id: "kick", label: "Kick", server: "", custom: true, hint: "Adresse et clé : tableau de bord Kick, Paramètres de stream (l'adresse change selon la région).", icon: siKick },
  { id: "tiktok", label: "TikTok", server: "", custom: true, hint: "Adresse et clé : TikTok LIVE Studio, ou le formulaire de diffusion (accès LIVE requis).", icon: siTiktok },
  { id: "x", label: "X (Twitter)", server: "", custom: true, hint: "Adresse et clé : Media Studio, Producteur, Créer une diffusion.", icon: siX },
  { id: "trovo", label: "Trovo", server: "rtmp://livepush.trovo.live/live/", hint: "Clé : Trovo, Tableau de bord du stream.", letter: "T", color: "#19d65c" },
  { id: "other", label: "Autre service", server: "", custom: true, hint: "L'adresse du serveur (rtmp:// ou rtmps://) et la clé de ta plateforme.", letter: "+", color: "#6b7280" },
];
const preset = (id: string) => PRESETS.find((p) => p.id === id) ?? PRESETS[PRESETS.length - 1];

export function PlatformLogo({ id, size = 28 }: { id: string; size?: number }) {
  const p = preset(id);
  const bg = p.icon ? `#${p.icon.hex}` : (p.color ?? "#333");
  // Le X et Kick ont des couleurs sombres ou très vives : la tuile reste lisible sur le fond noir.
  const dark = id === "x" || id === "tiktok";
  return (
    <span aria-hidden="true" className="grid shrink-0 place-items-center rounded-md" style={{ width: size, height: size, backgroundColor: dark ? "#fff" : bg }}>
      {p.icon ? (
        <svg viewBox="0 0 24 24" width={size * 0.62} height={size * 0.62} fill={dark ? "#000" : id === "kick" ? "#000" : "#fff"}>
          <path d={p.icon.path} />
        </svg>
      ) : (
        <span className="font-bold leading-none text-black" style={{ fontSize: size * 0.5 }}>
          {p.letter}
        </span>
      )}
    </span>
  );
}

const flat = "inline-flex items-center justify-center whitespace-nowrap rounded border border-[#2e2e2e] bg-[#141414] text-[13px] text-neutral-100 hover:bg-[#1d1d1d] disabled:opacity-40";
const input = "h-9 w-full rounded border border-[#2e2e2e] bg-[#111] px-2.5 text-[13px] text-neutral-100 placeholder:text-neutral-600";

function Broadcast({ on }: { on: boolean }) {
  return (
    <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
      <circle cx="12" cy="12" r="2" fill={on ? "currentColor" : "none"} />
      <path d="M8.5 8.5a5 5 0 0 0 0 7M15.5 8.5a5 5 0 0 1 0 7M5.5 5.5a9 9 0 0 0 0 13M18.5 5.5a9 9 0 0 1 0 13" />
    </svg>
  );
}

export default function MultistreamPanel({ state, call, ready, canControl, canEdit, onChange }: { state: MsState | null; call: Call; ready: boolean; canControl: boolean; canEdit: boolean; onChange: (s: MsState) => void }) {
  const [dialog, setDialog] = useState<null | { step: "pick" | "form"; editing?: MsOutput; service: string }>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState("");

  async function act(method: string, id: string) {
    setBusy(id);
    setError("");
    try {
      const r = await call<MsState>(method, { id });
      if (r) onChange(r);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(null);
    }
  }

  const outputs = state?.outputs ?? [];
  return (
    <section aria-label="Multistream" className="flex min-h-0 min-w-0 flex-col rounded-md border border-[#262626] bg-black">
      <div className="flex items-center justify-between gap-2 border-b border-[#262626] px-3 py-2">
        <h2 className="text-[13px] font-semibold">Multistream</h2>
        {canEdit && (
          <button type="button" disabled={!ready} onClick={() => setDialog({ step: "pick", service: "" })} className={`${flat} h-7 gap-1 px-2.5`}>
            <span aria-hidden="true">+</span> Ajouter
          </button>
        )}
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-2">
        {outputs.length === 0 ? (
          <div className="grid place-items-center px-3 py-6 text-center text-[13px] text-neutral-500">
            <p>Aucune sortie.</p>
            <p className="mt-1 text-[12px]">{canEdit ? "Ajoute une plateforme : choisis son logo, colle ta clé de stream, c'est prêt." : "Le propriétaire n'a pas encore ajouté de plateforme."}</p>
          </div>
        ) : (
          <ul className="grid gap-1.5">
            {outputs.map((o) => (
              <li key={o.id} className="rounded-md border border-[#262626] bg-[#0b0b0b] p-2">
                <div className="flex items-center gap-2.5">
                  <PlatformLogo id={o.service} size={32} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13px] font-medium">{o.name}</p>
                    <p className={`text-[12px] ${o.error ? "text-amber-300" : o.active ? "text-emerald-400" : "text-neutral-500"}`}>{o.error ? o.error : o.starting ? "Connexion…" : o.active ? "En direct" : "Arrêté"}</p>
                  </div>
                  {canEdit && !o.active && !o.starting && (
                    <button type="button" aria-label={`Modifier ${o.name}`} title="Modifier" onClick={() => setDialog({ step: "form", editing: o, service: o.service })} className="grid size-9 place-items-center rounded text-neutral-400 hover:bg-[#1d1d1d]">
                      <span aria-hidden="true">⚙</span>
                    </button>
                  )}
                  <button
                    type="button"
                    disabled={!ready || !canControl || busy === o.id || (!o.active && !o.starting && !o.hasKey)}
                    aria-pressed={o.active || o.starting}
                    aria-label={o.active || o.starting ? `Arrêter ${o.name}` : `Lancer ${o.name}`}
                    title={o.active || o.starting ? `Arrêter ${o.name}` : `Lancer ${o.name}`}
                    onClick={() => void act(o.active || o.starting ? "link.multistreamStop" : "link.multistreamStart", o.id)}
                    className={`grid h-9 w-12 place-items-center rounded border transition-colors disabled:opacity-40 ${o.active ? "border-red-700 bg-red-700 text-white" : o.starting ? "border-amber-600 text-amber-300" : "border-[#2e2e2e] bg-[#141414] text-neutral-200 hover:bg-[#1d1d1d]"}`}
                  >
                    <Broadcast on={o.active} />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
        {state && !state.mainActive && outputs.length > 0 && <p className="mt-2 px-1 text-[12px] text-neutral-500">Le direct principal n&apos;est pas lancé : chaque sortie démarre avec son propre encodage.</p>}
        {error && (
          <p role="alert" className="mt-2 px-1 text-[12px] text-amber-300">
            {error}
          </p>
        )}
      </div>
      {dialog && <OutputDialog dialog={dialog} setDialog={setDialog} call={call} onChange={onChange} />}
    </section>
  );
}

function OutputDialog({ dialog, setDialog, call, onChange }: { dialog: { step: "pick" | "form"; editing?: MsOutput; service: string }; setDialog: (d: null | { step: "pick" | "form"; editing?: MsOutput; service: string }) => void; call: Call; onChange: (s: MsState) => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  const p = preset(dialog.service);
  const e = dialog.editing;
  const [name, setName] = useState(e?.name ?? p.label);
  const [server, setServer] = useState(e?.server ?? p.server);
  const [key, setKey] = useState("");
  const [show, setShow] = useState(false);
  const [err, setErr] = useState("");
  const [pending, setPending] = useState(false);

  useEffect(() => {
    const d = ref.current;
    if (d && !d.open) d.showModal();
  }, []);

  async function save() {
    setPending(true);
    setErr("");
    try {
      const r = await call<MsState>("link.multistreamSave", { id: e?.id, name, service: dialog.service, server, key });
      if (r) {
        onChange(r);
        setDialog(null);
      }
    } catch (x) {
      setErr((x as Error).message);
    } finally {
      setPending(false);
    }
  }
  async function remove() {
    if (!e) return;
    setPending(true);
    try {
      const r = await call<MsState>("link.multistreamRemove", { id: e.id });
      if (r) {
        onChange(r);
        setDialog(null);
      }
    } catch (x) {
      setErr((x as Error).message);
    } finally {
      setPending(false);
    }
  }

  return (
    <dialog ref={ref} onClose={() => setDialog(null)} onClick={(ev) => ev.target === ref.current && setDialog(null)} aria-label="Sortie multistream" className="m-auto max-h-[92dvh] w-[min(34rem,calc(100vw-1.5rem))] overflow-y-auto rounded-md border border-[#333] bg-[#0b0b0b] p-0 text-neutral-100 backdrop:bg-black/70">
      <div className="p-4 sm:p-5">
        {dialog.step === "pick" ? (
          <>
            <h2 className="text-[15px] font-semibold">Ajouter une sortie</h2>
            <p className="mt-1 text-[13px] text-neutral-400">Choisis la plateforme. Si elle n&apos;est pas dans la liste, prends « Autre service ».</p>
            <ul className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
              {PRESETS.map((x) => (
                <li key={x.id}>
                  <button
                    type="button"
                    onClick={() => {
                      const n = preset(x.id);
                      setName(n.label);
                      setServer(n.server);
                      setDialog({ step: "form", service: x.id });
                    }}
                    className="flex min-h-[5.5rem] w-full flex-col items-center justify-center gap-2 rounded-md border border-[#262626] bg-[#141414] p-2 text-[13px] hover:border-[#444] hover:bg-[#1d1d1d]"
                  >
                    <PlatformLogo id={x.id} size={36} />
                    <span className="max-w-full truncate">{x.label}</span>
                  </button>
                </li>
              ))}
            </ul>
            <div className="mt-4">
              <button type="button" onClick={() => setDialog(null)} className={`${flat} h-9 px-4`}>
                Annuler
              </button>
            </div>
          </>
        ) : (
          <form
            onSubmit={(ev) => {
              ev.preventDefault();
              void save();
            }}
          >
            <div className="flex items-center gap-3">
              <PlatformLogo id={dialog.service} size={36} />
              <h2 className="text-[15px] font-semibold">{e ? `Modifier ${e.name}` : p.label}</h2>
            </div>
            <p className="mt-2 text-[12px] leading-relaxed text-neutral-400">{p.hint}</p>
            <div className="mt-4 grid gap-3">
              <label className="grid gap-1 text-[12px] text-neutral-400">
                Nom
                <input value={name} onChange={(x) => setName(x.target.value)} maxLength={40} required className={input} />
              </label>
              <label className="grid gap-1 text-[12px] text-neutral-400">
                Adresse du serveur {p.custom ? "" : "(déjà remplie)"}
                <input value={server} onChange={(x) => setServer(x.target.value)} required placeholder="rtmp://…  ou  rtmps://…" inputMode="url" autoCapitalize="none" autoCorrect="off" spellCheck={false} className={`${input} font-mono text-[12px]`} />
              </label>
              <label className="grid gap-1 text-[12px] text-neutral-400">
                Clé de stream {e?.hasKey ? "(laisse vide pour garder la clé actuelle)" : ""}
                <span className="flex gap-2">
                  <input value={key} onChange={(x) => setKey(x.target.value)} type={show ? "text" : "password"} required={!e?.hasKey} autoComplete="off" autoCapitalize="none" autoCorrect="off" spellCheck={false} className={`${input} font-mono text-[12px]`} />
                  <button type="button" onClick={() => setShow((s) => !s)} className={`${flat} h-9 shrink-0 px-3`}>
                    {show ? "Masquer" : "Voir"}
                  </button>
                </span>
              </label>
            </div>
            <p className="mt-3 text-[12px] text-neutral-500">La clé reste sur ton ordinateur, dans OBS. Elle n&apos;est jamais renvoyée vers le site.</p>
            {err && (
              <p role="alert" className="mt-3 text-[13px] text-amber-300">
                {err}
              </p>
            )}
            <div className="mt-5 flex flex-wrap items-center gap-2">
              <button type="submit" disabled={pending} className={`${flat} h-9 px-4 !border-[#2f4fc4] !bg-[#2f4fc4] !text-white`}>
                {pending ? "Enregistrement…" : "Enregistrer"}
              </button>
              {!e && (
                <button type="button" onClick={() => setDialog({ step: "pick", service: "" })} className={`${flat} h-9 px-4`}>
                  Retour
                </button>
              )}
              <button type="button" onClick={() => setDialog(null)} className={`${flat} h-9 px-4`}>
                Annuler
              </button>
              {e && (
                <button type="button" disabled={pending} onClick={() => void remove()} className={`${flat} ml-auto h-9 px-4 !text-red-300`}>
                  Supprimer
                </button>
              )}
            </div>
          </form>
        )}
      </div>
    </dialog>
  );
}
