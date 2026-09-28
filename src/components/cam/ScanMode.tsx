"use client";

import { useEffect, useRef, useState } from "react";

// SYXTEE Cam, mode Scan (sans être en live), pour la carte communautaire 4G/5G.
// Un point toutes les 20 s (1 min en « Économie de data ») : position GPS précise (≤ 20 m, attendue jusqu'à 10 s),
// puis 3 micro-tests (5 pings, envoi pendant 2 s, réception pendant 2 s) et la médiane. Le Core mesure le débit montant,
// déduit l'opérateur et le type de lien (Wi-Fi ou 4G/5G) ; une mesure en Wi-Fi n'est jamais comptée.
// iPhone (pas de navigator.connection.type) : on demande de couper le Wi-Fi, puis on vérifie que le réseau a changé.

type LinkType = "cellular" | "wifi" | "starlink" | "fixed" | "unknown";
type Result = {
  accepted: boolean;
  counted: boolean;
  reason: string | null;
  operator: string | null;
  link_type: LinkType;
  up_kbps: number | null;
  down_kbps: number | null;
  rtt_ms: number | null;
};
type Net = { consent: boolean; operator: string | null; link_type: LinkType; net: string };

const REASONS: Record<string, string> = {
  no_consent: "Partage désactivé : rien n'est gardé.",
  accuracy: "Précision GPS insuffisante (plus de 20 m) : point sauté.",
  private_zone: "Zone privée : rien n'est gardé ici.",
  speed: "Déplacement incohérent, point ignoré.",
  wifi: "Tu es en Wi-Fi : mesure non comptée.",
  starlink: "Starlink : compté dans la couche Starlink, pas dans la carte 4G/5G.",
  unknown_link: "Réseau non identifié : mesure non comptée sur la carte 4G/5G.",
};
const MICRO_TESTS = 3;
const WINDOW_MS = 2000;

const nf = new Intl.NumberFormat("fr-FR");
const mo = (b: number) => `${nf.format(Math.round((b / 1e6) * 10) / 10)} Mo`;
const mbps = (k: number | null | undefined) => (k ? `${nf.format(Math.round(k / 100) / 10)} Mbit/s` : "–");
const median = (xs: number[]) => {
  const s = [...xs].sort((a, b) => a - b);
  return s.length ? (s.length % 2 ? s[s.length >> 1] : (s[s.length / 2 - 1] + s[s.length / 2]) / 2) : null;
};
const connType = () => (navigator as Navigator & { connection?: { type?: string } }).connection?.type ?? null;
const isWifi = (t: LinkType | undefined) => t === "wifi" || t === "fixed";

