"use client";

import Link from "next/link";
import { useEffect, useRef, useState, useSyncExternalStore, type ReactNode } from "react";
import { useLiveStatus, useNow, type RelayLive } from "@/components/dashboard/LiveStatus";
import { DJI_MODELS, supportsCodecChoice, supportsStabilization, type DjiModel, type Stabilization } from "@/lib/dji/protocol";
import { bluetoothSupported, detectModel, DjiSession, knownCamera, pickCamera, type BtDevice, type DjiError, type DjiState } from "@/lib/dji/session";
import { defaultCamera, loadStore, newId, saveStore, type Camera, type DjiStore, type Network } from "./store";

// Caméras DJI : autant de caméras que tu veux, chacune liée à un relais RTMP. Stats en direct en haut, puis onglets.
// Une fois le live lancé, la caméra garde l'URL RTMP et continue de diffuser même page fermée (le Bluetooth ne sert
// qu'à lancer, suivre la batterie et arrêter). Tout reste sur ce téléphone : rien du Wi-Fi n'est envoyé au serveur.

export type RtmpRelay = { id: string; name: string; rtmpUrl: string };
type Tab = "cameras" | "ajouter" | "reseaux" | "aide";
type CamRun = { state: DjiState; error?: DjiError; battery: number | null };

const STATE_LABEL: Record<DjiState, string> = {
  idle: "Prête",
  connecting: "Connexion Bluetooth…",
  pairing: "Appairage…",
  approve: "Valide sur l'écran de la caméra",
  preparing: "Préparation…",
  wifi: "Connexion au réseau…",
  configuring: "Stabilisation…",
  starting: "Démarrage du live…",
  streaming: "La caméra diffuse",
  detached: "La caméra diffuse (Bluetooth déconnecté)",
  stopping: "Arrêt…",
  error: "Erreur",
};
const ERROR_LABEL: Record<DjiError, string> = {
  wifi: "La caméra n'a pas pu rejoindre le réseau : vérifie le nom et le mot de passe, et que le partage de connexion est activé.",
  timeout: "La caméra ne répond plus. Rallume-la, rapproche le téléphone, puis relance.",
  disconnected: "Connexion Bluetooth perdue. Rapproche le téléphone et relance.",
  service: "Cette caméra ne répond pas comme une DJI compatible. Vérifie le modèle.",
  cancelled: "Recherche annulée.",
  unsupported: "Bluetooth indisponible dans ce navigateur.",
};
const STABS: { v: Stabilization; l: string }[] = [
  { v: "rockSteady", l: "RockSteady" },
  { v: "rockSteadyPlus", l: "RockSteady+" },
  { v: "horizonSteady", l: "HorizonSteady" },
  { v: "horizonBalancing", l: "HorizonBalancing" },
  { v: "off", l: "Désactivée" },
];
const modelName = (m: DjiModel) => DJI_MODELS.find((x) => x.id === m)?.name ?? "Caméra DJI";

const field = "h-11 w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 text-sm text-white focus:border-white/30 focus:outline-none focus:ring-4 focus:ring-white/[0.06]";
const labelCls = "font-mono text-xs uppercase tracking-[0.15em] text-muted";
const btnPrimary = "h-11 whitespace-nowrap rounded-full bg-white px-5 text-sm font-medium text-black transition-colors hover:bg-neutral-200 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40";
const btnGhost = "h-11 whitespace-nowrap rounded-full border border-line px-5 text-sm transition-colors hover:bg-white/5 disabled:opacity-40";
const btnDanger = "h-11 whitespace-nowrap rounded-full border border-red-400/40 px-5 text-sm text-red-300 transition-colors hover:bg-red-400/10";

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

