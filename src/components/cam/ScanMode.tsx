"use client";

import { useEffect, useRef, useState } from "react";

// SYXTEE Cam, mode Scan (sans être en live) : toutes les 20 s (ou 1 min en « Économie de data »), un ping puis un
// court envoi de données vers le Core, qui mesure le débit montant, déduit l'opérateur de l'IP et garde le point
// (position GPS haute précision) si le consentement « carte communautaire » est coché. Tout est vérifié côté Core.

type Result = { accepted: boolean; reason: string | null; operator: string | null; up_kbps: number | null; bytes: number };

const REASONS: Record<string, string> = {
  no_consent: "Partage désactivé : rien n'est gardé.",
  accuracy: "Précision GPS insuffisante (plus de 50 m).",
  trim: "Début de session : les 300 premiers mètres ne sont jamais gardés.",
  private_zone: "Zone privée : rien n'est gardé ici.",
  speed: "Déplacement incohérent, point ignoré.",
};

const nf = new Intl.NumberFormat("fr-FR");
const mo = (b: number) => `${nf.format(Math.round((b / 1e6) * 10) / 10)} Mo`;

export default function ScanMode({ coreUrl, camKey, onClose }: { coreUrl: string; camKey: string; onClose: () => void }) {
  const [consent, setConsent] = useState<boolean | null>(null);
  const [operator, setOperator] = useState<string | null>(null);
  const [running, setRunning] = useState(false);
  const [eco, setEco] = useState(false);
  const [used, setUsed] = useState(0);
  const [kept, setKept] = useState(0);
  const [last, setLast] = useState<(Result & { rtt: number | null }) | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const pos = useRef<GeolocationPosition | null>(null);
  const size = useRef(256 * 1024);
  const auth = { Authorization: `Bearer ${camKey}` };

  useEffect(() => {
    fetch(`${coreUrl}/v1/cam/coverage`, { headers: auth })
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((j: { consent: boolean; operator: string | null }) => {
        setConsent(j.consent);
        setOperator(j.operator);
      })
      .catch(() => setStatus("Relais injoignable."));
    // eslint-disable-next-line react-hooks/exhaustive-deps -- une lecture à l'ouverture
  }, [coreUrl, camKey]);

  useEffect(() => {
    if (!running) return;
    let stopped = false;
    let wake: WakeLockSentinel | null = null;
    navigator.wakeLock?.request("screen").then((w) => (wake = w), () => {});
    const watch = navigator.geolocation.watchPosition(
      (p) => (pos.current = p),
      () => setStatus("Position refusée : autorise la localisation pour scanner."),
      { enableHighAccuracy: true, maximumAge: 5000 },
    );

    async function measure() {
      const p = pos.current;
      if (!p) return setStatus("En attente du GPS…");
      // Ping : meilleur de 3 allers-retours.
      let rtt: number | null = null;
      for (let i = 0; i < 3; i++) {
        const t0 = performance.now();
        const r = await fetch(`${coreUrl}/v1/cam/ping`, { cache: "no-store" }).catch(() => null);
        if (r?.ok) rtt = Math.min(rtt ?? Infinity, performance.now() - t0);
      }
      const body = new Uint8Array(size.current);
      const q = new URLSearchParams({
        lat: String(p.coords.latitude),
        lng: String(p.coords.longitude),
        acc: String(Math.round(p.coords.accuracy)),
        t: String(Math.round(p.timestamp)),
        ...(rtt !== null ? { rtt: String(Math.round(rtt)) } : {}),
      });
      const res = await fetch(`${coreUrl}/v1/cam/scan?${q}`, { method: "POST", headers: { ...auth, "Content-Type": "application/octet-stream" }, body });
      setUsed((u) => u + body.length + 3000);
      if (!res.ok) throw new Error(String(res.status));
      const j = (await res.json()) as Result;
      if (stopped) return;
      setLast({ ...j, rtt });
      if (j.operator) setOperator(j.operator);
      if (j.accepted) setKept((k) => k + 1);
      setStatus(j.reason ? (REASONS[j.reason] ?? "Point ignoré.") : null);
      // Envoi suivant calibré pour durer ~1,5 s (128 Ko à 3 Mo).
      if (j.up_kbps) size.current = Math.min(3 * 1024 * 1024, Math.max(128 * 1024, Math.round((j.up_kbps * 1000 * 1.5) / 8)));
    }

    const loop = async () => {
      while (!stopped) {
        try {
          await measure();
        } catch {
          if (!stopped) setStatus("Mesure impossible (réseau ou relais). Nouvel essai au prochain tour.");
        }
        await new Promise((r) => setTimeout(r, eco ? 60_000 : 20_000));
      }
    };
    const first = setTimeout(loop, 3000); // laisse le GPS se fixer
    return () => {
      stopped = true;
      clearTimeout(first);
      navigator.geolocation.clearWatch(watch);
      wake?.release().catch(() => {});
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- relancé seulement au démarrage / changement de rythme
  }, [running, eco, coreUrl, camKey]);

  return (
    <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/80 p-4" role="dialog" aria-label="Mode Scan">
      <div className="max-h-full w-full max-w-md overflow-y-auto rounded-2xl border border-white/10 bg-black p-5">
        <div className="flex items-center justify-between">
          <p className="font-mono text-xs tracking-[0.18em]">MODE SCAN</p>
          <button type="button" onClick={onClose} className="text-white/60" aria-label="Fermer">
            ✕
          </button>
        </div>
        <p className="mt-3 text-sm leading-relaxed text-white/60">Mesure le réseau là où tu es, sans être en live, pour la carte communautaire.</p>

        {consent === false ? (
          <p className="mt-5 rounded-xl border border-white/10 p-4 text-sm leading-relaxed text-white/80">
            Active d&apos;abord « Partager anonymement mes mesures » dans{" "}
            <a href="/dashboard/parametres#couverture" className="text-white underline underline-offset-4">
              Dashboard → Paramètres
            </a>
            . Sans ton accord, aucune mesure n&apos;est gardée.
          </p>
        ) : (
          <>
            <dl className="mt-5 grid grid-cols-2 gap-3 font-mono text-sm">
              <div>
                <dt className="text-xs text-white/50">Opérateur</dt>
                <dd>{operator ?? "–"}</dd>
              </div>
              <div>
                <dt className="text-xs text-white/50">Débit montant</dt>
                <dd>{last?.up_kbps ? `${nf.format(last.up_kbps)} kbit/s` : "–"}</dd>
              </div>
              <div>
                <dt className="text-xs text-white/50">Ping</dt>
                <dd>{last?.rtt != null ? `${nf.format(Math.round(last.rtt))} ms` : "–"}</dd>
              </div>
              <div>
                <dt className="text-xs text-white/50">Points gardés</dt>
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
                <span className="block text-xs text-white/50">Un test par minute au lieu de toutes les 20 s.</span>
              </span>
              <input type="checkbox" checked={eco} onChange={(e) => setEco(e.target.checked)} className="h-5 w-5 accent-white" />
            </label>
            {status && (
              <p className="mt-4 text-sm text-white/70" aria-live="polite">
                {status}
              </p>
            )}
            <button
              type="button"
              disabled={consent === null}
              onClick={() => setRunning((v) => !v)}
              className={`mt-5 h-12 w-full rounded-full text-sm font-medium transition-colors disabled:opacity-50 ${running ? "border border-white/20 text-white" : "bg-white text-black"}`}
            >
              {running ? "Arrêter le scan" : "Lancer le scan"}
            </button>
            <p className="mt-4 text-xs leading-relaxed text-white/50">
              Anonyme : ni ton nom ni ton compte dans les mesures. Rien dans tes zones privées, ni dans les 300 premiers et derniers mètres.
            </p>
          </>
        )}
      </div>
    </div>
  );
}
