"use client";

import { useEffect, useRef, useState } from "react";
import BrandLogo from "@/components/BrandLogo";
import CopyCode from "@/components/CopyCode";
import { DJI_MODELS, supportsCodecChoice, supportsStabilization, type DjiModel, type Resolution, type Stabilization } from "@/lib/dji/protocol";
import { detectModel, pickCamera } from "@/lib/dji/session";
import NetworkDialog from "./NetworkDialog";
import { defaultCamera, type Camera, type Network } from "./store";

// Assistant plein écran « Ajouter une caméra » (même forme que « Créer un relais ») : caméra, réseau, relais, qualité.

export type WizardRelay = { id: string; name: string; usedBy: string | null; live: boolean; rtmpUrl?: string };

type StepId = "cam" | "net" | "relay" | "quality" | "gopro";
// DJI : lancée par le Bluetooth depuis cette page (réseau, qualité). GoPro : on donne l'URL RTMP à coller dans l'app GoPro.
const STEPS_DJI: { id: StepId; label: string }[] = [
  { id: "cam", label: "Caméra" },
  { id: "net", label: "Réseau" },
  { id: "relay", label: "Relais" },
  { id: "quality", label: "Qualité" },
];
const STEPS_GOPRO: { id: StepId; label: string }[] = [
  { id: "cam", label: "Caméra" },
  { id: "relay", label: "Relais" },
  { id: "gopro", label: "Réglages" },
];
const DRONE_MODELS = ["Mini 4 Pro", "Mini 3 Pro", "Mini 3", "Air 3S", "Air 3", "Mavic 3 Pro", "Mavic 3 Classic", "Avata 2", "Autre drone DJI"];
const GOPRO_MODELS = ["HERO13 Black", "HERO12 Black", "HERO11 Black", "HERO11 Black Mini", "HERO10 Black", "HERO9 Black"];
const PRESETS: { id: string; title: string; text: string; resolution: Resolution; bitrateKbps: number }[] = [
  { id: "eco", title: "Économe", text: "720p · 2 Mb/s. Tient sur une 4G moyenne, conseillé en IRL.", resolution: "720p", bitrateKbps: 2000 },
  { id: "low", title: "Bas débit", text: "480p · 0,8 Mb/s. Passe sur une 3G ou une 4G faible.", resolution: "480p", bitrateKbps: 800 },
  { id: "hd", title: "Full HD", text: "1080p · 4 Mb/s. Bonne 4G ou 5G.", resolution: "1080p", bitrateKbps: 4000 },
  { id: "max", title: "Maximum", text: "1080p · 6 Mb/s. 5G solide ou Wi-Fi.", resolution: "1080p", bitrateKbps: 6000 },
];
const STABS: { v: Stabilization; l: string }[] = [
  { v: "rockSteady", l: "RockSteady" },
  { v: "rockSteadyPlus", l: "RockSteady+" },
  { v: "horizonSteady", l: "HorizonSteady" },
  { v: "horizonBalancing", l: "HorizonBalancing" },
  { v: "off", l: "Désactivée" },
];

const card = (on: boolean) =>
  `relative flex cursor-pointer flex-col rounded-2xl border p-5 transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-foreground/60 ${on ? "border-accent bg-foreground/[0.08]" : "border-line hover:bg-foreground/[0.08]"}`;
const primary = "h-11 whitespace-nowrap rounded-full bg-accent px-6 text-sm font-medium text-on-accent transition-colors hover:bg-accent-hover active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40";
const ghost = "h-11 whitespace-nowrap rounded-full border border-line px-5 text-sm transition-colors hover:bg-foreground/10 disabled:opacity-40";

function Pills<T extends string | number>({ value, options, onChange, label }: { value: T; options: { v: T; l: string }[]; onChange: (v: T) => void; label: string }) {
  return (
    <div role="radiogroup" aria-label={label} className="flex flex-wrap gap-2">
      {options.map((o) => (
        <button
          key={String(o.v)}
          type="button"
          role="radio"
          aria-checked={value === o.v}
          onClick={() => onChange(o.v)}
          className={`h-9 whitespace-nowrap rounded-full border px-4 text-sm transition-colors ${value === o.v ? "border-accent bg-accent text-on-accent" : "border-line text-muted hover:bg-foreground/10 hover:text-foreground"}`}
        >
          {o.l}
        </button>
      ))}
    </div>
  );
}