function Field({ id, label, children, hint }: { id?: string; label: string; children: ReactNode; hint?: ReactNode }) {
  return (
    <div className="grid gap-2">
      {id ? (
        <label htmlFor={id} className={labelCls}>
          {label}
        </label>
      ) : (
        <span className={labelCls}>{label}</span>
      )}
      {children}
      {hint && <p className="text-xs leading-relaxed text-muted">{hint}</p>}
    </div>
  );
}

function fmtDuration(ms: number) {
  const m = Math.floor(ms / 60_000);
  return m < 60 ? `${m} min` : `${Math.floor(m / 60)} h ${String(m % 60).padStart(2, "0")}`;
}

// ───────────── Stats en direct (haut de page) ─────────────

function LiveStats({ cameras, relays, runs, live }: { cameras: Camera[]; relays: RtmpRelay[]; runs: Record<string, CamRun>; live: RelayLive[] }) {
  const anyLive = cameras.some((c) => live.find((r) => r.id === c.relayId)?.live);
  const now = useNow(anyLive);
  if (!cameras.length) return null;
  return (
    <section aria-label="En direct" className="mb-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {cameras.map((c) => {
        const r = live.find((x) => x.id === c.relayId);
        const run = runs[c.id];
        const on = !!r?.live;
        return (
          <div key={c.id} className={`rounded-2xl border p-4 ${on ? "border-live/50" : "border-line"}`}>
            <p className="flex items-center justify-between gap-3 text-sm">
              <span className="truncate font-medium">{c.name || modelName(c.model)}</span>
              {on ? (
                <span className="flex items-center gap-1.5 rounded bg-live px-1.5 py-0.5 font-mono text-[10px] font-semibold tracking-[0.12em] text-white">EN DIRECT</span>
              ) : (
                <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted">Hors ligne</span>
              )}
            </p>
            <p className="mt-1 truncate text-xs text-muted">{relays.find((x) => x.id === c.relayId)?.name ?? "Relais supprimé"}</p>
            <dl className="mt-4 grid grid-cols-3 gap-2 font-mono text-xs">
              <div>
                <dt className="text-muted">Débit</dt>
                <dd className="mt-1 text-sm tabular-nums">{on && r?.kbps ? `${(r.kbps / 1000).toFixed(1)} Mb/s` : "·"}</dd>
              </div>
              <div>
                <dt className="text-muted">Durée</dt>
                <dd className="mt-1 text-sm tabular-nums">{on && r?.started_at ? fmtDuration(now - r.started_at) : "·"}</dd>
              </div>
              <div>
                <dt className="text-muted">Batterie</dt>
                <dd className="mt-1 text-sm tabular-nums">{run?.battery != null ? `${run.battery} %` : "·"}</dd>
              </div>
            </dl>
            {on && r && r.reconnects > 0 && <p className="mt-3 text-xs text-muted">{r.reconnects} reconnexion{r.reconnects > 1 ? "s" : ""} pendant ce live</p>}
          </div>
        );
      })}
    </section>
  );
}

// ───────────── Formulaire caméra (ajout / modification) ─────────────

