"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { connType, isWifi, measurePoint, precisePosition, readNet, REASONS, type LinkType, type NetInfo, type Point, type ScanClient } from "@/lib/scan/engine";
import { createClient } from "@/lib/supabase/client";

// Analyseur réseau : même moteur que le mode Scan de SYXTEE Cam (src/lib/scan/engine.ts).
// - public (/analyseur) : un test à la fois, sans compte, rien n'est gardé (le Core plafonne le volume par IP) ;
// - compte (/dashboard/analyseur) : test ou scan continu, gardé sur la carte si le partage est activé.
// Historique des tests : sur cet appareil seulement (les mesures de la carte ne sont jamais liées au compte).

type Zone = { score: "bonne" | "moyenne" | "mauvaise" | "inconnue" | null; best: { operator: string; tech: string; median_kbps: number | null } | null };
type Entry = { t: number; operator: string | null; link: LinkType; up: number | null; down: number | null; rtt: number | null; jitter: number | null; loss: number | null; counted: boolean };

const HISTORY = "syxtee:scan-history";
const nf = new Intl.NumberFormat("fr-FR");
const mbps = (k: number | null | undefined) => (k ? `${nf.format(Math.round(k / 100) / 10)} Mbit/s` : "–");
const ms = (v: number | null | undefined) => (v != null ? `${nf.format(Math.round(v))} ms` : "–");
const linkLabel = (l: LinkType | null) => (l === "cellular" ? "4G/5G" : isWifi(l) ? "Wi-Fi" : l === "starlink" ? "Starlink" : "Inconnu");
const ZONE = { bonne: "Bonne", moyenne: "Moyenne", mauvaise: "Mauvaise", inconnue: "Inconnue" } as const;

const history = {
  read(): Entry[] {
    try {
      return JSON.parse(localStorage.getItem(HISTORY) ?? "[]") as Entry[];
    } catch {
      return [];
    }
  },
  write(list: Entry[]) {
    try {
      localStorage.setItem(HISTORY, JSON.stringify(list.slice(0, 50)));
    } catch {
      // stockage indisponible (navigation privée) : historique de la session seulement
    }
  },
};

function Figure({ label, value, big = false }: { label: string; value: string; big?: boolean }) {
  return (
    <div className="min-w-0">
      <dt className="font-mono text-[11px] uppercase tracking-[0.14em] text-muted">{label}</dt>
      <dd className={`mt-1 truncate font-mono tabular-nums ${big ? "text-2xl sm:text-3xl" : "text-base"}`}>{value}</dd>
    </div>
  );
}

