"use client";

import { cellToBoundary, cellToLatLng, cellToParent } from "h3-js";
import type { GeoJSONSource, Map as MlMap } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { useEffect, useMemo, useRef, useState } from "react";
import { TERRITORIES, type TerritoryFile, type TerritoryId } from "@/lib/antennes/build.ts";
import type { HexRow, Reliability } from "@/lib/coverage/public";

// Carte « Où capter » : hexagones H3 colorés selon le score, dans la charte (blanc sur noir) :
// Bonne = blanc, Moyenne = gris, Mauvaise = hachures (le rouge reste réservé au direct), non scanné = rien.
// Fiabilité : Estimation (1 contributeur) en pointillés à 40 %, Fiable à 70 %, Très fiable à 100 %.
// Grille adaptative : rés. 8 dézoomé, rés. 9, puis rés. 10 de près là où l'hexagone a 20 mesures ou plus.
// Seules les mesures 4G/5G (jamais le Wi-Fi) ; Starlink dans sa propre couche. Couche « Antennes » : fichiers Arcep.

const STYLE = "https://tiles.openfreemap.org/styles/dark";
const PERIODS = [
  { days: 30, label: "30 j" },
  { days: 90, label: "90 j" },
  { days: 365, label: "1 an" },
];
const MODES = [
  { id: "foot", label: "À pied" },
  { id: "vehicle", label: "En véhicule" },
  { id: "all", label: "Tous" },
] as const;
const SCORES = { bonne: "Bonne", moyenne: "Moyenne", mauvaise: "Mauvaise", inconnue: "Inconnue" } as const;
const RELIABILITY: Record<Reliability, { label: string; opacity: number; hint: string }> = {
  estimation: { label: "Estimation", opacity: 0.4, hint: "Un seul contributeur pour l'instant." },
  fiable: { label: "Fiable", opacity: 0.7, hint: "Plusieurs contributeurs, ou 20 mesures et plus." },
  tres_fiable: { label: "Très fiable", opacity: 1, hint: "5 contributeurs et plus, ou 100 mesures sur plusieurs jours et horaires." },
};
const HOURS = ["Matin", "Après-midi", "Soir", "Nuit"];
const STATUS_LABEL = ["En service", "Maintenance", "Incident", "Statut non publié"];
const BRAND: Record<string, string> = { "Outremer Telecom": "SFR Caraïbe", SRR: "SFR Réunion" };
const nf = new Intl.NumberFormat("fr-FR");
const monthFmt = new Intl.DateTimeFormat("fr-FR", { month: "short", year: "numeric", timeZone: "UTC" });
const mbps = (kbps: number | null) => (kbps ? `${nf.format(Math.round(kbps / 100) / 10)} Mbit/s` : "-");
const monthLabel = (m: string) => monthFmt.format(new Date(`${m}-15T00:00:00Z`));
const dataUrl = (t: TerritoryId) => `${(process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").trim()}/storage/v1/object/public/open-data/antennes/${t}.json`;

/** Date utilisée pour le filtre de période : fin du mois quand la date est arrondie au mois (un seul contributeur). */
function seenAt(r: HexRow) {
  if (r.contributors > 1) return new Date(r.last_ts).getTime();
  const [y, m] = r.last_month.split("-").map(Number);
  return Date.UTC(y, m, 0, 23, 59);
}
const resForZoom = (z: number) => (z < 11 ? 8 : z >= 14 ? 10 : 9);

function dist(a: [number, number], b: [number, number]) {
  const r = Math.PI / 180;
  const h = Math.sin(((b[1] - a[1]) * r) / 2) ** 2 + Math.cos(a[1] * r) * Math.cos(b[1] * r) * Math.sin(((b[0] - a[0]) * r) / 2) ** 2;
  return 2 * 6_371_000 * Math.asin(Math.sqrt(h));
}