function CameraForm({
  initial,
  relays,
  networks,
  busy,
  onSave,
  onCancel,
  onAddNetwork,
}: {
  initial: Camera;
  relays: RtmpRelay[];
  networks: Network[];
  busy: boolean;
  onSave: (c: Camera, launch: boolean) => void;
  onCancel?: () => void;
  onAddNetwork: (n: Network) => void;
}) {
  const [c, setC] = useState<Camera>(initial);
  const [device, setDevice] = useState<BtDevice | null>(null);
  const [scanError, setScanError] = useState(false);
  const [draft, setDraft] = useState<Network>({ id: newId(), kind: "hotspot", ssid: "", password: "", remember: true });
  const set = <K extends keyof Camera>(k: K, v: Camera[K]) => setC((cur) => ({ ...cur, [k]: v }));
  const creatingNet = !c.networkId || !networks.some((n) => n.id === c.networkId);

  async function scan() {
    setScanError(false);
    try {
      const d = await pickCamera();
      setDevice(d);
      const m = await detectModel(d);
      setC((cur) => ({ ...cur, deviceId: d.id, deviceName: d.name ?? "Caméra DJI", model: m !== "unknown" ? m : cur.model, name: cur.name || d.name || "" }));
    } catch (e) {
      if ((e as Error).name !== "NotFoundError") console.error("dji scan", e);
      setScanError(true);
    }
  }

  function submit(launch: boolean) {
    let cam = c;
    if (creatingNet) {
      onAddNetwork(draft);
      cam = { ...c, networkId: draft.id };
    }
    onSave({ ...cam, name: cam.name.trim() || cam.deviceName || modelName(cam.model) }, launch);
  }

  const netOk = creatingNet ? draft.ssid.trim().length > 0 : true;
  const ok = !!c.deviceId && !!c.relayId && netOk;
  const sameRelay = relays.find((r) => r.id === c.relayId);

  return (
    <div className="grid gap-6">
      <section className="grid gap-4 rounded-2xl border border-line p-5 sm:p-6">
        <h3 className="text-base font-medium">Caméra</h3>
        <div className="flex flex-wrap items-center gap-3">
          <button type="button" onClick={scan} className={c.deviceId ? btnGhost : btnPrimary}>
            {c.deviceId ? "Changer de caméra" : "Rechercher ma caméra"}
          </button>
          {c.deviceId && <span className="text-sm text-muted">{device?.name ?? c.deviceName}</span>}
          {scanError && <span className="text-sm text-muted">Recherche annulée.</span>}
        </div>
        <p className="text-xs leading-relaxed text-muted">Allume la caméra, active son Bluetooth. À la première connexion, valide la demande sur son écran.</p>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field id="cam-name" label="Nom">
            <input id="cam-name" value={c.name} onChange={(e) => set("name", e.target.value)} maxLength={40} placeholder="Osmo de Mathis" className={field} />
          </Field>
          <Field id="cam-model" label="Modèle">
            <select id="cam-model" value={c.model} onChange={(e) => set("model", e.target.value as DjiModel)} className={field}>
              {DJI_MODELS.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
          </Field>
        </div>
      </section>

      <section className="grid gap-4 rounded-2xl border border-line p-5 sm:p-6">
        <h3 className="text-base font-medium">Réseau de la caméra</h3>
        {networks.length > 0 && (
          <Field id="cam-net" label="Réseau enregistré">
            <select id="cam-net" value={creatingNet ? "" : c.networkId} onChange={(e) => set("networkId", e.target.value)} className={field}>
              {networks.map((n) => (
                <option key={n.id} value={n.id}>
                  {n.ssid} · {n.kind === "hotspot" ? "partage de connexion" : "Wi-Fi"}
                </option>
              ))}
              <option value="">Nouveau réseau…</option>
            </select>
          </Field>
        )}
        {creatingNet && (
          <div className="grid gap-4">
            <Pills label="Type de réseau" value={draft.kind} onChange={(v) => setDraft({ ...draft, kind: v })} options={[{ v: "hotspot", l: "Partage de connexion" }, { v: "wifi", l: "Wi-Fi" }]} />
            <div className="grid gap-4 sm:grid-cols-2">
              <Field id="net-ssid" label="Nom du réseau">
                <input id="net-ssid" value={draft.ssid} onChange={(e) => setDraft({ ...draft, ssid: e.target.value })} autoComplete="off" className={field} />
              </Field>
              <Field id="net-pass" label="Mot de passe">
                <input id="net-pass" type="password" value={draft.password} onChange={(e) => setDraft({ ...draft, password: e.target.value })} autoComplete="off" className={field} />
              </Field>
            </div>
            <label className="flex items-center gap-3 text-sm">
              <input type="checkbox" checked={draft.remember} onChange={(e) => setDraft({ ...draft, remember: e.target.checked })} className="h-4 w-4 accent-white" />
              Mémoriser le mot de passe sur ce téléphone (jamais envoyé à SYXTEE)
            </label>
          </div>
        )}
      </section>

      <section className="grid gap-5 rounded-2xl border border-line p-5 sm:p-6">
        <h3 className="text-base font-medium">Relais et qualité</h3>
        <Field id="cam-relay" label="Relais RTMP" hint="Un relais = un flux : deux caméras en même temps demandent deux relais RTMP.">
          <select id="cam-relay" value={c.relayId} onChange={(e) => set("relayId", e.target.value)} className={field}>
            {relays.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Résolution">
          <Pills label="Résolution" value={c.resolution} onChange={(v) => set("resolution", v)} options={[{ v: "720p", l: "720p" }, { v: "1080p", l: "1080p" }, { v: "480p", l: "480p" }]} />
        </Field>
        <Field label="Débit" hint="2 Mb/s tient sur une 4G moyenne.">
          <Pills label="Débit" value={c.bitrateKbps} onChange={(v) => set("bitrateKbps", v)} options={[1000, 2000, 3000, 4000, 6000, 8000].map((b) => ({ v: b, l: `${b / 1000} Mb/s` }))} />
        </Field>
        <Field label="Images par seconde">
          <Pills label="Images par seconde" value={c.fps} onChange={(v) => set("fps", v)} options={[{ v: 30, l: "30" }, { v: 25, l: "25" }]} />
        </Field>
        <Field label="Codec" hint={supportsCodecChoice(c.model) ? undefined : "Sur ce modèle, le codec se règle dans les réglages de la caméra : ce choix n'est pas envoyé."}>
          <Pills label="Codec" value={c.codec} onChange={(v) => set("codec", v)} options={[{ v: "h264", l: "H.264" }, { v: "h265", l: "H.265" }]} />
        </Field>
        {supportsStabilization(c.model) && (
          <Field label="Stabilisation">
            <Pills label="Stabilisation" value={c.stabilization} onChange={(v) => set("stabilization", v)} options={STABS} />
          </Field>
        )}
      </section>

      <div className="flex flex-wrap items-center gap-3">
        <button type="button" disabled={!ok || busy} onClick={() => submit(true)} className={btnPrimary}>
          Enregistrer et lancer le direct
        </button>
        <button type="button" disabled={!ok || busy} onClick={() => submit(false)} className={btnGhost}>
          Enregistrer
        </button>
        {onCancel && (
          <button type="button" onClick={onCancel} className="h-11 px-3 text-sm text-muted hover:text-foreground">
            Annuler
          </button>
        )}
        {!ok && <span className="text-xs text-muted">{!c.deviceId ? "Recherche d'abord ta caméra." : !netOk ? "Indique le réseau." : sameRelay ? "" : "Choisis un relais."}</span>}
      </div>
    </div>
  );
}

// ───────────── Hub ─────────────

const subscribeNoop = () => () => {};
const isIos = () => /iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);

export default function DjiHub({ relays, focusRelay }: { relays: RtmpRelay[]; focusRelay?: string }) {
  const env = useSyncExternalStore(subscribeNoop, () => (bluetoothSupported() ? "ok" : isIos() ? "ios" : "browser"), () => "ssr");
  const [store, setStore] = useState<DjiStore>({ cameras: [], networks: [] });
  const [loaded, setLoaded] = useState(false);
  const [tab, setTab] = useState<Tab>("cameras");
  const [editing, setEditing] = useState<string | null>(null);
  const [runs, setRuns] = useState<Record<string, CamRun>>({});
  const [busy, setBusy] = useState(false);
  const sessions = useRef(new Map<string, DjiSession>());
  const { state: live } = useLiveStatus();
  const liveRelays = live?.relays ?? [];

  useEffect(() => {
    const s = loadStore();
    // eslint-disable-next-line react-hooks/set-state-in-effect -- lecture unique du stockage local au montage
    setStore(s);
    setLoaded(true);
    if (!s.cameras.length) setTab("ajouter");
  }, []);

  // Page fermée : on lâche le Bluetooth SANS arrêter les lives (la caméra continue de diffuser).
  useEffect(() => {
    const all = sessions.current;
    return () => all.forEach((s) => s.release());
  }, []);

  const update = (next: DjiStore) => {
    setStore(next);
    saveStore(next);
  };

  async function launch(cam: Camera) {
    const relay = relays.find((r) => r.id === cam.relayId);
    const net = store.networks.find((n) => n.id === cam.networkId);
    if (!relay || !net) return;
    let password = net.password;
    if (!password && !net.remember) password = window.prompt(`Mot de passe du réseau « ${net.ssid} »`) ?? "";
    setBusy(true);
    try {
      let d = cam.deviceId ? await knownCamera(cam.deviceId) : null;
      if (!d) d = await pickCamera();
      if (d.id !== cam.deviceId) update({ ...store, cameras: store.cameras.map((c) => (c.id === cam.id ? { ...c, deviceId: d!.id, deviceName: d!.name ?? c.deviceName } : c)) });
      const session = new DjiSession(d, (u) => setRuns((r) => ({ ...r, [cam.id]: { state: u.state, error: u.error, battery: u.battery } })));
      sessions.current.set(cam.id, session);
      await session.start({ ...cam, ssid: net.ssid, password, rtmpUrl: relay.rtmpUrl });
    } catch (e) {
      if ((e as Error).name !== "NotFoundError") console.error("dji launch", e);
      setRuns((r) => ({ ...r, [cam.id]: { state: "error", error: "cancelled", battery: null } }));
    } finally {
      setBusy(false);
    }
  }

  function saveCamera(cam: Camera, go: boolean) {
    const exists = store.cameras.some((c) => c.id === cam.id);
    const next = { ...store, cameras: exists ? store.cameras.map((c) => (c.id === cam.id ? cam : c)) : [...store.cameras, cam] };
    update(next);
    setEditing(null);
    setTab("cameras");
    if (go) void launch(cam);
  }

  if (env === "ssr" || !loaded) return <div className="h-40" aria-hidden="true" />;

  const tabs: { id: Tab; label: string }[] = [
    { id: "cameras", label: `Mes caméras${store.cameras.length ? ` · ${store.cameras.length}` : ""}` },
    { id: "ajouter", label: "Ajouter" },
    { id: "reseaux", label: "Réseaux" },
    { id: "aide", label: "Aide" },
  ];
  const noBt = env !== "ok";
  const firstRelay = relays.find((r) => r.id === focusRelay)?.id ?? relays[0]?.id ?? "";

  return (
    <div>
      <LiveStats cameras={store.cameras} relays={relays} runs={runs} live={liveRelays} />

      {noBt && (
        <p className="mb-6 rounded-2xl border border-line p-5 text-sm leading-relaxed">
          {env === "ios"
            ? "Sur iPhone, Safari n'a pas accès au Bluetooth : utilise Moblin pour lancer ta DJI, ou l'app SYXTEE (bientôt). Les stats ci-dessus restent à jour."
            : "Ce navigateur n'a pas accès au Bluetooth : ouvre cette page dans Chrome (Android ou ordinateur) ou Edge."}
        </p>
      )}

      <div role="tablist" aria-label="Caméras DJI" className="mb-6 flex w-max max-w-full gap-1 overflow-x-auto rounded-full border border-line p-1">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={tab === t.id}
            onClick={() => {
              setTab(t.id);
              setEditing(null);
            }}
            className={`whitespace-nowrap rounded-full px-4 py-1.5 text-sm transition-colors ${tab === t.id ? "bg-white text-black" : "text-muted hover:text-foreground"}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "cameras" && (
        <div role="tabpanel" className="grid gap-4">
          {!store.cameras.length && (
            <div className="rounded-2xl border border-line p-6 text-sm">
              <p>Aucune caméra liée sur ce téléphone.</p>
              <button type="button" onClick={() => setTab("ajouter")} className={`${btnPrimary} mt-4`}>
                Ajouter une caméra
              </button>
            </div>
          )}
          {store.cameras.map((c) =>
            editing === c.id ? (
              <div key={c.id} className="rounded-2xl border border-white/30 p-5 sm:p-6">
                <CameraForm
                  initial={c}
                  relays={relays}
                  networks={store.networks}
                  busy={busy}
                  onSave={saveCamera}
                  onCancel={() => setEditing(null)}
                  onAddNetwork={(n) => update({ ...store, networks: [...store.networks, n] })}
                />
              </div>
            ) : (
              <CameraCard
                key={c.id}
                cam={c}
                relay={relays.find((r) => r.id === c.relayId)}
                net={store.networks.find((n) => n.id === c.networkId)}
                run={runs[c.id]}
                relayLive={!!liveRelays.find((r) => r.id === c.relayId)?.live}
                noBt={noBt}
                busy={busy}
                onLaunch={() => launch(c)}
                onStop={() => void sessions.current.get(c.id)?.stop()}
                onEdit={() => setEditing(c.id)}
                onRemove={() => {
                  if (!window.confirm(`Retirer « ${c.name} » de ce téléphone ? Le relais n'est pas supprimé.`)) return;
                  sessions.current.get(c.id)?.release();
                  sessions.current.delete(c.id);
                  update({ ...store, cameras: store.cameras.filter((x) => x.id !== c.id) });
                }}
              />
            ),
          )}
        </div>
      )}

      {tab === "ajouter" && (
        <div role="tabpanel">
          {relays.length === 0 ? (
            <div className="rounded-2xl border border-line p-6 text-sm">
              <p>Une caméra DJI diffuse en RTMP : crée d&apos;abord un relais RTMP.</p>
              <Link href="/dashboard/relais" className={`${btnPrimary} mt-4 inline-flex items-center`}>
                Créer un relais RTMP
              </Link>
            </div>
          ) : noBt ? (
            <p className="text-sm text-muted">Ajout impossible sans Bluetooth dans ce navigateur.</p>
          ) : (
            <CameraForm
              key={store.cameras.length}
              initial={defaultCamera(firstRelay, store.networks[0]?.id ?? "")}
              relays={relays}
              networks={store.networks}
              busy={busy}
              onSave={saveCamera}
              onAddNetwork={(n) => update({ ...store, networks: [...store.networks, n] })}
            />
          )}
        </div>
      )}

      {tab === "reseaux" && <Networks store={store} onChange={update} />}

      {tab === "aide" && (
        <div role="tabpanel" className="grid max-w-[65ch] gap-4 text-sm leading-relaxed">
          <p>Une fois le direct lancé, la caméra garde l&apos;URL RTMP et continue de diffuser même si tu fermes cette page ou verrouilles le téléphone : le Bluetooth ne sert qu&apos;à lancer, suivre la batterie et arrêter.</p>
          <p>Le partage de connexion doit rester actif : c&apos;est lui qui transporte le direct jusqu&apos;au relais.</p>
          <p>Deux caméras en même temps : deux relais RTMP (une clé = un flux). Les stats en haut de page viennent du relais, elles marchent aussi sur iPhone.</p>
          <p>
            <Link href="/docs/dji" className="underline underline-offset-4 hover:text-foreground">
              Guide et modèles compatibles
            </Link>
          </p>
        </div>
      )}
    </div>
  );
}

