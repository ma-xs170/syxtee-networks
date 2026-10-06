"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { setMobileOperator } from "@/app/(dashboard)/dashboard/scanner/actions";
import {
  connType,
  DECLARED_LABELS,
  isWifi,
  measurePoint,
  precisePosition,
  readNet,
  REASONS,
  type Declared,
  type LinkType,
  type NetInfo,
  type Point,
  type ScanClient,
} from "@/lib/scan/engine";
import { createClient } from "@/lib/supabase/client";
import { SCORE_COLOR, type AroundCell, type Score, type TrackSeg } from "./ScannerMap";

// Scanner réseau (/dashboard/scanner) : outil plein écran pensé pour le téléphone, ouvert aussi aux comptes gratuits.
// Même moteur que l'Analyseur (src/lib/scan/engine.ts) : un point toutes les 20 s (1 min en économie de data),
// 3 micro-tests par point, classement Wi-Fi / 4G / 5G par le Core. Jauges en direct, mini-carte de la session,
// zone de la carte communautaire, points gagnés, puis un résumé en fin de session.

const ScannerMap = dynamic(() => import("./ScannerMap"), { ssr: false, loading: () => <div className="h-full w-full bg-background" aria-hidden="true" /> });

type Zone = { h3: string; score: Score | null; best: { operator: string; tech: string; median_kbps: number | null } | null };
type Session = {
  distance: number;
  valid: number;
  rejected: Record<string, number>;
  discovered: string[];
  points: number;
  bytes: number;
};

const nf = new Intl.NumberFormat("fr-FR");
const mbit = (k: number | null | undefined) => (k == null ? "–" : nf.format(Math.round(k / 100) / 10));
const LABEL: Record<Score, string> = { bonne: "BONNE", moyenne: "MOYENNE", mauvaise: "MAUVAISE", inconnue: "INCONNUE" };
const OPERATORS: Declared[] = ["orange", "sfr", "digicel", "free", "other"];
/** Même seuils que la carte (core/src/aggregate.ts) : débit montant médian. */
const scoreOf = (p: Point): Score | "ecartee" => (!p.counted || !p.up_kbps ? "ecartee" : p.up_kbps < 2000 ? "mauvaise" : p.up_kbps >= 5000 ? "bonne" : "moyenne");
const POINTS_PER_MEASURE = 1;
const POINTS_PER_ZONE = 5;

function haversine(a: [number, number], b: [number, number]) {
  const r = Math.PI / 180;
  const h = Math.sin(((b[1] - a[1]) * r) / 2) ** 2 + Math.cos(a[1] * r) * Math.cos(b[1] * r) * Math.sin(((b[0] - a[0]) * r) / 2) ** 2;
  return 2 * 6_371_000 * Math.asin(Math.sqrt(h));
}

const linkLabel = (l: LinkType | null | undefined) => (l === "cellular" ? "4G / 5G" : isWifi(l) ? "Wi-Fi" : l === "starlink" ? "Starlink" : "Inconnu");

/** Jauge en arc (filaire) : valeur actuelle sur une échelle fixe. */
function Gauge({ label, value, unit, max, invert = false }: { label: string; value: number | null; unit: string; max: number; invert?: boolean }) {
  const ratio = value == null ? 0 : Math.min(1, Math.max(0, invert ? 1 - value / max : value / max));
  const len = 126; // demi-cercle de rayon 40
  return (
    <div className="flex flex-col items-center">
      <svg viewBox="0 0 100 58" className="w-full max-w-[120px]" aria-hidden="true">
        <path d="M10 50a40 40 0 0 1 80 0" fill="none" stroke="currentColor" strokeOpacity={0.18} strokeWidth={4} strokeLinecap="round" />
        <path
          d="M10 50a40 40 0 0 1 80 0"
          fill="none"
          stroke="currentColor"
          strokeWidth={4}
          strokeLinecap="round"
          strokeDasharray={len}
          strokeDashoffset={len * (1 - ratio)}
          className="transition-[stroke-dashoffset] duration-300 motion-reduce:transition-none"
        />
      </svg>
      <p className="-mt-3 font-mono text-xl tabular-nums sm:text-2xl" aria-live="off">
        {value == null ? "–" : unit === "ms" ? nf.format(Math.round(value)) : mbit(value)}
      </p>
      <p className="mt-0.5 text-xs text-muted">
        {label} <span className="normal-case tracking-normal">{unit === "ms" ? "ms" : "Mbit/s"}</span>
      </p>
    </div>
  );
}

