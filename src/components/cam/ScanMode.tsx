"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { connType, isWifi, measurePoint, precisePosition, readNet as readCoreNet, REASONS, type LinkType, type NetInfo, type ScanResult } from "@/lib/scan/engine";

// SYXTEE Cam, mode Scan (sans être en live), pour la carte communautaire 4G/5G.
// Un point toutes les 20 s (1 min en « Économie de data ») : position GPS précise (≤ 20 m, attendue jusqu'à 10 s),
// puis 3 micro-tests (5 pings, envoi pendant 2 s, réception pendant 2 s) et la médiane. Le Core mesure le débit montant,
// déduit l'opérateur et le type de lien (Wi-Fi ou 4G/5G) ; une mesure en Wi-Fi n'est jamais comptée.
// iPhone (pas de navigator.connection.type) : on demande de couper le Wi-Fi, puis on vérifie que le réseau a changé.
// Mesures : moteur partagé avec l'Analyseur réseau (src/lib/scan/engine.ts).

const nf = new Intl.NumberFormat("fr-FR");
const mo = (b: number) => `${nf.format(Math.round((b / 1e6) * 10) / 10)} Mo`;
const mbps = (k: number | null | undefined) => (k ? `${nf.format(Math.round(k / 100) / 10)} Mbit/s` : "–");