function CameraCard({
  cam,
  relay,
  net,
  run,
  relayLive,
  noBt,
  busy,
  onLaunch,
  onStop,
  onEdit,
  onRemove,
}: {
  cam: Camera;
  relay?: RtmpRelay;
  net?: Network;
  run?: CamRun;
  relayLive: boolean;
  noBt: boolean;
  busy: boolean;
  onLaunch: () => void;
  onStop: () => void;
  onEdit: () => void;
  onRemove: () => void;
}) {
  const state = run?.state ?? "idle";
  const working = !["idle", "error", "streaming", "detached"].includes(state);
  const onAir = state === "streaming" || state === "detached" || relayLive;
  return (
    <article className="rounded-2xl border border-line p-5 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <h3 className="truncate text-lg font-medium">{cam.name}</h3>
          <p className="mt-1 font-mono text-xs uppercase tracking-[0.12em] text-muted">
            {modelName(cam.model)} · {cam.resolution} · {cam.bitrateKbps / 1000} Mb/s · {cam.codec === "h265" ? "H.265" : "H.264"}
          </p>
          <p className="mt-2 text-sm text-muted">
            {relay ? `Relais ${relay.name}` : "Relais supprimé : modifie la caméra"} · {net ? net.ssid : "réseau à choisir"}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {onAir ? (
            <button type="button" onClick={onStop} disabled={noBt} className={btnDanger}>
              Arrêter le live
            </button>
          ) : (
            <button type="button" onClick={onLaunch} disabled={noBt || busy || working || !relay || !net} className={btnPrimary}>
              {working ? "…" : "Lancer le direct"}
            </button>
          )}
          <button type="button" onClick={onEdit} disabled={working} className={btnGhost}>
            Modifier
          </button>
          <button type="button" onClick={onRemove} aria-label={`Retirer ${cam.name}`} className="h-11 px-3 text-sm text-muted hover:text-foreground">
            Retirer
          </button>
        </div>
      </div>
      <p role="status" aria-live="polite" className="mt-4 flex items-center gap-2 text-sm">
        {onAir && <span className="h-2 w-2 rounded-full bg-live" aria-hidden="true" />}
        {relayLive && state === "idle" ? "En direct (lancé depuis un autre appareil ou avant l'ouverture de la page)" : STATE_LABEL[state]}
      </p>
      {run?.error && (
        <p role="alert" className="mt-2 text-sm text-red-400/90">
          {ERROR_LABEL[run.error]}
        </p>
      )}
    </article>
  );
}