function Banner({ tone = "neutral", children }: { tone?: "neutral" | "warn"; children: React.ReactNode }) {
  return (
    <div
      role="status"
      className={`rounded-xl border px-4 py-3 text-sm leading-relaxed ${tone === "warn" ? "border-[#ff9f0a]/60 bg-[#ff9f0a]/10 text-[#ffd8a0]" : "border-line bg-foreground/[0.08] text-foreground"}`}
    >
      {children}
    </div>
  );
}

export default function Scanner({ coreUrl, declared: initialDeclared }: { coreUrl: string; declared: Declared | null }) {
  const client: ScanClient = useMemo(
    () => ({
      coreUrl,
      auth: async (): Promise<Record<string, string>> => {
        const { data } = await createClient().auth.getSession();
        const token = data.session?.access_token;
        return token ? { Authorization: `Bearer ${token}` } : {};
      },
    }),
    [coreUrl],
  );
  // Composant chargé côté navigateur seulement (ScannerClient) : navigator est disponible.
  const [ct] = useState<string | null>(connType);
  const [declared, setDeclared] = useState<Declared | null>(initialDeclared);
  const [asking, setAsking] = useState<"start" | "edit" | null>(null);
  const [saving, startSaving] = useTransition();
  const [net, setNet] = useState<NetInfo | null>(null);
  const [down, setDown] = useState(false);
  const [running, setRunning] = useState(false);
  const [eco, setEco] = useState(false);
  const [phase, setPhase] = useState<string | null>(null);
  const [nextAt, setNextAt] = useState<number | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const [live, setLive] = useState<{ down: number | null; up: number | null; ping: number | null }>({ down: null, up: null, ping: null });
  const [last, setLast] = useState<Point | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [pos, setPos] = useState<GeolocationPosition | null>(null);
  const [zone, setZone] = useState<Zone | null>(null);
  const [cells, setCells] = useState<AroundCell[]>([]);
  const [segments, setSegments] = useState<TrackSeg[]>([]);
  const [session, setSession] = useState<Session | null>(null);
  const [summary, setSummary] = useState<Session | null>(null);
  const [background, setBackground] = useState(false);
  const posRef = useRef<GeolocationPosition | null>(null);
  const lastTrack = useRef<[number, number] | null>(null);
  const currentScore = useRef<Score | "ecartee">("ecartee");
  const zoneRef = useRef<Zone | null>(null);
  const from = useRef("");
  const cell = useRef<string | null>(null);

  const netParams = useCallback((extra: Record<string, string> = {}) => {
    const p = posRef.current;
    return { ...(ct ? { ct } : {}), ...(p ? { lat: p.coords.latitude.toFixed(4), lng: p.coords.longitude.toFixed(4) } : {}), ...extra };
  }, [ct]);

  // Réseau vu par le Core à l'ouverture (référence iPhone : on verra si le réseau change après « Coupe le Wi-Fi »).
  useEffect(() => {
    readNet(client, ct ? { ct } : {})
      .then((j) => {
        setNet(j);
        from.current = j.net;
        if (j.declared !== undefined) setDeclared(j.declared ?? null);
      })
      .catch(() => setDown(true));
  }, [client, ct]);

  // Relais privé iCloud : on revérifie toutes les 8 s ; le bandeau disparaît dès que l'IP réelle revient.
  const relayOn = !!net?.private_relay;
  useEffect(() => {
    if (!relayOn) return;
    const t = setInterval(() => {
      readNet(client, netParams())
        .then((j) => setNet((n) => ({ ...j, net: n?.net ?? j.net })))
        .catch(() => {});
    }, 8000);
    return () => clearInterval(t);
  }, [relayOn, client, netParams]);

  // GPS dès l'ouverture : position, précision, tracé de la session.
  useEffect(() => {
    if (!navigator.geolocation) return;
    const watch = navigator.geolocation.watchPosition(
      (p) => {
        posRef.current = p;
        setPos(p);
        if (!running) return;
        const here: [number, number] = [p.coords.longitude, p.coords.latitude];
        const prev = lastTrack.current;
        if (p.coords.accuracy > 50) return;
        if (!prev) {
          lastTrack.current = here;
          return;
        }
        const d = haversine(prev, here);
        if (d < 8) return;
        lastTrack.current = here;
        const score = currentScore.current;
        setSegments((s) => [...s, { from: prev, to: here, score }]);
        setSession((s) => (s ? { ...s, distance: s.distance + d } : s));
      },
      () => setStatus("Position refusée : autorise la localisation pour scanner (Réglages → Safari ou Chrome → Position)."),
      { enableHighAccuracy: true, maximumAge: 0 },
    );
    return () => navigator.geolocation.clearWatch(watch);
  }, [running]);

  // Zone de la carte communautaire et hexagones autour (au plus toutes les ~100 m).
  const zoneKey = pos ? `${pos.coords.latitude.toFixed(3)},${pos.coords.longitude.toFixed(3)}` : "";
  useEffect(() => {
    const p = posRef.current;
    if (!zoneKey || !p) return;
    const q = `lat=${p.coords.latitude.toFixed(5)}&lng=${p.coords.longitude.toFixed(5)}`;
    fetch(`/api/coverage/at?${q}`)
      .then((r) => (r.ok ? (r.json() as Promise<Zone>) : null))
      .then((z) => {
        if (!z) return;
        zoneRef.current = z;
        setZone(z);
      })
      .catch(() => {});
    fetch(`/api/coverage/around?${q}`)
      .then((r) => (r.ok ? (r.json() as Promise<{ cells: AroundCell[] }>) : null))
      .then((j) => j && setCells(j.cells))
      .catch(() => {});
  }, [zoneKey]);

  // Compte à rebours jusqu'au prochain point.
  useEffect(() => {
    if (!nextAt) return;
    const t = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(t);
  }, [nextAt]);

  // Écran allumé pendant le scan (Screen Wake Lock) ; avertissement si l'app passe en arrière-plan (iOS met en pause).
  useEffect(() => {
    if (!running) return;
    let wake: WakeLockSentinel | null = null;
    const lock = () => navigator.wakeLock?.request("screen").then((w) => (wake = w), () => {});
    void lock();
    const onVis = () => {
      if (document.visibilityState === "hidden") setBackground(true);
      else void lock(); // le verrou est relâché quand la page est masquée
    };
    document.addEventListener("visibilitychange", onVis);
    return () => {
      document.removeEventListener("visibilitychange", onVis);
      wake?.release().catch(() => {});
    };
  }, [running]);

  // Boucle de mesure.
  useEffect(() => {
    if (!running) return;
    let stopped = false;
    const run = async () => {
      while (!stopped) {
        setNextAt(null);
        try {
          setPhase("Attente d'un GPS précis…");
          const p = await precisePosition(() => posRef.current, () => stopped);
          if (stopped) break;
          if (!p) {
            setStatus(REASONS.accuracy);
            setSession((s) => (s ? { ...s, rejected: { ...s.rejected, accuracy: (s.rejected.accuracy ?? 0) + 1 } } : s));
          } else {
            setLive({ down: null, up: null, ping: null });
            const r = await measurePoint(client, {
              position: p,
              from: from.current,
              cell: cell.current,
              eco,
              stopped: () => stopped,
              onPhase: setPhase,
              onBytes: (b) => setSession((s) => (s ? { ...s, bytes: s.bytes + b } : s)),
              onSample: (kind, v) => setLive((l) => ({ ...l, [kind]: v })),
            });
            if (!r || stopped) break;
            setLast(r);
            setLive({ down: r.down_kbps, up: r.up_kbps, ping: r.rtt_ms });
            setNet((n) => (n ? { ...n, operator: r.operator ?? n.operator, link_type: r.link_type, link_conf: r.link_conf, tags: r.tags, private_relay: r.private_relay } : n));
            currentScore.current = scoreOf(r);
            const z = zoneRef.current;
            const newZone = r.counted && z && !z.score ? z.h3 : null;
            setSession((s) => {
              if (!s) return s;
              if (!r.counted) {
                const why = r.reason ?? "unknown_link";
                return { ...s, rejected: { ...s.rejected, [why]: (s.rejected[why] ?? 0) + 1 } };
              }
              const fresh = newZone && !s.discovered.includes(newZone);
              return {
                ...s,
                valid: s.valid + 1,
                discovered: fresh ? [...s.discovered, newZone] : s.discovered,
                points: s.points + POINTS_PER_MEASURE + (fresh ? POINTS_PER_ZONE : 0),
              };
            });
            setStatus(r.counted ? "Point ajouté à la carte communautaire." : r.reason ? (REASONS[r.reason] ?? "Point ignoré.") : null);
          }
        } catch (e) {
          if (!stopped) setStatus((e as { status?: number }).status === 401 ? "Session expirée : recharge la page." : "Mesure impossible (réseau ou serveur). Nouvel essai au prochain point.");
        }
        setPhase(null);
        if (stopped) break;
        const wait = eco ? 60_000 : 20_000;
        setNextAt(Date.now() + wait);
        await new Promise((res) => setTimeout(res, wait));
      }
    };
    void run();
    return () => {
      stopped = true;
      setNextAt(null);
      setPhase(null);
    };
  }, [running, eco, client]);

  function begin() {
    setSummary(null);
    setStatus(null);
    setBackground(false);
    setSegments([]);
    lastTrack.current = null;
    currentScore.current = "ecartee";
    setSession({ distance: 0, valid: 0, rejected: {}, discovered: [], points: 0, bytes: 0 });
    setRunning(true);
  }

  function start() {
    // iPhone (pas de navigator.connection.type) : on demande l'opérateur au premier scan.
    if (!ct && !declared) return setAsking("start");
    begin();
  }

  function stop() {
    setRunning(false);
    setSummary(session);
  }

  function chooseOperator(d: Declared) {
    startSaving(async () => {
      const r = await setMobileOperator(d);
      if (r.error) return setStatus(r.error);
      setDeclared(d);
      const then = asking;
      setAsking(null);
      readNet(client, netParams())
        .then((j) => setNet((n) => ({ ...j, net: n?.net ?? j.net })))
        .catch(() => {});
      if (then === "start") begin();
    });
  }

  // iPhone : après « Coupe le Wi-Fi », on vérifie que le réseau a changé.
  async function wifiOff() {
    try {
      const j = await readNet(client, netParams({ from: from.current }));
      cell.current = j.net;
      setNet((n) => ({ ...j, net: n?.net ?? j.net }));
    } catch {
      setStatus("Serveur injoignable.");
    }
  }

  const link = net?.link_type ?? null;
  const wifi = isWifi(link) || ct === "wifi" || last?.reason === "wifi";
  const imprecise = !!pos && pos.coords.accuracy > 20;
  const consentOff = net?.consent === false;
  const conf = net?.link_conf != null ? Math.round(net.link_conf * 100) : null;
  const countdown = nextAt ? Math.max(0, Math.ceil((nextAt - now) / 1000)) : null;
  const here: [number, number] | null = pos ? [pos.coords.longitude, pos.coords.latitude] : null;

  if (down)
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center">
        <p className="text-lg font-medium">Le serveur de mesure ne répond pas.</p>
        <p className="mt-2 text-sm text-muted">Réessaie dans quelques minutes.</p>
      </div>
    );

  return (
    <div className="mx-auto grid grid-cols-1 w-full max-w-6xl gap-4 px-4 pb-10 pt-4 sm:px-6 lg:grid-cols-[minmax(0,420px)_minmax(0,1fr)] lg:pt-8">
      {/* ───── Colonne scan ───── */}
      <div className="flex min-h-[calc(100dvh-9rem)] flex-col gap-4 lg:min-h-0">
        <header className="rounded-2xl border border-line p-5">
          <p className="text-xs text-muted">Opérateur détecté</p>
          <p className="mt-1 truncate text-2xl font-semibold tracking-tight sm:text-3xl">{net ? (net.operator ?? "Inconnu") : "…"}</p>
          <p className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
            <span className="rounded-full border border-line px-2.5 py-1 text-foreground">{net ? linkLabel(link) : "…"}</span>
            {conf !== null && <span className="text-muted">confiance {conf} %</span>}
            {net?.tags?.includes("declared") && <span className="normal-case tracking-normal text-muted">opérateur déclaré</span>}
          </p>
        </header>

        {(relayOn || wifi || imprecise || consentOff || background) && (
          <div className="grid gap-2">
            {relayOn && (
              <Banner tone="warn">
                <p className="font-medium">Le Relais privé iCloud masque ton opérateur</p>
                <p className="mt-1">
                  Dans Safari : touche <span className="font-mono">aA</span> dans la barre d&apos;adresse → <span className="font-medium">Afficher l&apos;adresse IP</span> (pour ce
                  site). Ou Réglages → [ton nom] → iCloud → Relais privé → désactiver pendant le scan.
                </p>
                {declared && declared !== "other" && <p className="mt-1 text-[#ffd8a0]/80">En attendant, tes mesures comptent avec ton opérateur déclaré ({DECLARED_LABELS[declared]}).</p>}
              </Banner>
            )}
            {wifi && !relayOn && (
              <Banner>
                <p className="font-medium">Wi-Fi détecté : mesures non comptées</p>
                <p className="mt-1 text-muted">Coupe le Wi-Fi pour scanner la 4G / 5G.</p>
                {!ct && (
                  <button type="button" onClick={wifiOff} className="mt-3 h-10 whitespace-nowrap rounded-full border border-line px-4 text-sm transition-colors hover:bg-foreground/10 active:scale-[0.98]">
                    C&apos;est fait, vérifier le réseau
                  </button>
                )}
              </Banner>
            )}
            {imprecise && (
              <Banner>
                <p className="font-medium">GPS imprécis (±{nf.format(Math.round(pos!.coords.accuracy))} m)</p>
                <p className="mt-1 text-muted">Il faut 20 m ou mieux. Sors à découvert ou attends quelques secondes.</p>
              </Banner>
            )}
            {consentOff && (
              <Banner>
                Active d&apos;abord « Partager anonymement mes mesures » dans{" "}
                <Link href="/dashboard/parametres#couverture" className="underline underline-offset-4">
                  Paramètres
                </Link>
                . Sans ton accord, rien n&apos;est gardé.
              </Banner>
            )}
            {background && running && (
              <Banner>
                <p className="font-medium">L&apos;app est passée en arrière-plan</p>
                <p className="mt-1 text-muted">iOS met le scan en pause quand l&apos;écran est verrouillé ou qu&apos;une autre app est ouverte. Garde cette page au premier plan.</p>
                <button type="button" onClick={() => setBackground(false)} className="mt-2 text-sm underline underline-offset-4">
                  Compris
                </button>
              </Banner>
            )}
          </div>
        )}

        {/* ───── Bouton rond + jauges ───── */}
        <section aria-label="Scan" className="flex flex-1 flex-col items-center justify-center gap-6 rounded-2xl border border-line px-5 py-8">
          <button
            type="button"
            disabled={!net || consentOff || saving}
            onClick={() => (running ? stop() : start())}
            aria-pressed={running}
            className="group relative grid aspect-square w-52 place-items-center rounded-full border border-foreground/35 transition-transform active:scale-[0.98] disabled:opacity-50 sm:w-56"
          >
            {running && (
              <span
                aria-hidden="true"
                className="absolute inset-[-6px] animate-[spin_4s_linear_infinite] rounded-full border-2 border-transparent border-t-white motion-reduce:animate-none"
              />
            )}
            <span className={`absolute inset-3 rounded-full ${running ? "border border-line" : "bg-accent"}`} aria-hidden="true" />
            <span className={`relative px-6 text-center ${running ? "text-foreground" : "text-background"}`}>
              {running ? (
                <>
                  <span className="block font-mono text-4xl tabular-nums">{countdown ?? (session?.valid ?? 0)}</span>
                  <span className="mt-1 block text-xs text-muted">{phase ?? (countdown !== null ? "prochain point (s)" : "mesure…")}</span>
                  <span className="mt-3 block text-xs">Arrêter</span>
                </>
              ) : (
                <span className="block text-sm font-medium">Démarrer le scan</span>
              )}
            </span>
          </button>

          <div className="grid w-full grid-cols-3 gap-2">
            <Gauge label="Débit ↓" value={live.down} unit="kbps" max={100_000} />
            <Gauge label="Débit ↑" value={live.up} unit="kbps" max={50_000} />
            <Gauge label="Ping" value={live.ping} unit="ms" max={300} invert />
          </div>
          <p className="font-mono text-xs text-muted">
            gigue {last?.jitter_ms != null ? `${nf.format(last.jitter_ms)} ms` : "–"} · pertes {last?.loss_pct != null ? `${nf.format(last.loss_pct)} %` : "–"}
          </p>
          {status && (
            <p className="text-center text-sm text-muted" role="status">
              {status}
            </p>
          )}
        </section>

        {/* ───── Points, data, économie ───── */}
        <section aria-label="Session" className="grid grid-cols-2 gap-4 rounded-2xl border border-line p-5">
          <div>
            <p className="text-xs text-muted">Scanne ta zone</p>
            <p className="mt-1 font-mono text-2xl tabular-nums">
              +{nf.format(session?.points ?? 0)} <span className="text-sm text-muted">pts</span>
            </p>
            <p className="mt-0.5 text-xs text-muted">{nf.format(session?.valid ?? 0)} mesures comptées</p>
          </div>
          <div>
            <p className="text-xs text-muted">Data consommée</p>
            <p className="mt-1 font-mono text-2xl tabular-nums">
              {nf.format(Math.round(((session?.bytes ?? 0) / 1e6) * 10) / 10)} <span className="text-sm text-muted">Mo</span>
            </p>
          </div>
          <label className="col-span-2 flex items-center justify-between gap-4 border-t border-line pt-4 text-sm">
            <span>
              Économie de data
              <span className="block text-xs text-muted">Un point par minute, tests plus courts.</span>
            </span>
            <input type="checkbox" checked={eco} onChange={(e) => setEco(e.target.checked)} className="h-5 w-5 accent-accent" />
          </label>
          {!ct && declared && (
            <p className="col-span-2 text-xs text-muted">
              Opérateur déclaré : {DECLARED_LABELS[declared]} ·{" "}
              <button type="button" onClick={() => setAsking("edit")} className="underline underline-offset-4 hover:text-foreground">
                changer
              </button>
            </p>
          )}
        </section>
      </div>

      {/* ───── Colonne carte ───── */}
      <div className="flex flex-col gap-4">
        <section aria-label="Carte de la session" className="relative h-[42dvh] min-h-[280px] overflow-hidden rounded-2xl border border-line lg:h-[min(62dvh,560px)]">
          <ScannerMap position={here} cells={cells} segments={segments} />
          <ul className="pointer-events-none absolute bottom-3 left-3 flex flex-wrap gap-x-3 gap-y-1 rounded-lg border border-line bg-background/80 px-3 py-2 font-mono text-[11px] text-muted">
            {(["bonne", "moyenne", "mauvaise", "inconnue"] as Score[]).map((s) => (
              <li key={s} className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-sm border border-foreground/50" style={{ background: SCORE_COLOR[s] }} aria-hidden="true" />
                {s[0].toUpperCase() + s.slice(1)}
              </li>
            ))}
          </ul>
        </section>

        <section aria-label="Ta zone" className="rounded-2xl border border-line p-5">
          {!pos ? (
            <p className="text-sm text-muted">Autorise la localisation pour voir la qualité de ta zone.</p>
          ) : zone?.score ? (
            <>
              <p className="text-lg font-medium">
                Tu es dans une zone <span className="font-mono tracking-[0.08em]">{LABEL[zone.score]}</span>
              </p>
              {zone.best && (
                <p className="mt-1 text-sm text-muted">
                  Meilleur réseau ici : {zone.best.operator}
                  {zone.best.tech !== "inconnu" ? ` ${zone.best.tech.toUpperCase()}` : ""}
                </p>
              )}
            </>
          ) : (
            <p className="text-lg font-medium">Zone inconnue : ton scan la découvre.</p>
          )}
        </section>
      </div>

      {/* ───── Opérateur déclaré (premier scan sur iPhone) ───── */}
      {asking && (
        <div className="fixed inset-0 z-40 flex items-end justify-center bg-background/80 p-4 sm:items-center" role="dialog" aria-modal="true" aria-labelledby="op-title">
          <div className="w-full max-w-md rounded-2xl border border-line bg-background p-5">
            <h2 id="op-title" className="text-xl font-semibold tracking-tight">
              Ton opérateur mobile ?
            </h2>
            <p className="mt-2 text-sm text-muted">Sur iPhone, le navigateur ne dit pas s&apos;il est en Wi-Fi ou en 4G / 5G. On compare ta réponse au réseau vu par le serveur.</p>
            <div className="mt-5 grid grid-cols-2 gap-2">
              {OPERATORS.map((o) => (
                <button
                  key={o}
                  type="button"
                  disabled={saving}
                  onClick={() => chooseOperator(o)}
                  className={`h-14 rounded-xl border px-4 text-sm font-medium transition-colors hover:bg-foreground/10 active:scale-[0.98] disabled:opacity-50 ${declared === o ? "border-accent" : "border-line"} ${o === "other" ? "col-span-2" : ""}`}
                >
                  {DECLARED_LABELS[o]}
                </button>
              ))}
            </div>
            <button type="button" onClick={() => setAsking(null)} className="mt-3 h-11 w-full text-sm text-muted hover:text-foreground">
              Annuler
            </button>
          </div>
        </div>
      )}

      {/* ───── Résumé de fin de session ───── */}
      {summary && !running && (
        <div className="fixed inset-0 z-40 flex items-end justify-center bg-background/80 p-4 sm:items-center" role="dialog" aria-modal="true" aria-labelledby="sum-title">
          <div className="max-h-full w-full max-w-md overflow-y-auto rounded-2xl border border-line bg-background p-5">
            <h2 id="sum-title" className="text-xl font-semibold tracking-tight">
              Session terminée
            </h2>
            <dl className="mt-5 grid grid-cols-2 gap-4 font-mono">
              <div>
                <dt className="text-xs text-muted">Distance</dt>
                <dd className="mt-1 text-2xl tabular-nums">{summary.distance >= 1000 ? `${nf.format(Math.round(summary.distance / 100) / 10)} km` : `${nf.format(Math.round(summary.distance))} m`}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted">Points gagnés</dt>
                <dd className="mt-1 text-2xl tabular-nums">+{nf.format(summary.points)}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted">Mesures valides</dt>
                <dd className="mt-1 text-2xl tabular-nums">{nf.format(summary.valid)}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted">Zones découvertes</dt>
                <dd className="mt-1 text-2xl tabular-nums">{nf.format(summary.discovered.length)}</dd>
              </div>
            </dl>
            <div className="mt-5 border-t border-line pt-4">
              <p className="text-sm font-medium">
                Mesures écartées : {nf.format(Object.values(summary.rejected).reduce((a, b) => a + b, 0))}
              </p>
              {Object.keys(summary.rejected).length > 0 && (
                <ul className="mt-2 grid gap-1.5 text-sm text-muted">
                  {Object.entries(summary.rejected).map(([why, n]) => (
                    <li key={why} className="flex justify-between gap-4">
                      <span>{REASONS[why] ?? why}</span>
                      <span className="font-mono tabular-nums text-foreground">{nf.format(n)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <p className="mt-4 text-xs text-muted">
              {POINTS_PER_MEASURE} pt par mesure comptée, {POINTS_PER_ZONE} pts par zone découverte. Data consommée : {nf.format(Math.round((summary.bytes / 1e6) * 10) / 10)} Mo.
            </p>
            <div className="mt-5 flex flex-wrap gap-3">
              <Link
                href="/couverture"
                className="inline-flex h-11 items-center whitespace-nowrap rounded-full bg-accent px-5 text-sm font-medium text-on-accent transition-colors hover:bg-accent-hover active:scale-[0.98]"
              >
                Voir sur la carte
              </Link>
              <button type="button" onClick={() => setSummary(null)} className="h-11 whitespace-nowrap rounded-full border border-line px-5 text-sm transition-colors hover:bg-foreground/10">
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