function Chip({ on, onClick, children }: { on: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={on}
      onClick={onClick}
      className={`whitespace-nowrap rounded-full border px-3 py-1.5 text-xs transition-colors ${on ? "border-foreground/50 bg-foreground/[0.12] text-foreground" : "border-line text-muted hover:text-foreground"}`}
    >
      {children}
    </button>
  );
}

const Sep = () => <span className="mx-1 hidden h-5 w-px bg-line sm:block" aria-hidden="true" />;

/** Motif de hachures (zones « Mauvaise »). */
function hatch() {
  const s = 8;
  const c = document.createElement("canvas");
  c.width = c.height = s;
  const g = c.getContext("2d")!;
  g.strokeStyle = "rgba(255,255,255,0.75)";
  g.lineWidth = 1.5;
  g.beginPath();
  g.moveTo(0, s);
  g.lineTo(s, 0);
  g.stroke();
  return g.getImageData(0, 0, s, s);
}

export default function CoverageMap() {
  const box = useRef<HTMLDivElement>(null);
  const map = useRef<MlMap | null>(null);
  const [ready, setReady] = useState(false);
  const [zoom, setZoom] = useState(TERRITORIES[0].zoom);
  const [rows, setRows] = useState<HexRow[] | null>(null);
  const [now, setNow] = useState(0); // heure du chargement des données (filtre de période)
  const [ops, setOps] = useState<Set<string> | null>(null); // null = tous
  const [tech, setTech] = useState<"all" | "4g" | "5g">("all");
  const [mode, setMode] = useState<HexRow["mode"]>("all");
  const [layer, setLayer] = useState<HexRow["layer"]>("cellular");
  const [period, setPeriod] = useState(90);
  const [antennas, setAntennas] = useState(false);
  const [file, setFile] = useState<TerritoryFile | null>(null);
  const [picked, setPicked] = useState<{ h: string; res: number } | null>(null);
  const [geoError, setGeoError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/coverage/hex")
      .then((r) => r.json())
      .then((j: { rows: HexRow[] }) => {
        setNow(Date.now());
        setRows(j.rows);
      })
      .catch(() => setRows([]));
  }, []);

  // Carte (navigateur uniquement).
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const maplibre = await import("maplibre-gl");
      if (cancelled || !box.current) return;
      maplibre.setWorkerUrl("/maplibre/maplibre-gl-worker.mjs");
      const t = TERRITORIES[0];
      const m = new maplibre.Map({ container: box.current, style: STYLE, center: t.center, zoom: t.zoom, attributionControl: { compact: true } });
      m.addControl(new maplibre.NavigationControl({ showCompass: false }), "top-right");
      // La carte suit la taille de son cadre (mise en page tardive, rotation du téléphone).
      const ro = new ResizeObserver(() => m.resize());
      ro.observe(box.current);
      m.once("remove", () => ro.disconnect());
      m.on("zoomend", () => setZoom(m.getZoom()));
      m.on("load", () => {
        m.resize();
        m.addImage("hatch", hatch(), { pixelRatio: 2 });
        const empty = { type: "FeatureCollection" as const, features: [] };
        m.addSource("hex", { type: "geojson", data: empty });
        m.addSource("antennas", { type: "geojson", data: empty });
        m.addLayer({
          id: "hex-fill",
          type: "fill",
          source: "hex",
          filter: ["!=", ["get", "score"], "mauvaise"],
          paint: {
            "fill-color": ["match", ["get", "score"], "bonne", "#ffffff", "moyenne", "#8a8a8a", "#3a3a3a"],
            "fill-opacity": ["*", ["match", ["get", "score"], "bonne", 0.6, "moyenne", 0.5, 0.25], ["get", "o"]],
          },
        });
        m.addLayer({ id: "hex-bad", type: "fill", source: "hex", filter: ["==", ["get", "score"], "mauvaise"], paint: { "fill-pattern": "hatch", "fill-opacity": ["get", "o"] } });
        // Contour : pointillés pour une estimation (un seul contributeur), plein sinon.
        m.addLayer({
          id: "hex-line",
          type: "line",
          source: "hex",
          filter: ["!=", ["get", "rel"], "estimation"],
          paint: { "line-color": "#ffffff", "line-opacity": ["*", 0.45, ["get", "o"]], "line-width": 0.75 },
        });
        m.addLayer({
          id: "hex-line-est",
          type: "line",
          source: "hex",
          filter: ["==", ["get", "rel"], "estimation"],
          paint: { "line-color": "#ffffff", "line-opacity": 0.7, "line-width": 1, "line-dasharray": [2, 2] },
        });
        m.addLayer({
          id: "antennas",
          type: "circle",
          source: "antennas",
          layout: { visibility: "none" },
          paint: {
            "circle-color": "#000000",
            "circle-radius": ["interpolate", ["linear"], ["zoom"], 8, 2.5, 14, 5],
            "circle-stroke-color": ["match", ["get", "st"], 1, "#fab219", 2, "#d03b3b", "#f5f5f5"],
            "circle-stroke-width": 1.5,
          },
        });
        for (const l of ["hex-fill", "hex-bad"]) {
          m.on("click", l, (e) => {
            const p = e.features?.[0]?.properties;
            setPicked(p?.h ? { h: p.h as string, res: Number(p.res) } : null);
          });
          m.on("mouseenter", l, () => (m.getCanvas().style.cursor = "pointer"));
          m.on("mouseleave", l, () => (m.getCanvas().style.cursor = ""));
        }
        setZoom(m.getZoom());
        setReady(true);
      });
      map.current = m;
    })();
    return () => {
      cancelled = true;
      map.current?.remove();
      map.current = null;
    };
  }, []);

  // Lignes de la couche, du mode et de la période choisis.
  const base = useMemo(() => {
    const since = now - period * 86_400_000;
    return (rows ?? []).filter((r) => r.layer === layer && r.mode === mode && seenAt(r) >= since);
  }, [rows, layer, mode, period, now]);

  const operators = useMemo(() => [...new Set(base.map((r) => r.operator).filter((o) => o !== "*" && o !== "inconnu"))].sort(), [base]);

  // Une ligne par hexagone et par résolution selon les filtres (meilleur opérateur retenu quand on filtre).
  const byRes = useMemo(() => {
    const pick = (res: number) => {
      const list = base.filter((r) => r.res === res);
      if (!ops && tech === "all") return list.filter((r) => r.operator === "*" && r.tech === "*");
      const byHex = new Map<string, HexRow>();
      for (const r of list) {
        if (r.operator === "*" || (ops && !ops.has(r.operator)) || (tech !== "all" && r.tech !== tech)) continue;
        const cur = byHex.get(r.h3_index);
        if (!cur || (r.median_kbps ?? 0) > (cur.median_kbps ?? 0)) byHex.set(r.h3_index, r);
      }
      return [...byHex.values()];
    };
    return { 8: pick(8), 9: pick(9), 10: pick(10) };
  }, [base, ops, tech]);

  // Grille adaptative : de près, un hexagone rés. 9 de 20 mesures et plus est remplacé par ses hexagones rés. 10.
  const shown = useMemo(() => {
    const res = resForZoom(zoom);
    if (res !== 10) return byRes[res];
    const dense = new Set(byRes[9].filter((r) => r.n >= 20).map((r) => r.h3_index));
    const fine = byRes[10].filter((r) => dense.has(cellToParent(r.h3_index, 9)));
    const covered = new Set(fine.map((r) => cellToParent(r.h3_index, 9)));
    return [...byRes[9].filter((r) => !covered.has(r.h3_index)), ...fine];
  }, [byRes, zoom]);

  useEffect(() => {
    if (!ready || !map.current) return;
    (map.current.getSource("hex") as GeoJSONSource).setData({
      type: "FeatureCollection",
      features: shown.map((r) => {
        const ring = cellToBoundary(r.h3_index, true);
        return {
          type: "Feature",
          properties: { h: r.h3_index, res: r.res, score: r.score, rel: r.reliability, o: RELIABILITY[r.reliability].opacity },
          geometry: { type: "Polygon", coordinates: [[...ring, ring[0]]] },
        };
      }),
    });
  }, [ready, shown]);

  // Antennes : fichier du territoire le plus proche du centre de la carte.
  useEffect(() => {
    const m = map.current;
    if (!ready || !m) return;
    m.setLayoutProperty("antennas", "visibility", antennas ? "visible" : "none");
    if (!antennas) return;
    const load = () => {
      const c = m.getCenter();
      const t = TERRITORIES.reduce((a, b) => (dist([c.lng, c.lat], b.center) < dist([c.lng, c.lat], a.center) ? b : a));
      if (file?.territory === t.id) return;
      fetch(dataUrl(t.id))
        .then((r) => r.json())
        .then((f: TerritoryFile) => {
          setFile(f);
          (m.getSource("antennas") as GeoJSONSource).setData({
            type: "FeatureCollection",
            features: f.sites.map((s) => ({ type: "Feature", properties: { st: s[3] }, geometry: { type: "Point", coordinates: [s[0], s[1]] } })),
          });
        })
        .catch(() => {});
    };
    load();
    m.on("moveend", load);
    return () => {
      m.off("moveend", load);
    };
  }, [ready, antennas, file?.territory]);

  // Fiche de l'hexagone choisi.
  const detail = useMemo(() => {
    if (!picked) return null;
    const here = base.filter((r) => r.h3_index === picked.h && r.res === picked.res);
    const all = here.find((r) => r.operator === "*") ?? null;
    const perOp = here.filter((r) => r.operator !== "*").sort((a, b) => (b.median_kbps ?? 0) - (a.median_kbps ?? 0));
    const [lat, lng] = cellToLatLng(picked.h);
    const near = file
      ? file.sites
          .map((s, i) => ({ i, s, d: dist([lng, lat], [s[0], s[1]]) }))
          .sort((a, b) => a.d - b.d)
          .slice(0, 3)
      : [];
    return { all, perOp, near };
  }, [picked, base, file]);

  const maxKbps = Math.max(1, ...(detail?.perOp ?? []).map((r) => r.median_kbps ?? 0));
  const maxHour = Math.max(1, ...(detail?.all?.hours ?? []));

  function aroundMe() {
    setGeoError(null);
    if (!navigator.geolocation) return setGeoError("Géolocalisation indisponible.");
    navigator.geolocation.getCurrentPosition(
      (p) => map.current?.flyTo({ center: [p.coords.longitude, p.coords.latitude], zoom: 14 }),
      () => setGeoError("Position refusée ou introuvable."),
      { enableHighAccuracy: true, timeout: 15_000 },
    );
  }

  const a = detail?.all;
  const period_ = a ? (a.first_month === a.last_month ? monthLabel(a.last_month) : `${monthLabel(a.first_month)} - ${monthLabel(a.last_month)}`) : null;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Chip on={!ops} onClick={() => setOps(null)}>
          Tous opérateurs
        </Chip>
        {operators.map((o) => (
          <Chip
            key={o}
            on={!!ops?.has(o)}
            onClick={() =>
              setOps((cur) => {
                const next = new Set(cur ?? []);
                if (next.has(o)) next.delete(o);
                else next.add(o);
                return next.size ? next : null;
              })
            }
          >
            {o}
          </Chip>
        ))}
        <Sep />
        {(["all", "4g", "5g"] as const).map((t) => (
          <Chip key={t} on={tech === t} onClick={() => setTech(t)}>
            {t === "all" ? "4G + 5G" : t.toUpperCase()}
          </Chip>
        ))}
        <Sep />
        {MODES.map((m) => (
          <Chip key={m.id} on={mode === m.id} onClick={() => setMode(m.id)}>
            {m.label}
          </Chip>
        ))}
        <Sep />
        {PERIODS.map((p) => (
          <Chip key={p.days} on={period === p.days} onClick={() => setPeriod(p.days)}>
            {p.label}
          </Chip>
        ))}
      </div>

      <div className="relative overflow-hidden rounded-2xl border border-line">
        <div ref={box} className="h-[min(70dvh,640px)] min-h-[420px] w-full bg-background" />
        <div className="absolute left-3 top-3 flex flex-col gap-2">
          <button type="button" onClick={aroundMe} className="h-9 rounded-full bg-accent px-4 text-xs font-medium text-on-accent transition-colors hover:bg-accent-hover">
            Autour de moi
          </button>
          {(
            [
              ["Antennes", antennas, () => setAntennas((v) => !v)],
              ["Starlink", layer === "starlink", () => setLayer((l) => (l === "starlink" ? "cellular" : "starlink"))],
            ] as const
          ).map(([label, on, toggle]) => (
            <button
              key={label}
              type="button"
              aria-pressed={on}
              onClick={toggle}
              className={`h-9 rounded-full border px-4 text-xs backdrop-blur-sm transition-colors ${on ? "border-foreground/50 bg-background/80 text-foreground" : "border-line bg-background/60 text-muted hover:text-foreground"}`}
            >
              {label}
            </button>
          ))}
        </div>
        {rows && shown.length === 0 && (
          <p className="pointer-events-none absolute inset-x-3 bottom-12 rounded-xl border border-line bg-background/85 p-3 text-sm text-muted sm:right-auto sm:max-w-md">
            {layer === "starlink"
              ? "Aucune zone Starlink publiée pour ces filtres."
              : "Aucune zone publiée pour ces filtres. Une zone apparaît dès 5 mesures en 4G/5G : lance le Scanner réseau."}
          </p>
        )}
        {geoError && <p className="absolute inset-x-3 top-36 rounded-xl border border-line bg-background/85 p-3 text-sm text-muted">{geoError}</p>}

        {detail && picked && (
          <aside
            aria-label="Détail de la zone"
            className="absolute inset-x-3 bottom-3 max-h-[60%] overflow-y-auto rounded-2xl border border-line bg-background/95 p-4 backdrop-blur-md sm:inset-x-auto sm:right-3 sm:top-3 sm:bottom-auto sm:max-h-[calc(100%-1.5rem)] sm:w-80"
          >
            <div className="flex items-start justify-between gap-3">
              <p className="text-sm font-medium">
                Zone {a ? SCORES[a.score].toLowerCase() : "sans données"}
                {a && <span className="block font-mono text-xs text-muted">{mbps(a.median_kbps)} montant médian</span>}
              </p>
              <button type="button" onClick={() => setPicked(null)} className="-m-1 p-1 text-muted hover:text-foreground" aria-label="Fermer">
                ✕
              </button>
            </div>
            {a && (
              <div className="mt-3 rounded-xl border border-line p-3">
                <p className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.14em]">
                  <span
                    aria-hidden="true"
                    className={`h-2.5 w-4 rounded-[2px] border border-accent ${a.reliability === "estimation" ? "border-dashed" : ""}`}
                    style={{ background: `rgba(255,255,255,${RELIABILITY[a.reliability].opacity * 0.6})` }}
                  />
                  {RELIABILITY[a.reliability].label}
                </p>
                <p className="mt-1 text-xs text-muted">{RELIABILITY[a.reliability].hint}</p>
              </div>
            )}
            {detail.perOp.length > 0 && (
              <ul className="mt-4 space-y-2">
                {detail.perOp.map((r) => (
                  <li key={`${r.operator}-${r.tech}`} className="text-xs">
                    <span className="flex justify-between gap-2">
                      <span>
                        {r.operator} {r.tech !== "inconnu" && <span className="text-muted">{r.tech.toUpperCase()}</span>}
                      </span>
                      <span className="font-mono tabular-nums">{mbps(r.median_kbps)}</span>
                    </span>
                    <span className="mt-1 block h-1.5 rounded-full bg-foreground/20" style={{ width: `${((r.median_kbps ?? 0) / maxKbps) * 100}%` }} />
                  </li>
                ))}
              </ul>
            )}
            {a && (
              <>
                <dl className="mt-4 grid grid-cols-2 gap-2 font-mono text-xs">
                  <div>
                    <dt className="text-muted">Descendant</dt>
                    <dd>{mbps(a.down_kbps)}</dd>
                  </div>
                  <div>
                    <dt className="text-muted">RTT</dt>
                    <dd>{a.rtt_ms ? `${nf.format(a.rtt_ms)} ms` : "-"}</dd>
                  </div>
                  <div>
                    <dt className="text-muted">Mesures</dt>
                    <dd>{nf.format(a.n)}</dd>
                  </div>
                  <div>
                    <dt className="text-muted">Contributeurs</dt>
                    <dd>{nf.format(a.contributors)}</dd>
                  </div>
                  <div className="col-span-2">
                    <dt className="text-muted">Période</dt>
                    <dd>{period_}</dd>
                  </div>
                </dl>
                <div className="mt-4">
                  <p className="text-xs text-muted">Heures de mesure</p>
                  <ul className="mt-2 grid grid-cols-4 gap-2">
                    {HOURS.map((h, i) => (
                      <li key={h} className="text-center">
                        <span className="flex h-10 items-end justify-center rounded-md bg-foreground/[0.08]">
                          <span className="w-3 rounded-sm bg-foreground/20" style={{ height: `${(a.hours[i] / maxHour) * 100}%` }} />
                        </span>
                        <span className="mt-1 block text-[10px] text-muted">{h}</span>
                      </li>
                    ))}
                  </ul>
                  <p className="mt-2 text-[11px] leading-relaxed text-muted">Le réseau change selon l&apos;heure : une zone mesurée seulement le soir peut être meilleure le matin.</p>
                </div>
              </>
            )}
            <div className="mt-4 border-t border-line pt-3">
              <p className="text-xs text-muted">Antennes les plus proches</p>
              {detail.near.length ? (
                <ul className="mt-2 space-y-1.5 text-xs">
                  {detail.near.map(({ i, s, d }) => (
                    <li key={i} className="flex justify-between gap-2">
                      <span>{BRAND[file!.operators[s[2]]?.name] ?? file!.operators[s[2]]?.name}</span>
                      <span className="text-muted">
                        {nf.format(Math.round(d / 10) * 10)} m, {STATUS_LABEL[s[3]].toLowerCase()}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <button type="button" onClick={() => setAntennas(true)} className="mt-2 text-xs underline underline-offset-4">
                  Afficher les antennes
                </button>
              )}
            </div>
          </aside>
        )}
      </div>

      <ul className="flex flex-wrap gap-x-5 gap-y-2 text-xs text-muted" aria-label="Légende">
        <li className="flex items-center gap-2">
          <span className="h-3 w-4 rounded-sm bg-foreground/20" aria-hidden="true" /> Bonne (5 Mbit/s et plus)
        </li>
        <li className="flex items-center gap-2">
          <span className="h-3 w-4 rounded-sm bg-[#8a8a8a]/70" aria-hidden="true" /> Moyenne (2 à 5 Mbit/s)
        </li>
        <li className="flex items-center gap-2">
          <span className="h-3 w-4 rounded-sm border border-foreground/50 bg-[repeating-linear-gradient(135deg,rgba(255,255,255,0.7)_0_1.5px,transparent_1.5px_5px)]" aria-hidden="true" /> Mauvaise (moins de 2 Mbit/s ou pertes)
        </li>
        <li className="flex items-center gap-2">
          <span className="h-3 w-4 rounded-sm border border-dashed border-foreground/80 bg-foreground/20" aria-hidden="true" /> Estimation (1 contributeur)
        </li>
        <li>Plus c&apos;est opaque, plus c&apos;est fiable</li>
      </ul>
    </div>
  );
}