export default function CameraWizard({
  open,
  initial,
  relays,
  networks,
  defaultRelay,
  onClose,
  onSave,
  onAddNetwork,
}: {
  open: boolean;
  initial: Camera | null;
  relays: WizardRelay[];
  networks: Network[];
  defaultRelay: string;
  onClose: () => void;
  onSave: (c: Camera, launch: boolean) => void;
  onAddNetwork: (n: Network) => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const [step, setStep] = useState(initial ? 1 : 0);
  const [c, setC] = useState<Camera>(() => initial ?? defaultCamera(defaultRelay, networks[0]?.id ?? ""));
  const [scan, setScan] = useState<"idle" | "busy" | "cancelled">("idle");
  const [netOpen, setNetOpen] = useState(0); // 0 = fermée, sinon numéro d'ouverture (key)
  const [advanced, setAdvanced] = useState(false);

  // État initialisé au montage : le parent change la `key` à chaque ouverture.
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);

  const set = <K extends keyof Camera>(k: K, v: Camera[K]) => setC((cur) => ({ ...cur, [k]: v }));

  async function search(showAll = false) {
    setScan("busy");
    try {
      const d = await pickCamera(showAll);
      const m = await detectModel(d);
      setC((cur) => ({ ...cur, deviceId: d.id, deviceName: d.name ?? "Caméra DJI", model: m !== "unknown" ? m : cur.model, name: cur.name || d.name || "" }));
      setScan("idle");
    } catch (e) {
      if ((e as Error).name !== "NotFoundError") console.error("dji scan", e);
      setScan("cancelled");
    }
  }

  const drone = c.brand === "drone";
  const gopro = c.brand === "gopro" || drone; // RTMP lancé depuis l'app de l'appareil (GoPro ou drone), sans Bluetooth
  const steps = gopro ? STEPS_GOPRO : STEPS_DJI;
  const id = steps[step].id;
  const last = step === steps.length - 1;
  const canNext = { cam: gopro || !!c.deviceId, net: networks.some((n) => n.id === c.networkId), relay: relays.some((r) => r.id === c.relayId), quality: true, gopro: true }[id];
  const preset = PRESETS.find((p) => p.resolution === c.resolution && p.bitrateKbps === c.bitrateKbps)?.id ?? null;
  const finish = (launch: boolean) => onSave({ ...c, name: c.name.trim() || (drone ? c.drone || "Drone DJI" : gopro ? c.gopro || "GoPro" : c.deviceName || DJI_MODELS.find((m) => m.id === c.model)?.name || "Caméra DJI") }, launch && !gopro);
  const goproRelay = relays.find((r) => r.id === c.relayId);

  return (
    <dialog ref={ref} onClose={onClose} aria-labelledby="cam-wizard-title" className="m-0 h-dvh max-h-none w-screen max-w-none bg-background p-0 text-foreground backdrop:bg-background">
      <div className="mx-auto flex min-h-dvh w-full max-w-3xl flex-col px-4 pb-8 pt-6 sm:px-6">
        <div className="flex items-center justify-between gap-4">
          <h2 id="cam-wizard-title" className="text-xl font-semibold tracking-tight sm:text-2xl">
            {initial ? "Modifier la" : "Ajouter une"} caméra
          </h2>
          <button type="button" onClick={onClose} className="h-10 rounded-full px-4 text-sm text-muted transition-colors hover:bg-foreground/10 hover:text-foreground">
            Fermer
          </button>
        </div>

        <ol className="mt-6 grid gap-2" style={{ gridTemplateColumns: `repeat(${steps.length}, minmax(0, 1fr))` }} aria-label="Étapes">
          {steps.map(({ label }, i) => (
            <li key={label} aria-current={i === step ? "step" : undefined}>
              <span className={`block h-1 rounded-full transition-colors motion-reduce:transition-none ${i <= step ? "bg-accent" : "bg-foreground/20"}`} />
              <span className={`mt-2 block text-xs ${i === step ? "text-foreground" : "text-muted"}`}>
                {i + 1} {label}
              </span>
            </li>
          ))}
        </ol>

        <div className="mt-8 flex-1">
          {id === "cam" && (
            <div className="grid gap-6">
              <fieldset>
                <legend className="text-base text-muted">Quelle marque ?</legend>
                <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
                  {(
                    [
                      { v: "dji", t: "DJI", d: "Osmo Pocket, Action, 360. Lancée en Bluetooth depuis cette page." },
                      { v: "gopro", t: "GoPro", d: "HERO9 et plus récentes. Tu colles l'URL RTMP dans l'app GoPro." },
                      { v: "drone", t: "Drone DJI", d: "Mini, Air, Mavic, Avata. Tu colles l'URL RTMP dans DJI Fly." },
                    ] as const
                  ).map((b) => (
                    <label key={b.v} className={card((c.brand ?? "dji") === b.v)}>
                      <input type="radio" name="wiz-brand" checked={(c.brand ?? "dji") === b.v} onChange={() => set("brand", b.v)} className="sr-only" />
                      <BrandLogo brand={b.v === "drone" ? "dji" : b.v} className="mb-3 h-6 w-auto" />
                      <span className="text-base font-medium">{b.t}</span>
                      <span className="mt-1 text-xs leading-relaxed text-muted">{b.d}</span>
                    </label>
                  ))}
                </div>
              </fieldset>
              {!gopro && (
              <div className={`rounded-2xl border p-6 ${c.deviceId ? "border-accent bg-foreground/[0.08]" : "border-line"}`}>
                {c.deviceId ? (
                  <p className="flex flex-wrap items-center justify-between gap-3">
                    <span>
                      <span className="block text-lg font-medium">{c.deviceName}</span>
                      <span className="text-sm text-muted">Caméra trouvée. Modèle détecté ou à choisir ci-dessous.</span>
                    </span>
                    <button type="button" onClick={() => search()} className={ghost}>
                      Changer
                    </button>
                  </p>
                ) : (
                  <div>
                    <p className="text-base text-muted">Allume la caméra et son Bluetooth, puis lance la recherche. À la première connexion, valide la demande sur l&apos;écran de la caméra.</p>
                    <button type="button" onClick={() => search()} disabled={scan === "busy"} className={`${primary} mt-5`}>
                      {scan === "busy" ? "Recherche…" : "Rechercher ma caméra"}
                    </button>
                    {scan === "cancelled" && (
                      <div className="mt-3 text-sm text-muted">
                        <p>Aucune caméra choisie. Allume la caméra, active son Bluetooth (menu Wi-Fi / Bluetooth), rapproche le téléphone, puis réessaie.</p>
                        <button type="button" onClick={() => search(true)} className="mt-2 underline underline-offset-4 hover:text-foreground">
                          Ma caméra n&apos;apparaît pas : afficher tous les appareils
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
              )}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <label htmlFor="wiz-name" className="block text-sm text-muted">
                    Nom
                  </label>
                  <input
                    id="wiz-name"
                    value={c.name}
                    onChange={(e) => set("name", e.target.value)}
                    maxLength={40}
                    placeholder={drone ? "Ex. Drone de plage" : gopro ? "Ex. GoPro principale" : "Ex. Osmo principale"}
                    className="h-12 w-full rounded-xl border border-line bg-background px-4 text-base placeholder:text-muted focus:border-foreground/70 focus:outline-none"
                  />
                </div>
                <div className="space-y-2">
                  <label htmlFor="wiz-model" className="block text-sm text-muted">
                    Modèle
                  </label>
                  {gopro ? (
                    <select
                      id="wiz-model"
                      value={drone ? (c.drone ?? DRONE_MODELS[0]) : (c.gopro ?? GOPRO_MODELS[0])}
                      onChange={(e) => set(drone ? "drone" : "gopro", e.target.value)}
                      className="h-12 w-full rounded-xl border border-line bg-background px-4 text-base focus:border-foreground/70 focus:outline-none"
                    >
                      {(drone ? DRONE_MODELS : GOPRO_MODELS).map((m) => (
                        <option key={m} value={m}>
                          {m}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <select
                      id="wiz-model"
                      value={c.model}
                      onChange={(e) => set("model", e.target.value as DjiModel)}
                      className="h-12 w-full rounded-xl border border-line bg-background px-4 text-base focus:border-foreground/70 focus:outline-none"
                    >
                      {DJI_MODELS.map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.name}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              </div>
            </div>
          )}

          {id === "net" && (
            <fieldset>
              <legend className="text-base text-muted">Par quel réseau la caméra envoie le direct ?</legend>
              <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
                {networks.map((n) => (
                  <label key={n.id} className={card(c.networkId === n.id)}>
                    <input type="radio" name="wiz-net" checked={c.networkId === n.id} onChange={() => set("networkId", n.id)} className="sr-only" />
                    <span className="text-base font-medium">{n.ssid}</span>
                    <span className="mt-1 text-xs text-muted">{n.kind === "hotspot" ? "Partage de connexion" : "Wi-Fi"}</span>
                    <span className="mt-3 text-xs text-muted">{n.remember ? "Mot de passe mémorisé" : "Mot de passe demandé au lancement"}</span>
                  </label>
                ))}
                <button type="button" onClick={() => setNetOpen((k) => k + 1)} className="flex min-h-[112px] flex-col items-start justify-center rounded-2xl border border-dashed border-foreground/35 p-5 text-left transition-colors hover:bg-foreground/[0.08]">
                  <span className="text-base font-medium">+ Nouveau réseau</span>
                  <span className="mt-1 text-xs text-muted">Partage de connexion ou Wi-Fi</span>
                </button>
              </div>
            </fieldset>
          )}

          {id === "relay" && (
            <fieldset>
              <legend className="text-base text-muted">Vers quel relais RTMP ? Un relais = un flux à la fois.</legend>
              <ul className="mt-4 divide-y divide-foreground/10 rounded-2xl border border-line">
                {relays.map((r) => (
                  <li key={r.id}>
                    <label className="flex cursor-pointer items-center gap-4 px-4 py-3.5 hover:bg-foreground/[0.08] sm:px-5">
                      <input type="radio" name="wiz-relay" checked={c.relayId === r.id} onChange={() => set("relayId", r.id)} className="h-4 w-4 accent-accent" />
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm font-medium">{r.name}</span>
                        <span className="block text-xs text-muted">{r.usedBy && r.usedBy !== c.id ? `Déjà lié à « ${r.usedBy} »` : "Libre"}</span>
                      </span>
                      {r.live && <span className="rounded bg-live px-1.5 py-0.5 font-mono text-[10px] font-semibold tracking-[0.12em] text-white">EN DIRECT</span>}
                    </label>
                  </li>
                ))}
              </ul>
            </fieldset>
          )}

          {id === "gopro" && (
            <div className="grid gap-5">
              <p className="text-base text-muted">
                {drone
                  ? "Dans DJI Fly, ouvre la transmission en direct, choisis la plateforme RTMP personnalisée et colle l'adresse ci-dessous."
                  : "Dans l'app GoPro, ouvre ta caméra, choisis la diffusion en direct, puis une URL RTMP personnalisée et colle l'adresse ci-dessous."}
              </p>
              {goproRelay?.rtmpUrl ? <CopyCode code={goproRelay.rtmpUrl} /> : <p className="text-sm text-muted">Choisis un relais RTMP à l&apos;étape précédente pour voir son adresse.</p>}
              {drone ? (
                <ol className="list-decimal space-y-2 pl-5 text-sm leading-relaxed text-muted">
                  <li>Allume le drone et la radiocommande, connecte la radiocommande à Internet (partage de connexion de ton téléphone ou Wi-Fi).</li>
                  <li>Dans DJI Fly : Transmission en direct, puis RTMP personnalisé. Colle l&apos;adresse copiée.</li>
                  <li>Résolution conseillée : 720p ou 1080p. Vérifie que ton modèle propose le RTMP dans DJI Fly.</li>
                  <li>Lance la transmission : le relais passe « En direct » ici.</li>
                </ol>
              ) : (
                <ol className="list-decimal space-y-2 pl-5 text-sm leading-relaxed text-muted">
                  <li>Allume la caméra et connecte-la à ton téléphone dans l&apos;app GoPro.</li>
                  <li>Réseau : active le partage de connexion de ton téléphone (ou un Wi-Fi), la GoPro s&apos;y connecte.</li>
                  <li>Résolution conseillée : 720p ou 1080p, 30 images par seconde.</li>
                  <li>Lance la diffusion dans l&apos;app : le relais passe « En direct » ici.</li>
                </ol>
              )}
            </div>
          )}

          {id === "quality" && (
            <div className="grid gap-6">
              <fieldset>
                <legend className="text-base text-muted">Qualité du direct</legend>
                <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  {PRESETS.map((p) => (
                    <label key={p.id} className={card(preset === p.id)}>
                      <input
                        type="radio"
                        name="wiz-preset"
                        checked={preset === p.id}
                        onChange={() => setC((cur) => ({ ...cur, resolution: p.resolution, bitrateKbps: p.bitrateKbps }))}
                        className="sr-only"
                      />
                      <span className="flex items-center justify-between gap-2 text-base font-medium">
                        {p.title}
                        {p.id === "eco" && <span className="rounded border border-foreground/40 px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-[0.12em]">Conseillé</span>}
                      </span>
                      <span className="mt-2 text-xs leading-relaxed text-muted">{p.text}</span>
                    </label>
                  ))}
                </div>
              </fieldset>
              {!gopro && (
                <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-line p-4">
                  <input type="checkbox" checked={c.auto !== false} onChange={(e) => set("auto", e.target.checked)} className="mt-1 size-4 accent-[var(--accent)]" />
                  <span className="text-sm">
                    <span className="font-medium">Adapter la qualité automatiquement</span>
                    <span className="mt-1 block text-xs leading-relaxed text-muted">
                      Si le réseau ne suit plus, la caméra repart un cran plus léger (jusqu&apos;à 480p · 0,5 Mb/s) puis remonte quand c&apos;est stable. Coupure d&apos;environ 20 s à chaque changement. Page ouverte et Bluetooth requis.
                    </span>
                  </span>
                </label>
              )}
              <button type="button" aria-expanded={advanced} onClick={() => setAdvanced((v) => !v)} className="w-fit text-sm text-muted underline-offset-4 hover:text-foreground hover:underline">
                {advanced ? "Masquer les réglages avancés" : "Réglages avancés"}
              </button>
              {advanced && (
                <div className="grid gap-5 rounded-2xl border border-line p-5">
                  <div className="grid gap-2">
                    <span className="text-sm text-muted">Résolution</span>
                    <Pills label="Résolution" value={c.resolution} onChange={(v) => set("resolution", v)} options={[{ v: "480p", l: "480p" }, { v: "720p", l: "720p" }, { v: "1080p", l: "1080p" }]} />
                  </div>
                  <div className="grid gap-2">
                    <span className="text-sm text-muted">Débit</span>
                    <Pills label="Débit" value={c.bitrateKbps} onChange={(v) => set("bitrateKbps", v)} options={[500, 800, 1000, 2000, 3000, 4000, 6000, 8000].map((b) => ({ v: b, l: `${b / 1000} Mb/s` }))} />
                  </div>
                  <div className="grid gap-2">
                    <span className="text-sm text-muted">Images par seconde</span>
                    <Pills label="Images par seconde" value={c.fps} onChange={(v) => set("fps", v)} options={[{ v: 30, l: "30" }, { v: 25, l: "25" }]} />
                  </div>
                  <div className="grid gap-2">
                    <span className="text-sm text-muted">Codec</span>
                    <Pills label="Codec" value={c.codec} onChange={(v) => set("codec", v)} options={[{ v: "h264", l: "H.264" }, { v: "h265", l: "H.265" }]} />
                    {!supportsCodecChoice(c.model) && <p className="text-xs text-muted">Sur ce modèle, le codec se règle dans la caméra : ce choix n&apos;est pas envoyé.</p>}
                  </div>
                  {supportsStabilization(c.model) && (
                    <div className="grid gap-2">
                      <span className="text-sm text-muted">Stabilisation</span>
                      <Pills label="Stabilisation" value={c.stabilization} onChange={(v) => set("stabilization", v)} options={STABS} />
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="mt-10 flex items-center justify-between gap-3 border-t border-line pt-5">
          <button type="button" onClick={() => (step === 0 || (initial && step === 1) ? onClose() : setStep(step - 1))} className={ghost}>
            {step === 0 || (initial && step === 1) ? "Annuler" : "Retour"}
          </button>
          {!last ? (
            <button type="button" disabled={!canNext} onClick={() => setStep(step + 1)} className={primary}>
              Suivant
            </button>
          ) : (
            <span className="flex flex-wrap justify-end gap-3">
              {gopro ? (
                <button type="button" onClick={() => finish(false)} className={primary}>
                  Enregistrer
                </button>
              ) : (
                <>
                  <button type="button" onClick={() => finish(false)} className={ghost}>
                    Enregistrer
                  </button>
                  <button type="button" onClick={() => finish(true)} className={primary}>
                    Enregistrer et lancer
                  </button>
                </>
              )}
            </span>
          )}
        </div>
      </div>

      {netOpen > 0 && (
        <NetworkDialog
          key={netOpen}
          open
          initial={null}
          onClose={() => setNetOpen(0)}
          onSave={(n) => {
            onAddNetwork(n);
            set("networkId", n.id);
            setNetOpen(0);
          }}
        />
      )}
    </dialog>
  );
}
