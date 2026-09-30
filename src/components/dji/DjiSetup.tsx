"use client";

import { useEffect, useRef, useState, useSyncExternalStore, type ReactNode } from "react";
import { useLiveStatus } from "@/components/dashboard/LiveStatus";
import { DJI_MODELS, supportsCodecChoice, supportsStabilization, type Codec, type DjiModel, type Resolution, type Stabilization } from "@/lib/dji/protocol";
import { bluetoothSupported, detectModel, DjiSession, knownCamera, pickCamera, type BtDevice, type DjiError, type DjiState } from "@/lib/dji/session";

// Assistant « Configurer une DJI » : caméra en Bluetooth → réseau → relais et qualité → lancer le direct.
// Tout se passe dans le navigateur : le Wi-Fi n'est jamais envoyé au serveur (mémorisé ici seulement si coché).

export type RtmpRelay = { id: string; name: string; rtmpUrl: string };

type Saved = {
  deviceId?: string;
  deviceName?: string;
  model: DjiModel;
  network: "hotspot" | "wifi";
  ssid: string;
  password: string;
  remember: boolean;
  relayId: string;
  resolution: Resolution;
  fps: 25 | 30;
  bitrateKbps: number;
  codec: Codec;
  stabilization: Stabilization;
};

const KEY = "syxtee:dji";
function load(): Partial<Saved> {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? "{}") as Partial<Saved>;
  } catch {
    return {};
  }
}
function save(s: Saved) {
  try {
    // Wi-Fi seulement si la case est cochée : jamais envoyé au serveur, jamais stocké ailleurs que ce navigateur.
    localStorage.setItem(KEY, JSON.stringify(s.remember ? s : { ...s, ssid: "", password: "" }));
  } catch {
    // Stockage indisponible (navigation privée) : rien à mémoriser.
  }
}

const STATE_LABEL: Record<DjiState, string> = {
  idle: "Prête",
  connecting: "Connexion Bluetooth…",
  pairing: "Appairage…",
  approve: "Valide la connexion sur l'écran de la caméra",
  preparing: "Préparation du live…",
  wifi: "La caméra rejoint le réseau…",
  configuring: "Réglage de la stabilisation…",
  starting: "Démarrage du live…",
  streaming: "La caméra diffuse",
  stopping: "Arrêt du live…",
  error: "Erreur",
};
const ERROR_LABEL: Record<DjiError, string> = {
  wifi: "La caméra n'a pas pu rejoindre le réseau : vérifie le nom et le mot de passe (sensible aux majuscules), et que le partage de connexion est activé.",
  timeout: "La caméra ne répond plus. Rallume-la, rapproche le téléphone, puis relance.",
  disconnected: "Connexion Bluetooth perdue. Rapproche le téléphone et relance.",
  service: "Cette caméra ne répond pas comme une DJI compatible. Vérifie le modèle, ou utilise Moblin.",
  cancelled: "Recherche annulée.",
  unsupported: "Bluetooth indisponible dans ce navigateur.",
};

const RESOLUTIONS: Resolution[] = ["720p", "1080p", "480p"];
const BITRATES = [1000, 2000, 3000, 4000, 6000, 8000];
const STABS: { id: Stabilization; label: string }[] = [
  { id: "rockSteady", label: "RockSteady" },
  { id: "rockSteadyPlus", label: "RockSteady+" },
  { id: "horizonSteady", label: "HorizonSteady" },
  { id: "horizonBalancing", label: "HorizonBalancing" },
  { id: "off", label: "Désactivée" },
];

const field = "h-11 w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 text-sm text-white focus:border-white/30 focus:outline-none focus:ring-4 focus:ring-white/[0.06]";
const labelCls = "font-mono text-xs uppercase tracking-[0.15em] text-muted";

