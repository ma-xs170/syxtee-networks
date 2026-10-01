"use client";

import Link from "next/link";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { useLiveStatus, useNow, type RelayLive } from "@/components/dashboard/LiveStatus";
import { DJI_MODELS, type DjiModel } from "@/lib/dji/protocol";
import { bluetoothSupported, DjiSession, knownCamera, pickCamera, type DjiError, type DjiState } from "@/lib/dji/session";
import CameraWizard from "./CameraWizard";
import NetworkDialog from "./NetworkDialog";
import { loadStore, saveStore, type Camera, type DjiStore, type Network } from "./store";

// Caméras DJI : autant de caméras que tu veux, chacune liée à un relais RTMP. Stats en direct en haut, puis onglets.
// Une fois le live lancé, la caméra garde l'URL RTMP et continue de diffuser même page fermée (le Bluetooth ne sert
// qu'à lancer, suivre la batterie et arrêter). Tout reste sur ce téléphone : rien du Wi-Fi n'est envoyé au serveur.

export type RtmpRelay = { id: string; name: string; rtmpUrl: string };
type Tab = "cameras" | "reseaux" | "aide";
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
const modelName = (m: DjiModel) => DJI_MODELS.find((x) => x.id === m)?.name ?? "Caméra DJI";

const btnPrimary = "h-11 whitespace-nowrap rounded-full bg-white px-5 text-sm font-medium text-black transition-colors hover:bg-neutral-200 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40";
const btnGhost = "h-11 whitespace-nowrap rounded-full border border-line px-5 text-sm transition-colors hover:bg-white/5 disabled:opacity-40";
const btnDanger = "h-11 whitespace-nowrap rounded-full border border-red-400/40 px-5 text-sm text-red-300 transition-colors hover:bg-red-400/10";

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
            {on ? (
              <dl className="mt-4 grid grid-cols-3 gap-2 font-mono text-xs">
                <div>
                  <dt className="text-muted">Débit</dt>
                  <dd className="mt-1 text-sm tabular-nums">{r?.kbps ? `${(r.kbps / 1000).toFixed(1)} Mb/s` : "…"}</dd>
                </div>
                <div>
                  <dt className="text-muted">Durée</dt>
                  <dd className="mt-1 text-sm tabular-nums">{r?.started_at ? fmtDuration(now - r.started_at) : "…"}</dd>
                </div>
                <div>
                  <dt className="text-muted">Batterie</dt>
                  <dd className="mt-1 text-sm tabular-nums">{run?.battery != null ? `${run.battery} %` : "…"}</dd>
                </div>
              </dl>
            ) : (
              <p className="mt-4 text-xs text-muted">Débit, durée et batterie s&apos;affichent pendant le direct.</p>
            )}
            {on && r && r.reconnects > 0 && <p className="mt-3 text-xs text-muted">{r.reconnects} reconnexion{r.reconnects > 1 ? "s" : ""} pendant ce live</p>}
          </div>
        );
      })}
    </section>
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
  // Assistant caméra : null = fermé, "new" = ajout, sinon id de la caméra modifiée.
  const [wizard, setWizard] = useState<string | null>(null);
  // Fenêtre réseau : null = fermée, "new" = ajout, sinon id du réseau modifié.
  const [netDialog, setNetDialog] = useState<string | null>(null);
  // Numéro d'ouverture des fenêtres : nouvelle `key` = formulaire neuf à chaque ouverture.
  const [opens, setOpens] = useState(0);
  const openWizard = (id: string) => (setOpens((k) => k + 1), setWizard(id));
  const openNet = (id: string) => (setOpens((k) => k + 1), setNetDialog(id));
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
    // Arrivée depuis la fiche d'un relais (?relais=) sans caméra liée à ce relais : on ouvre directement l'ajout.
    if (focusRelay && !s.cameras.some((c) => c.relayId === focusRelay)) openWizard("new");
  }, [focusRelay]);

  // Page fermée : on lâche le Bluetooth SANS arrêter les lives (la caméra continue de diffuser).
  useEffect(() => {
    const all = sessions.current;
    return () => all.forEach((s) => s.release());
  }, []);

  const update = (next: DjiStore) => {
    setStore(next);
    saveStore(next);
  };

  async function launch(cam: Camera, networks = store.networks, cameras = store.cameras) {
    const relay = relays.find((r) => r.id === cam.relayId);
    const net = networks.find((n) => n.id === cam.networkId);
    if (!relay || !net) return;
    let password = net.password;
    if (!password && !net.remember) password = window.prompt(`Mot de passe du réseau « ${net.ssid} »`) ?? "";
    setBusy(true);
    try {
      let d = cam.deviceId ? await knownCamera(cam.deviceId) : null;
      if (!d) d = await pickCamera();
      if (d.id !== cam.deviceId) update({ networks, cameras: cameras.map((c) => (c.id === cam.id ? { ...c, deviceId: d!.id, deviceName: d!.name ?? c.deviceName } : c)) });
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
    setWizard(null);
    setTab("cameras");
    if (go) void launch(cam, next.networks, next.cameras);
  }

  function saveNetwork(n: Network) {
    const exists = store.networks.some((x) => x.id === n.id);
    update({ ...store, networks: exists ? store.networks.map((x) => (x.id === n.id ? n : x)) : [...store.networks, n] });
    setNetDialog(null);
  }

  if (env === "ssr" || !loaded) return <div className="h-40" aria-hidden="true" />;

  const tabs: { id: Tab; label: string }[] = [
    { id: "cameras", label: `Mes caméras · ${store.cameras.length}` },
    { id: "reseaux", label: `Réseaux · ${store.networks.length}` },
    { id: "aide", label: "Aide" },
  ];
  const noBt = env !== "ok";
  const defaultRelay = relays.find((r) => r.id === focusRelay)?.id ?? relays.find((r) => !store.cameras.some((c) => c.relayId === r.id))?.id ?? relays[0]?.id ?? "";
  const wizardRelays = relays.map((r) => ({ id: r.id, name: r.name, usedBy: store.cameras.find((c) => c.relayId === r.id)?.name ?? null, live: !!liveRelays.find((x) => x.id === r.id)?.live }));
  const editingCam = wizard && wizard !== "new" ? (store.cameras.find((c) => c.id === wizard) ?? null) : null;
  const editingNet = netDialog && netDialog !== "new" ? (store.networks.find((n) => n.id === netDialog) ?? null) : null;

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

      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div role="tablist" aria-label="Caméras DJI" className="flex w-max max-w-full gap-1 overflow-x-auto rounded-full border border-line p-1">
          {tabs.map((t) => (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={tab === t.id}
              onClick={() => setTab(t.id)}
              className={`whitespace-nowrap rounded-full px-4 py-1.5 text-sm transition-colors ${tab === t.id ? "bg-white text-black" : "text-muted hover:text-foreground"}`}
            >
              {t.label}
            </button>
          ))}
        </div>
        {tab === "reseaux" ? (
          <button type="button" onClick={() => openNet("new")} className={btnPrimary}>
            Ajouter un réseau
          </button>
        ) : (
          <button type="button" onClick={() => openWizard("new")} disabled={noBt || relays.length === 0} className={btnPrimary}>
            Ajouter une caméra
          </button>
        )}
      </div>

      {tab === "cameras" && (
        <div role="tabpanel" className="grid gap-4">
          {relays.length === 0 && (
            <div className="rounded-2xl border border-line p-6 text-sm">
              <p>Une caméra DJI diffuse en RTMP : crée d&apos;abord un relais RTMP (un par caméra).</p>
              <Link href="/dashboard/relais" className={`${btnGhost} mt-4 inline-flex items-center`}>
                Créer un relais RTMP
              </Link>
            </div>
          )}
          {relays.length > 0 && !store.cameras.length && (
            <div className="rounded-2xl border border-dashed border-white/25 p-6 text-sm">
              <p className="text-base">Aucune caméra liée sur ce téléphone.</p>
              <p className="mt-1 text-muted">Ajoute ta première DJI : recherche Bluetooth, réseau, relais, qualité.</p>
            </div>
          )}
          {store.cameras.map((c) => (
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
              onEdit={() => openWizard(c.id)}
              onRemove={() => {
                if (!window.confirm(`Retirer « ${c.name} » de ce téléphone ? Le relais n'est pas supprimé.`)) return;
                sessions.current.get(c.id)?.release();
                sessions.current.delete(c.id);
                update({ ...store, cameras: store.cameras.filter((x) => x.id !== c.id) });
              }}
            />
          ))}
        </div>
      )}

      {tab === "reseaux" && <Networks store={store} onEdit={(id) => openNet(id)} onChange={update} />}

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

      {wizard !== null && (
      <CameraWizard
        key={`cam-${opens}`}
        open
        initial={editingCam}
        relays={wizardRelays}
        networks={store.networks}
        defaultRelay={defaultRelay}
        onClose={() => setWizard(null)}
        onSave={saveCamera}
        onAddNetwork={(n) => update({ ...store, networks: [...store.networks, n] })}
      />
      )}
      {netDialog !== null && <NetworkDialog key={`net-${opens}`} open initial={editingNet} onClose={() => setNetDialog(null)} onSave={saveNetwork} />}
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

function Networks({ store, onEdit, onChange }: { store: DjiStore; onEdit: (id: string) => void; onChange: (s: DjiStore) => void }) {
  const users = (id: string) => store.cameras.filter((c) => c.networkId === id).map((c) => c.name);
  return (
    <div role="tabpanel" className="grid gap-3 md:grid-cols-2">
      {!store.networks.length && (
        <div className="rounded-2xl border border-dashed border-white/25 p-6 text-sm md:col-span-2">
          <p className="text-base">Aucun réseau enregistré.</p>
          <p className="mt-1 text-muted">Ajoute le partage de connexion de ton téléphone, ton routeur 4G ou un Wi-Fi : chaque caméra choisit le sien.</p>
        </div>
      )}
      {store.networks.map((n) => {
        const used = users(n.id);
        return (
          <article key={n.id} className="flex flex-col rounded-2xl border border-line p-5">
            <p className="flex items-start justify-between gap-3">
              <span className="min-w-0">
                <span className="block truncate text-base font-medium">{n.ssid}</span>
                <span className="mt-1 block font-mono text-[11px] uppercase tracking-[0.12em] text-muted">{n.kind === "hotspot" ? "Partage de connexion" : "Wi-Fi"}</span>
              </span>
            </p>
            <p className="mt-3 text-xs text-muted">
              {n.remember ? "Mot de passe mémorisé sur ce téléphone" : "Mot de passe demandé au lancement"}
              {used.length ? ` · utilisé par ${used.join(", ")}` : ""}
            </p>
            <div className="mt-5 flex gap-2">
              <button type="button" onClick={() => onEdit(n.id)} className={btnGhost}>
                Modifier
              </button>
              <button
                type="button"
                disabled={used.length > 0}
                title={used.length ? "Utilisé par une caméra : change d'abord son réseau" : undefined}
                onClick={() => window.confirm(`Supprimer le réseau « ${n.ssid} » ?`) && onChange({ ...store, networks: store.networks.filter((x) => x.id !== n.id) })}
                className="h-11 px-3 text-sm text-muted hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40"
              >
                Supprimer
              </button>
            </div>
          </article>
        );
      })}
    </div>
  );
}