export default function ScanMode({ coreUrl, camKey, onClose }: { coreUrl: string; camKey: string; onClose: () => void }) {
  const [net, setNet] = useState<Net | null>(null);
  // Ouvert seulement sur action de l'utilisateur (jamais rendu côté serveur) : navigator est disponible.
  const [ct] = useState<string | null>(() => (typeof navigator === "undefined" ? null : connType()));
  const [step, setStep] = useState<"idle" | "wifi-off" | "checking" | "running">("idle");
  const [eco, setEco] = useState(false);
  const [used, setUsed] = useState(0);
  const [kept, setKept] = useState(0);
  const [link, setLink] = useState<LinkType | null>(null);
  const [last, setLast] = useState<Result | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [phase, setPhase] = useState<string | null>(null);
  const pos = useRef<GeolocationPosition | null>(null);
  const from = useRef<string>(""); // réseau à l'ouverture de la page
  const cell = useRef<string>(""); // réseau vu après « Coupe le Wi-Fi » (iPhone)
  const auth = { Authorization: `Bearer ${camKey}` };

  async function readNet(params: Record<string, string>) {
    const r = await fetch(`${coreUrl}/v1/cam/coverage?${new URLSearchParams(params)}`, { headers: auth, cache: "no-store" });
    if (!r.ok) throw new Error(String(r.status));
    return (await r.json()) as Net;
  }

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
    const capUp = eco ? 1_000_000 : 3_000_000;
    const capDown = eco ? 2_000_000 : 6_000_000;

    /** Attend jusqu'à 10 s un point GPS récent et précis (≤ 20 m). */
    async function precisePosition() {
      const until = Date.now() + 10_000;
      while (!stopped && Date.now() < until) {
        const p = pos.current;
        if (p && p.coords.accuracy <= 20 && Date.now() - p.timestamp < 5000) return p;
        await new Promise((r) => setTimeout(r, 500));
      }
      return null;
    }

    async function ping() {
      const rtts: number[] = [];
      for (let i = 0; i < 5; i++) {
        const t0 = performance.now();
        const r = await fetch(`${coreUrl}/v1/cam/ping`, { cache: "no-store" }).catch(() => null);
        if (r?.ok) rtts.push(performance.now() - t0);
      }
      return median(rtts);
    }

    /** Envoi pendant 2 s : morceaux enchaînés, taille ajustée au débit (le Core mesure chaque morceau). */
    async function upload(test: string, i: number) {
      const t0 = performance.now();
      let sent = 0;
      let size = 128 * 1024;
      while (!stopped && performance.now() - t0 < WINDOW_MS && sent < capUp) {
        const body = new Uint8Array(Math.min(size, capUp - sent + 16 * 1024));
        const r = await fetch(`${coreUrl}/v1/cam/scan/up?test=${test}&i=${i}`, { method: "POST", headers: { ...auth, "Content-Type": "application/octet-stream" }, body });
        sent += body.length + 500;
        if (!r.ok) throw new Error(String(r.status));
        const { kbps } = (await r.json()) as { kbps: number | null };
        if (kbps) size = Math.min(2 * 1024 * 1024, Math.max(64 * 1024, Math.round((kbps * 1000 * 0.5) / 8)));
      }
      return sent;
    }

    /** Réception pendant 2 s : débit calculé ici, du premier au dernier octet. */
    async function download() {
      const r = await fetch(`${coreUrl}/v1/cam/scan/down?ms=${WINDOW_MS}&max=${capDown}`, { headers: auth, cache: "no-store" });
      if (!r.ok || !r.body) throw new Error(String(r.status));
      const reader = r.body.getReader();
      let bytes = 0;
      let t0 = 0;
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        if (!t0) t0 = performance.now();
        else bytes += value.length; // le premier morceau démarre le chrono
      }
      const ms = performance.now() - t0;
      return { bytes, kbps: t0 && ms > 50 && bytes > 0 ? (bytes * 8) / ms : null };
    }

    async function measure() {
      setPhase("Attente d'un GPS précis…");
      const p = await precisePosition();
      if (stopped) return;
      if (!p) {
        setPhase(null);
        return setStatus(REASONS.accuracy);
      }
      const test = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
      const downs: number[] = [];
      const rtts: number[] = [];
      for (let i = 0; i < MICRO_TESTS && !stopped; i++) {
        setPhase(`Micro-test ${i + 1}/${MICRO_TESTS}`);
        const rtt = await ping();
        if (rtt !== null) rtts.push(rtt);
        const sent = await upload(test, i);
        const d = await download();
        setUsed((u) => u + sent + d.bytes + 5 * 400);
        if (d.kbps) downs.push(d.kbps);
      }
      if (stopped) return;
      setPhase(null);
      const t = connType();
      const res = await fetch(`${coreUrl}/v1/cam/scan`, {
        method: "POST",
        headers: { ...auth, "Content-Type": "application/json" },
        body: JSON.stringify({
          test,
          lat: p.coords.latitude,
          lng: p.coords.longitude,
          acc: Math.round(p.coords.accuracy),
          speed: p.coords.speed,
          t: Math.round(p.timestamp),
          ct: t,
          from: t ? null : from.current,
          cell: t ? null : cell.current,
          down_kbps: downs.map(Math.round),
          rtt_ms: rtts.map(Math.round),
        }),
      });
      if (!res.ok) throw new Error(String(res.status));
      const j = (await res.json()) as Result;
      if (stopped) return;
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
    // eslint-disable-next-line react-hooks/exhaustive-deps -- relancé seulement au démarrage / changement de rythme
  }, [step, eco, coreUrl, camKey]);

  const running = step === "running";
  const wifiNow = isWifi(link ?? undefined) || ct === "wifi";

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
                <dd>{link === "cellular" ? "4G/5G" : isWifi(link ?? undefined) ? "Wi-Fi" : link === "starlink" ? "Starlink" : "–"}</dd>
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