function Step({ n, title, done, children }: { n: number; title: string; done?: boolean; children: ReactNode }) {
  return (
    <section className="rounded-2xl border border-line p-5 sm:p-6">
      <h2 className="flex items-center gap-3 text-base font-medium">
        <span className={`flex h-7 w-7 items-center justify-center rounded-full border font-mono text-xs ${done ? "border-white bg-white text-black" : "border-white/20 text-muted"}`}>{n}</span>
        {title}
      </h2>
      <div className="mt-5">{children}</div>
    </section>
  );
}

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
          className={`h-10 whitespace-nowrap rounded-full border px-4 text-sm transition-colors ${value === o.v ? "border-white bg-white text-black" : "border-white/15 text-white hover:bg-white/5"}`}
        >
          {o.l}
        </button>
      ))}
    </div>
  );
}

const subscribeNoop = () => () => {};
const isIos = () => /iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);

export default function DjiSetup({ relays, relayId }: { relays: RtmpRelay[]; relayId: string }) {
  const env = useSyncExternalStore(
    subscribeNoop,
    () => (bluetoothSupported() ? "ok" : isIos() ? "ios" : "browser"),
    () => "ssr",
  );
  const [s, setS] = useState<Saved>(() => ({
    model: "osmoPocket3",
    network: "hotspot",
    ssid: "",
    password: "",
    remember: true,
    relayId,
    resolution: "720p",
    fps: 30,
    bitrateKbps: 2000,
    codec: "h264",
    stabilization: "rockSteady",
  }));
  const [device, setDevice] = useState<BtDevice | null>(null);
  const [state, setState] = useState<DjiState>("idle");
  const [error, setError] = useState<DjiError | null>(null);
  const [battery, setBattery] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const session = useRef<DjiSession | null>(null);
  const { state: live } = useLiveStatus();

  // Réglages mémorisés sur ce téléphone (après le rendu serveur, pour ne pas désynchroniser l'hydratation).
  useEffect(() => {
    const saved = load();
    // eslint-disable-next-line react-hooks/set-state-in-effect -- lecture unique du stockage local au montage
    setS((cur) => ({ ...cur, ...saved, relayId: relays.some((r) => r.id === saved.relayId) ? saved.relayId! : relayId }));
  }, [relays, relayId]);

  useEffect(() => () => void session.current?.stop(), []);

  const set = <K extends keyof Saved>(k: K, v: Saved[K]) => setS((cur) => ({ ...cur, [k]: v }));
  const relay = relays.find((r) => r.id === s.relayId) ?? relays[0];
  const relayLive = live?.relays?.find((r) => r.id === relay?.id);
  const running = state !== "idle" && state !== "error";

  async function choose() {
    setError(null);
    try {
      const d = await pickCamera();
      setDevice(d);
      setS((cur) => ({ ...cur, deviceId: d.id, deviceName: d.name ?? "Caméra DJI" }));
      const m = await detectModel(d);
      if (m !== "unknown") set("model", m);
    } catch (e) {
      if ((e as Error).name !== "NotFoundError") console.error("dji pick", e);
      setError("cancelled");
    }
  }

  async function launch() {
    if (!relay) return;
    setBusy(true);
    setError(null);
    try {
      let d = device;
      if (!d && s.deviceId) d = await knownCamera(s.deviceId);
      if (!d) d = await pickCamera();
      setDevice(d);
      const next = { ...s, deviceId: d.id, deviceName: d.name ?? s.deviceName };
      setS(next);
      save(next);
      session.current = new DjiSession(d, (u) => {
        setState(u.state);
        setError(u.error ?? null);
        setBattery(u.battery);
      });
      await session.current.start({ ...next, rtmpUrl: relay.rtmpUrl });
    } catch (e) {
      if ((e as Error).name !== "NotFoundError") console.error("dji launch", e);
      setError("cancelled");
    } finally {
      setBusy(false);
    }
  }

  if (env === "ssr") return <div className="h-40" aria-hidden="true" />;
  if (env !== "ok")
    return (
      <div className="rounded-2xl border border-line p-6 text-sm leading-relaxed">
        {env === "ios" ? (
          <p>Sur iPhone, utilise Moblin pour configurer ta DJI, ou l&apos;app SYXTEE (bientôt). Safari ne donne pas accès au Bluetooth aux sites web.</p>
        ) : (
          <p>Ce navigateur n&apos;a pas accès au Bluetooth. Ouvre cette page dans Chrome (Android ou ordinateur) ou Edge.</p>
        )}
        <p className="mt-3 text-muted">
          Tu peux aussi coller l&apos;URL RTMP du relais à la main dans DJI Mimo : <span className="break-all font-mono text-xs text-white">{relay?.rtmpUrl}</span>
        </p>
      </div>
    );

  const ready = !!relay && s.ssid.trim().length > 0 && (!!device || !!s.deviceId);

  return (
    <div className="grid gap-4">
      <Step n={1} title="Caméra" done={!!device || !!s.deviceId}>
        <div className="flex flex-wrap items-center gap-3">
          <button type="button" onClick={choose} disabled={running} className="h-11 whitespace-nowrap rounded-full bg-white px-5 text-sm font-medium text-black transition-colors hover:bg-neutral-200 disabled:opacity-50">
            {device || s.deviceId ? "Changer de caméra" : "Rechercher ma caméra"}
          </button>
          {(device || s.deviceId) && <span className="text-sm text-muted">{device?.name ?? s.deviceName ?? "Caméra DJI"}</span>}
        </div>
        <p className="mt-3 text-xs leading-relaxed text-muted">Allume la caméra et active son Bluetooth. À la première connexion, valide la demande sur l&apos;écran de la caméra.</p>
        <div className="mt-4 grid max-w-xs gap-2">
          <label htmlFor="dji-model" className={labelCls}>
            Modèle
          </label>
          <select id="dji-model" value={s.model} onChange={(e) => set("model", e.target.value as DjiModel)} className={field}>
            {DJI_MODELS.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </select>
        </div>
      </Step>

      <Step n={2} title="Réseau de la caméra" done={s.ssid.trim().length > 0}>
        <Pills label="Réseau" value={s.network} onChange={(v) => set("network", v)} options={[{ v: "hotspot", l: "Partage de connexion du téléphone" }, { v: "wifi", l: "Wi-Fi" }]} />
        <p className="mt-3 text-xs leading-relaxed text-muted">
          {s.network === "hotspot"
            ? "Active le partage de connexion du téléphone, puis indique son nom et son mot de passe (Réglages → Partage de connexion)."
            : "Le Wi-Fi que la caméra utilisera pour envoyer le direct."}
        </p>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div className="grid gap-2">
            <label htmlFor="dji-ssid" className={labelCls}>
              Nom du réseau
            </label>
            <input id="dji-ssid" value={s.ssid} onChange={(e) => set("ssid", e.target.value)} autoComplete="off" className={field} />
          </div>
          <div className="grid gap-2">
            <label htmlFor="dji-pass" className={labelCls}>
              Mot de passe
            </label>
            <input id="dji-pass" type="password" value={s.password} onChange={(e) => set("password", e.target.value)} autoComplete="off" className={field} />
          </div>
        </div>
        <label className="mt-4 flex items-center gap-3 text-sm">
          <input type="checkbox" checked={s.remember} onChange={(e) => set("remember", e.target.checked)} className="h-4 w-4 accent-white" />
          Mémoriser sur ce téléphone (jamais envoyé à SYXTEE)
        </label>
      </Step>

      <Step n={3} title="Relais et qualité" done={!!relay}>
        <div className="grid gap-5">
          {relays.length > 1 && (
            <div className="grid max-w-sm gap-2">
              <label htmlFor="dji-relay" className={labelCls}>
                Relais RTMP
              </label>
              <select id="dji-relay" value={s.relayId} onChange={(e) => set("relayId", e.target.value)} className={field}>
                {relays.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name}
                  </option>
                ))}
              </select>
            </div>
          )}
          <div className="grid gap-2">
            <span className={labelCls}>Résolution</span>
            <Pills label="Résolution" value={s.resolution} onChange={(v) => set("resolution", v)} options={RESOLUTIONS.map((r) => ({ v: r, l: r }))} />
          </div>
          <div className="grid gap-2">
            <span className={labelCls}>Débit</span>
            <Pills label="Débit" value={s.bitrateKbps} onChange={(v) => set("bitrateKbps", v)} options={BITRATES.map((b) => ({ v: b, l: `${b / 1000} Mb/s${b === 2000 ? " (conseillé)" : ""}` }))} />
            <p className="text-xs text-muted">2 Mb/s tient sur une 4G moyenne. Monte seulement avec un bon réseau.</p>
          </div>
          <div className="grid gap-2">
            <span className={labelCls}>Images par seconde</span>
            <Pills label="Images par seconde" value={s.fps} onChange={(v) => set("fps", v)} options={[{ v: 30, l: "30" }, { v: 25, l: "25" }]} />
          </div>
          <div className="grid gap-2">
            <span className={labelCls}>Codec</span>
            <Pills label="Codec" value={s.codec} onChange={(v) => set("codec", v)} options={[{ v: "h264", l: "H.264 (compatible partout)" }, { v: "h265", l: "H.265 (meilleure qualité)" }]} />
            {!supportsCodecChoice(s.model) && <p className="text-xs text-muted">Sur ce modèle, le codec se règle dans les réglages de la caméra : ce choix n&apos;est pas envoyé.</p>}
          </div>
          {supportsStabilization(s.model) && (
            <div className="grid gap-2">
              <span className={labelCls}>Stabilisation</span>
              <Pills label="Stabilisation" value={s.stabilization} onChange={(v) => set("stabilization", v)} options={STABS.map((x) => ({ v: x.id, l: x.label }))} />
            </div>
          )}
        </div>
      </Step>

      <Step n={4} title="Direct" done={state === "streaming"}>
        <div className="flex flex-wrap items-center gap-3">
          {!running ? (
            <button type="button" onClick={launch} disabled={!ready || busy} className="h-12 whitespace-nowrap rounded-full bg-white px-6 text-sm font-medium text-black transition-colors hover:bg-neutral-200 disabled:cursor-not-allowed disabled:opacity-40">
              {busy ? "Connexion…" : device || !s.deviceId ? "Lancer le direct" : "Relancer le direct"}
            </button>
          ) : (
            <button type="button" onClick={() => void session.current?.stop()} className="h-12 whitespace-nowrap rounded-full border border-red-400/40 px-6 text-sm font-medium text-red-300 transition-colors hover:bg-red-400/10">
              Arrêter le live
            </button>
          )}
          <p role="status" aria-live="polite" className="flex items-center gap-2 text-sm">
            {state === "streaming" && <span className="h-2 w-2 rounded-full bg-live" aria-hidden="true" />}
            {STATE_LABEL[state]}
            {battery !== null && <span className="font-mono text-xs text-muted">· batterie {battery} %</span>}
          </p>
        </div>
        {error && (
          <p role="alert" className="mt-4 text-sm text-red-400/90">
            {ERROR_LABEL[error]}
          </p>
        )}
        <p className="mt-4 text-sm text-muted">
          Relais {relay?.name} :{" "}
          {relayLive?.live ? (
            <span className="text-foreground">flux reçu{relayLive.kbps ? ` · ${(relayLive.kbps / 1000).toFixed(1)} Mb/s` : ""}</span>
          ) : state === "streaming" ? (
            "en attente du flux (quelques secondes)…"
          ) : (
            "pas de flux"
          )}
        </p>
      </Step>
    </div>
  );
}