export default function ScanMode({ coreUrl, camKey, onClose }: { coreUrl: string; camKey: string; onClose: () => void }) {
  const [net, setNet] = useState<NetInfo | null>(null);
  // Ouvert seulement sur action de l'utilisateur (jamais rendu côté serveur) : navigator est disponible.
  const [ct] = useState<string | null>(() => (typeof navigator === "undefined" ? null : connType()));
  const [step, setStep] = useState<"idle" | "wifi-off" | "checking" | "running">("idle");
  const [eco, setEco] = useState(false);
  const [used, setUsed] = useState(0);
  const [kept, setKept] = useState(0);
  const [link, setLink] = useState<LinkType | null>(null);
  const [last, setLast] = useState<ScanResult | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [phase, setPhase] = useState<string | null>(null);
  const pos = useRef<GeolocationPosition | null>(null);
  const from = useRef<string>(""); // réseau à l'ouverture de la page
  const cell = useRef<string>(""); // réseau vu après « Coupe le Wi-Fi » (iPhone)
  const client = useMemo(() => ({ coreUrl, auth: async () => ({ Authorization: `Bearer ${camKey}` }) }), [coreUrl, camKey]);
  const readNet = (params: Record<string, string>) => readCoreNet(client, params);

  // Réseau à l'ouverture (référence pour l'iPhone : on verra si l'IP change après « Coupe le Wi-Fi »).
  useEffect(() => {
    readNet(ct ? { ct } : {})
      .then((j) => {
        setNet(j);
        setLink(j.link_type);
        from.current = j.net;
      })
      .catch(() => setStatus("Relais injoignable."));
    // eslint-disable-next-line react-hooks/exhaustive-deps -- une lecture à l'ouverture
  }, [coreUrl, camKey]);

  function start() {
    setStatus(null);
    // Android : le téléphone dit lui-même s'il est en Wi-Fi. iPhone : on demande de couper le Wi-Fi.
    if (connType()) return setStep("running");
    setStep("wifi-off");
  }

  async function checkWifiOff() {
    setStep("checking");
    try {
      const j = await readNet({ from: from.current });
      cell.current = j.net;
      setLink(j.link_type);
      if (j.operator) setNet((n) => (n ? { ...n, operator: j.operator } : n));
    } catch {
      setStatus("Relais injoignable.");
    }
    setStep("running");
  }

  useEffect(() => {
    if (step !== "running") return;
    let stopped = false;
    let wake: WakeLockSentinel | null = null;
    navigator.wakeLock?.request("screen").then((w) => (wake = w), () => {});
    const watch = navigator.geolocation.watchPosition(
      (p) => (pos.current = p),
      () => setStatus("Position refusée : autorise la localisation pour scanner."),
      { enableHighAccuracy: true, maximumAge: 0 },
    );
    async function measure() {
      setPhase("Attente d'un GPS précis…");
      const p = await precisePosition(() => pos.current, () => stopped);
      if (stopped) return;
      if (!p) {
        setPhase(null);
        return setStatus(REASONS.accuracy);
      }
      const j = await measurePoint(client, {
        position: p,
        from: from.current,
        cell: cell.current,
        eco,
        stopped: () => stopped,
        onPhase: setPhase,
        onBytes: (b) => setUsed((u) => u + b),
      });
      if (!j || stopped) return;
      setPhase(null);
      setLast(j);
      setLink(j.link_type);
      if (j.operator) setNet((n) => (n ? { ...n, operator: j.operator } : n));
      if (j.counted) setKept((k) => k + 1);
      setStatus(j.reason ? (REASONS[j.reason] ?? "Point ignoré.") : null);
    }

    const loop = async () => {
      while (!stopped) {
        try {
          await measure();
        } catch {
          if (!stopped) setStatus("Mesure impossible (réseau ou relais). Nouvel essai au prochain tour.");
        }
        setPhase(null);
        await new Promise((r) => setTimeout(r, eco ? 60_000 : 20_000));
      }
    };
    void loop();
    return () => {
      stopped = true;
      navigator.geolocation.clearWatch(watch);
      wake?.release().catch(() => {});
    };
  }, [step, eco, client]);

  const running = step === "running";
  const wifiNow = isWifi(link) || ct === "wifi";

  return (
    <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/80 p-4" role="dialog" aria-label="Mode Scan">
      <div className="max-h-full w-full max-w-md overflow-y-auto rounded-2xl border border-white/10 bg-black p-5">
        <div className="flex items-center justify-between">
          <p className="font-mono text-xs tracking-[0.18em]">MODE SCAN</p>
          <button type="button" onClick={onClose} className="text-white/60" aria-label="Fermer">
            ✕
          </button>
        </div>

        {running && wifiNow && (
          <p role="alert" className="mt-4 rounded-xl bg-live px-4 py-3 text-sm font-medium text-white">
            Tu es en Wi-Fi : mesure non comptée. Coupe le Wi-Fi pour scanner la 4G/5G.
          </p>
        )}

        {step === "wifi-off" || step === "checking" ? (
          <div className="mt-5">
            <p className="text-lg font-medium leading-snug">Coupe le Wi-Fi pour scanner la 4G/5G</p>
            <p className="mt-3 text-sm leading-relaxed text-white/60">
              Réglages → Wi-Fi → désactivé (ou depuis le centre de contrôle). Une mesure faite en Wi-Fi mesure ta box, pas le réseau mobile : elle ne compte
              pas sur la carte.
            </p>
            <button
              type="button"
              disabled={step === "checking"}
              onClick={checkWifiOff}
              className="mt-5 h-12 w-full rounded-full bg-white text-sm font-medium text-black transition-colors hover:bg-neutral-200 disabled:opacity-60"
            >
              {step === "checking" ? "Vérification du réseau…" : "C'est fait, lancer le scan"}
            </button>
            <button type="button" onClick={() => setStep("idle")} className="mt-2 h-11 w-full text-sm text-white/60">
              Annuler
            </button>
          </div>
        ) : net?.consent === false ? (
          <p className="mt-5 rounded-xl border border-white/10 p-4 text-sm leading-relaxed text-white/80">
            Active d&apos;abord « Partager anonymement mes mesures » dans{" "}
            <a href="/dashboard/parametres#couverture" className="text-white underline underline-offset-4">
              Dashboard → Paramètres
            </a>
            . Sans ton accord, aucune mesure n&apos;est gardée.
          </p>
        ) : (
          <>
            <p className="mt-3 text-sm leading-relaxed text-white/60">Mesure le réseau 4G/5G là où tu es, sans être en live, pour la carte communautaire.</p>
            <dl className="mt-5 grid grid-cols-2 gap-3 font-mono text-sm">
              <div>
                <dt className="text-xs text-white/50">Opérateur</dt>
                <dd>{net?.operator ?? "–"}</dd>
              </div>
              <div>
                <dt className="text-xs text-white/50">Réseau</dt>
                <dd>{link === "cellular" ? "4G/5G" : isWifi(link) ? "Wi-Fi" : link === "starlink" ? "Starlink" : "–"}</dd>
              </div>
              <div>
                <dt className="text-xs text-white/50">Montant</dt>
                <dd>{mbps(last?.up_kbps)}</dd>
              </div>
              <div>
                <dt className="text-xs text-white/50">Descendant</dt>
                <dd>{mbps(last?.down_kbps)}</dd>
              </div>
              <div>
                <dt className="text-xs text-white/50">Ping</dt>
                <dd>{last?.rtt_ms != null ? `${nf.format(last.rtt_ms)} ms` : "–"}</dd>
              </div>
              <div>
                <dt className="text-xs text-white/50">Points comptés</dt>
                <dd>{nf.format(kept)}</dd>
              </div>
              <div className="col-span-2">
                <dt className="text-xs text-white/50">Data consommée par le scan</dt>
                <dd>{mo(used)}</dd>
              </div>
            </dl>
            <label className="mt-5 flex items-center justify-between gap-4 text-sm">
              <span>
                Économie de data
                <span className="block text-xs text-white/50">Un point par minute, tests plus courts.</span>
              </span>
              <input type="checkbox" checked={eco} onChange={(e) => setEco(e.target.checked)} className="h-5 w-5 accent-white" />
            </label>
            {(phase || status) && (
              <p className="mt-4 text-sm text-white/70" aria-live="polite">
                {phase ?? status}
              </p>
            )}
            <button
              type="button"
              disabled={!net}
              onClick={() => (running ? setStep("idle") : start())}
              className={`mt-5 h-12 w-full rounded-full text-sm font-medium transition-colors disabled:opacity-50 ${running ? "border border-white/20 text-white" : "bg-white text-black"}`}
            >
              {running ? "Arrêter le scan" : "Lancer le scan"}
            </button>
            <p className="mt-4 text-xs leading-relaxed text-white/50">
              Anonyme : ni ton nom ni ton compte dans les mesures. Rien dans tes zones privées ; la position exacte des 60 premières secondes n&apos;est jamais
              publiée. Le Wi-Fi ne compte jamais.
            </p>
          </>
        )}
      </div>
    </div>
  );
}