export default function Analyzer({
  coreUrl,
  account = false,
  totals,
}: {
  coreUrl: string;
  /** Connecté : jeton de session envoyé au Core, scan continu et points gardés (avec consentement). */
  account?: boolean;
  /** Mesures 4G/5G déjà comptées pour ce compte (90 jours). */
  totals?: { measurements: number; hexes: number };
}) {
  const client: ScanClient = useMemo(
    () => ({
      coreUrl,
      auth: async (): Promise<Record<string, string>> => {
        if (!account) return {};
        const { data } = await createClient().auth.getSession();
        const token = data.session?.access_token;
        return token ? { Authorization: `Bearer ${token}` } : {};
      },
    }),
    [coreUrl, account],
  );
  const [net, setNet] = useState<NetInfo | null>(null);
  const [link, setLink] = useState<LinkType | null>(null);
  const [down, setDown] = useState(false);
  const [pos, setPos] = useState<GeolocationPosition | null>(null);
  const [zone, setZone] = useState<Zone | null>(null);
  const [last, setLast] = useState<Point | null>(null);
  const [mode, setMode] = useState<"idle" | "once" | "continuous">("idle");
  const [phase, setPhase] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [kept, setKept] = useState(0);
  const [used, setUsed] = useState(0);
  const [entries, setEntries] = useState<Entry[]>(history.read);
  // Composant chargé côté navigateur seulement (AnalyzerClient) : navigator et localStorage sont disponibles.
  const [ct] = useState<string | null>(connType);
  const posRef = useRef<GeolocationPosition | null>(null);
  const from = useRef<string>("");
  const cell = useRef<string | null>(null);


  // Réseau vu par le serveur à l'ouverture (opérateur, Wi-Fi ou mobile) et, connecté, le consentement.
  useEffect(() => {
    readNet(client, ct ? { ct } : {})
      .then((j) => {
        setNet(j);
        setLink(j.link_type);
        from.current = j.net;
      })
      .catch(() => setDown(true));
  }, [client, ct]);

  // Note de la zone et meilleur opérateur connu ici (carte communautaire).
  const lastZoneAt = useRef<string>("");
  useEffect(() => {
    if (!pos) return;
    const key = `${pos.coords.latitude.toFixed(3)},${pos.coords.longitude.toFixed(3)}`;
    if (key === lastZoneAt.current) return;
    lastZoneAt.current = key;
    fetch(`/api/coverage/at?lat=${pos.coords.latitude.toFixed(5)}&lng=${pos.coords.longitude.toFixed(5)}`)
      .then((r) => (r.ok ? (r.json() as Promise<Zone>) : null))
      .then((z) => z && setZone(z))
      .catch(() => {});
  }, [pos]);

  // GPS pendant un test (demandé seulement au lancement).
  useEffect(() => {
    if (mode === "idle" || !navigator.geolocation) return;
    const watch = navigator.geolocation.watchPosition(
      (p) => {
        posRef.current = p;
        setPos(p);
      },
      () => setStatus("Position refusée : le test continue, sans note de zone ni point sur la carte."),
      { enableHighAccuracy: true, maximumAge: 0 },
    );
    return () => navigator.geolocation.clearWatch(watch);
  }, [mode]);

  const record = useCallback((p: Point) => {
    const e: Entry = { t: Date.now(), operator: p.operator, link: p.link_type, up: p.up_kbps, down: p.down_kbps, rtt: p.rtt_ms, jitter: p.jitter_ms, loss: p.loss_pct, counted: p.counted };
    setEntries((list) => {
      const next = [e, ...list].slice(0, 50);
      history.write(next);
      return next;
    });
  }, []);

  // Boucle de mesure : un point (test) ou un point toutes les 20 s (scan continu).
  useEffect(() => {
    if (mode === "idle") return;
    let stopped = false;
    let wake: WakeLockSentinel | null = null;
    if (mode === "continuous") navigator.wakeLock?.request("screen").then((w) => (wake = w), () => {});
    const run = async () => {
      do {
        try {
          setStatus(null);
          setPhase("Recherche d'une position GPS précise…");
          // Compte : position précise obligatoire pour la carte. Public : 5 s au plus, puis test sans GPS.
          const p = await precisePosition(() => posRef.current, () => stopped, 20, account ? 10_000 : 5_000);
          if (stopped) break;
          if (account && !p) {
            setStatus(REASONS.accuracy);
          } else {
            const r = await measurePoint(client, {
              position: p,
              from: from.current,
              cell: cell.current,
              stopped: () => stopped,
              onPhase: setPhase,
              onBytes: (b) => setUsed((u) => u + b),
            });
            if (!r || stopped) break;
            setLast(r);
            setLink(r.link_type);
            if (r.operator) setNet((n) => (n ? { ...n, operator: r.operator } : n));
            if (r.counted) setKept((k) => k + 1);
            setStatus(r.reason ? (REASONS[r.reason] ?? "Point ignoré.") : "Point ajouté à la carte communautaire.");
            record(r);
          }
        } catch (e) {
          const code = (e as { status?: number }).status;
          if (!stopped)
            setStatus(code === 429 ? "Limite de tests sans compte atteinte pour cette heure. Connecte-toi pour continuer." : "Mesure impossible (réseau ou serveur). Réessaie.");
          if (code === 429) break;
        }
        setPhase(null);
        if (mode !== "continuous") break;
        await new Promise((r) => setTimeout(r, 20_000));
      } while (!stopped);
      if (!stopped) setMode("idle");
    };
    void run();
    return () => {
      stopped = true;
      wake?.release().catch(() => {});
      setPhase(null);
    };
  }, [mode, client, account, record]);

  // iPhone (pas de navigator.connection.type) : après « Coupe le Wi-Fi », on vérifie que le réseau a changé.
  async function wifiOff() {
    try {
      const j = await readNet(client, { from: from.current });
      cell.current = j.net;
      setLink(j.link_type);
      if (j.operator) setNet((n) => (n ? { ...n, operator: j.operator } : n));
    } catch {
      setStatus("Serveur injoignable.");
    }
  }

  const busy = mode !== "idle";
  const consent = net?.consent === true;
  const wifi = isWifi(link) || ct === "wifi";
  const score = zone?.score ?? null;
  const best = zone?.best;

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <section className="rounded-2xl border border-line bg-black p-5 sm:p-6 lg:col-span-2" aria-labelledby="an-live">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 id="an-live" className="font-mono text-xs uppercase tracking-[0.15em]">
            Mesure en direct
          </h2>
          <p className="font-mono text-xs text-muted" aria-live="polite">
            {phase ?? (busy ? "…" : last ? "Dernier test" : "Prêt")}
          </p>
        </div>
        {down ? (
          <p className="mt-5 text-sm text-muted">Le serveur de mesure ne répond pas. Réessaie dans quelques minutes.</p>
        ) : (
          <>
            <dl className="mt-6 grid grid-cols-2 gap-x-6 gap-y-6 sm:grid-cols-3">
              <Figure label="Montant" value={mbps(last?.up_kbps)} big />
              <Figure label="Descendant" value={mbps(last?.down_kbps)} big />
              <Figure label="RTT" value={ms(last?.rtt_ms)} big />
              <Figure label="Gigue" value={ms(last?.jitter_ms)} />
              <Figure label="Pertes" value={last?.loss_pct != null ? `${nf.format(last.loss_pct)} %` : "–"} />
              <Figure label="Opérateur" value={net?.operator ?? "–"} />
              <Figure label="Réseau" value={net ? linkLabel(link) : "–"} />
              <Figure label="Position" value={pos ? `${pos.coords.latitude.toFixed(4)}, ${pos.coords.longitude.toFixed(4)} ±${Math.round(pos.coords.accuracy)} m` : "–"} />
              <Figure label="Data du test" value={used ? `${nf.format(Math.round(used / 1e5) / 10)} Mo` : "–"} />
            </dl>

            {wifi && (
              <div className="mt-6 rounded-xl border border-line p-4 text-sm leading-relaxed">
                <p>Tu es en Wi-Fi : le test mesure ta box, pas le réseau mobile. Coupe le Wi-Fi pour mesurer la 4G/5G.</p>
                {!ct && (
                  <button type="button" onClick={wifiOff} disabled={busy} className="mt-3 h-10 rounded-full border border-line px-4 text-sm transition-colors hover:bg-white/5 disabled:opacity-50">
                    C&apos;est fait, vérifier le réseau
                  </button>
                )}
              </div>
            )}

            {status && (
              <p className="mt-5 text-sm text-muted" role="status">
                {status}
              </p>
            )}

            <div className="mt-6 flex flex-wrap gap-3">
              <button
                type="button"
                disabled={!net || (busy && mode !== "once")}
                onClick={() => setMode(mode === "once" ? "idle" : "once")}
                className="h-11 whitespace-nowrap rounded-full bg-white px-5 text-sm font-medium text-black transition-colors hover:bg-neutral-200 active:scale-[0.98] disabled:opacity-50"
              >
                {mode === "once" ? "Arrêter le test" : "Lancer un test"}
              </button>
              {account ? (
                <button
                  type="button"
                  disabled={!net || !consent || (busy && mode !== "continuous")}
                  onClick={() => setMode(mode === "continuous" ? "idle" : "continuous")}
                  className="h-11 whitespace-nowrap rounded-full border border-line px-5 text-sm font-medium transition-colors hover:bg-white/5 disabled:opacity-50"
                >
                  {mode === "continuous" ? "Arrêter le scan" : "Scanner en continu"}
                </button>
              ) : (
                <Link href="/connexion?next=/dashboard/analyseur" className="inline-flex h-11 items-center whitespace-nowrap rounded-full border border-line px-5 text-sm font-medium transition-colors hover:bg-white/5">
                  Scanner en continu
                </Link>
              )}
            </div>
            {account && net && !consent && (
              <p className="mt-3 text-xs leading-relaxed text-muted">
                Le scan continu alimente la carte communautaire : active d&apos;abord le partage dans{" "}
                <Link href="/dashboard/parametres#couverture" className="text-foreground underline underline-offset-4">
                  Paramètres
                </Link>
                .
              </p>
            )}
            {!account && <p className="mt-3 text-xs leading-relaxed text-muted">Sans compte : résultats affichés, rien n&apos;est gardé. Le scan continu demande un compte.</p>}
          </>
        )}
      </section>

      <div className="grid gap-4">
        <section className="rounded-2xl border border-line bg-black p-5 sm:p-6" aria-labelledby="an-zone">
          <h2 id="an-zone" className="font-mono text-xs uppercase tracking-[0.15em]">
            Ta zone
          </h2>
          <p className="mt-4 text-2xl font-semibold tracking-tight">{pos ? (score ? ZONE[score] : "Inconnue") : "–"}</p>
          <p className="mt-2 text-sm leading-relaxed text-muted">
            {!pos
              ? "Lance un test pour voir la note de la zone où tu es."
              : best
                ? `Meilleur réseau connu ici : ${best.operator}${best.tech !== "inconnu" ? ` ${best.tech.toUpperCase()}` : ""}${best.median_kbps ? `, ~${nf.format(Math.round(best.median_kbps / 1000))} Mbit/s en montant` : ""}.`
                : "Personne n'a encore mesuré cette zone. Ton scan peut la découvrir."}
          </p>
          <Link href="/couverture" className="mt-4 inline-block text-sm text-muted underline underline-offset-4 hover:text-foreground">
            Voir la carte
          </Link>
        </section>

        <section className="rounded-2xl border border-line bg-black p-5 sm:p-6" aria-labelledby="an-points">
          <h2 id="an-points" className="font-mono text-xs uppercase tracking-[0.15em]">
            Scanne ta zone
          </h2>
          {account ? (
            <>
              <p className="mt-4 font-mono text-3xl tabular-nums">{nf.format((totals?.measurements ?? 0) + kept)}</p>
              <p className="mt-1 text-sm text-muted">
                mesures 4G/5G comptées{kept ? `, dont ${nf.format(kept)} pendant cette session` : ""} · {nf.format(totals?.hexes ?? 0)} zones
              </p>
              <p className="mt-4 text-xs leading-relaxed text-muted">Programme de points (1 mois de relais offert) : bientôt.</p>
              <Link href="/dashboard/contributions" className="mt-3 inline-block text-sm text-muted underline underline-offset-4 hover:text-foreground">
                Mes contributions
              </Link>
            </>
          ) : (
            <p className="mt-4 text-sm leading-relaxed text-muted">
              Avec un compte, tes scans 4G/5G font avancer la carte communautaire.{" "}
              <Link href="/inscription" className="text-foreground underline underline-offset-4">
                Créer un compte
              </Link>
            </p>
          )}
        </section>
      </div>

      <section className="rounded-2xl border border-line bg-black p-5 sm:p-6 lg:col-span-3" aria-labelledby="an-history">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 id="an-history" className="font-mono text-xs uppercase tracking-[0.15em]">
            Historique de mes tests
          </h2>
          {entries.length > 0 && (
            <button
              type="button"
              onClick={() => {
                setEntries([]);
                history.write([]);
              }}
              className="text-xs text-muted underline-offset-4 hover:text-foreground hover:underline"
            >
              Effacer
            </button>
          )}
        </div>
        {entries.length === 0 ? (
          <p className="mt-4 text-sm text-muted">Aucun test sur cet appareil pour l&apos;instant.</p>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[680px] text-left text-sm">
              <thead className="font-mono text-xs uppercase tracking-[0.12em] text-muted">
                <tr>
                  <th className="py-2 pr-4 font-normal">Date</th>
                  <th className="py-2 pr-4 font-normal">Opérateur</th>
                  <th className="py-2 pr-4 font-normal">Réseau</th>
                  <th className="py-2 pr-4 font-normal">Montant</th>
                  <th className="py-2 pr-4 font-normal">Descendant</th>
                  <th className="py-2 pr-4 font-normal">RTT</th>
                  <th className="py-2 pr-4 font-normal">Gigue</th>
                  <th className="py-2 font-normal">Carte</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line font-mono text-xs">
                {entries.map((e) => (
                  <tr key={e.t}>
                    <td className="whitespace-nowrap py-2 pr-4 text-muted">
                      {new Date(e.t).toLocaleString("fr-FR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}
                    </td>
                    <td className="py-2 pr-4">{e.operator ?? "–"}</td>
                    <td className="py-2 pr-4">{linkLabel(e.link)}</td>
                    <td className="py-2 pr-4 tabular-nums">{mbps(e.up)}</td>
                    <td className="py-2 pr-4 tabular-nums">{mbps(e.down)}</td>
                    <td className="py-2 pr-4 tabular-nums">{ms(e.rtt)}</td>
                    <td className="py-2 pr-4 tabular-nums">{ms(e.jitter)}</td>
                    <td className="py-2 text-muted">{e.counted ? "Comptée" : "Non"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <p className="mt-4 text-xs text-muted">Gardé sur cet appareil uniquement. Les mesures de la carte restent anonymes : elles ne sont jamais liées à ton compte.</p>
      </section>
    </div>
  );
}