function Networks({ store, onChange }: { store: DjiStore; onChange: (s: DjiStore) => void }) {
  const used = (id: string) => store.cameras.filter((c) => c.networkId === id).length;
  return (
    <div role="tabpanel" className="grid gap-3">
      {!store.networks.length && <p className="text-sm text-muted">Aucun réseau enregistré. Ajoute-en un en liant une caméra.</p>}
      {store.networks.map((n) => (
        <div key={n.id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-line px-5 py-4 text-sm">
          <span>
            <span className="font-medium">{n.ssid}</span>
            <span className="ml-3 font-mono text-xs uppercase tracking-[0.12em] text-muted">{n.kind === "hotspot" ? "Partage de connexion" : "Wi-Fi"}</span>
          </span>
          <span className="flex flex-wrap items-center gap-4">
            <label className="flex items-center gap-2 text-muted">
              <input
                type="checkbox"
                checked={n.remember}
                onChange={(e) => onChange({ ...store, networks: store.networks.map((x) => (x.id === n.id ? { ...x, remember: e.target.checked, password: e.target.checked ? x.password : "" } : x)) })}
                className="h-4 w-4 accent-white"
              />
              Mot de passe mémorisé
            </label>
            <button
              type="button"
              disabled={used(n.id) > 0}
              title={used(n.id) ? "Utilisé par une caméra" : undefined}
              onClick={() => onChange({ ...store, networks: store.networks.filter((x) => x.id !== n.id) })}
              className="text-muted hover:text-foreground disabled:opacity-40"
            >
              Supprimer
            </button>
          </span>
        </div>
      ))}
    </div>
  );
}
