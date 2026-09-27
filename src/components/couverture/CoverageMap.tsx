"use client";

import { cellToBoundary, cellToLatLng } from "h3-js";
import type { GeoJSONSource, Map as MlMap } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { useEffect, useMemo, useRef, useState } from "react";
import { TERRITORIES, type TerritoryFile, type TerritoryId } from "@/lib/antennes/build.ts";
import type { HexRow } from "@/lib/coverage/public";

// Carte « Où capter » : hexagones H3 (rés. 9) colorés selon le score, dans la charte (blanc sur noir) :
// Bonne = blanc, Moyenne = gris, Mauvaise = hachures (le rouge reste réservé au direct), non scanné = rien.
// Plus une zone est ancienne, plus elle est transparente. Couche « Antennes » : fichiers Arcep de /antennes.

const STYLE = "https://tiles.openfreemap.org/styles/dark";
const PERIODS = [
  { days: 30, label: "30 j" },
  { days: 90, label: "90 j" },
  { days: 365, label: "1 an" },
];
const SCORES = { bonne: "Bonne", moyenne: "Moyenne", mauvaise: "Mauvaise", inconnue: "Inconnue" } as const;
const STATUS_LABEL = ["En service", "Maintenance", "Incident", "Statut non publié"];
const BRAND: Record<string, string> = { "Outremer Telecom": "SFR Caraïbe", SRR: "SFR Réunion" };
const nf = new Intl.NumberFormat("fr-FR");
const mbps = (kbps: number | null) => (kbps ? `${nf.format(Math.round(kbps / 100) / 10)} Mbit/s` : "–");
const dataUrl = (t: TerritoryId) => `${(process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").trim()}/storage/v1/object/public/open-data/antennes/${t}.json`;

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
      className={`whitespace-nowrap rounded-full border px-3 py-1.5 text-xs transition-colors ${on ? "border-white/40 bg-white/[0.08] text-foreground" : "border-line text-muted hover:text-foreground"}`}
    >
      {children}
    </button>
  );
}

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
  const [rows, setRows] = useState<HexRow[] | null>(null);
  const [now, setNow] = useState(0); // heure du chargement des données (filtre de période)
  const [ops, setOps] = useState<Set<string> | null>(null); // null = tous
  const [tech, setTech] = useState<"all" | "4g" | "5g">("all");
  const [period, setPeriod] = useState(90);
  const [antennas, setAntennas] = useState(false);
  const [file, setFile] = useState<TerritoryFile | null>(null);
  const [picked, setPicked] = useState<string | null>(null);
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
            "fill-opacity": ["*", ["match", ["get", "score"], "bonne", 0.55, "moyenne", 0.45, 0.2], ["max", 0.35, ["get", "f"]]],
          },
        });
        m.addLayer({ id: "hex-bad", type: "fill", source: "hex", filter: ["==", ["get", "score"], "mauvaise"], paint: { "fill-pattern": "hatch", "fill-opacity": ["max", 0.4, ["get", "f"]] } });
        m.addLayer({ id: "hex-line", type: "line", source: "hex", paint: { "line-color": "#ffffff", "line-opacity": 0.3, "line-width": 0.75 } });
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
          m.on("click", l, (e) => setPicked((e.features?.[0]?.properties?.h as string) ?? null));
          m.on("mouseenter", l, () => (m.getCanvas().style.cursor = "pointer"));
          m.on("mouseleave", l, () => (m.getCanvas().style.cursor = ""));
        }
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

  const operators = useMemo(() => [...new Set((rows ?? []).map((r) => r.operator).filter((o) => o !== "*" && o !== "inconnu"))].sort(), [rows]);

  // Une ligne par hexagone selon les filtres (meilleur opérateur retenu quand on filtre).
  const shown = useMemo(() => {
    const since = now - period * 86_400_000;
    const inPeriod = (rows ?? []).filter((r) => new Date(r.last_ts).getTime() >= since);
    if (!ops && tech === "all") return inPeriod.filter((r) => r.operator === "*");
    const byHex = new Map<string, HexRow>();
    for (const r of inPeriod) {
      if (r.operator === "*" || (ops && !ops.has(r.operator)) || (tech !== "all" && r.tech !== tech)) continue;
      const cur = byHex.get(r.h3_index);
      if (!cur || (r.median_kbps ?? 0) > (cur.median_kbps ?? 0)) byHex.set(r.h3_index, r);
    }
    return [...byHex.values()];
  }, [rows, ops, tech, period, now]);

  useEffect(() => {
    if (!ready || !map.current) return;
    (map.current.getSource("hex") as GeoJSONSource).setData({
      type: "FeatureCollection",
      features: shown.map((r) => {
        const ring = cellToBoundary(r.h3_index, true);
        return { type: "Feature", properties: { h: r.h3_index, score: r.score, f: r.freshness }, geometry: { type: "Polygon", coordinates: [[...ring, ring[0]]] } };
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
    if (!picked || !rows) return null;
    const since = now - period * 86_400_000;
    const here = rows.filter((r) => r.h3_index === picked && new Date(r.last_ts).getTime() >= since);
    const all = here.find((r) => r.operator === "*") ?? null;
    const perOp = here.filter((r) => r.operator !== "*").sort((a, b) => (b.median_kbps ?? 0) - (a.median_kbps ?? 0));
    const [lat, lng] = cellToLatLng(picked);
    const near = file
      ? file.sites
          .map((s, i) => ({ i, s, d: dist([lng, lat], [s[0], s[1]]) }))
          .sort((a, b) => a.d - b.d)
          .slice(0, 3)
      : [];
    return { all, perOp, near };
  }, [picked, rows, period, file, now]);

  const maxKbps = Math.max(1, ...(detail?.perOp ?? []).map((r) => r.median_kbps ?? 0));

  function aroundMe() {
    setGeoError(null);
    if (!navigator.geolocation) return setGeoError("Géolocalisation indisponible.");
    navigator.geolocation.getCurrentPosition(
      (p) => map.current?.flyTo({ center: [p.coords.longitude, p.coords.latitude], zoom: 14 }),
      () => setGeoError("Position refusée ou introuvable."),
      { enableHighAccuracy: true, timeout: 15_000 },
    );
  }

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
        <span className="mx-1 hidden h-5 w-px bg-line sm:block" aria-hidden="true" />
        {(["all", "4g", "5g"] as const).map((t) => (
          <Chip key={t} on={tech === t} onClick={() => setTech(t)}>
            {t === "all" ? "4G + 5G" : t.toUpperCase()}
          </Chip>
        ))}
        <span className="mx-1 hidden h-5 w-px bg-line sm:block" aria-hidden="true" />
        {PERIODS.map((p) => (
          <Chip key={p.days} on={period === p.days} onClick={() => setPeriod(p.days)}>
            {p.label}
          </Chip>
        ))}
      </div>

      <div className="relative overflow-hidden rounded-2xl border border-line">
        <div ref={box} className="h-[min(70dvh,640px)] min-h-[420px] w-full bg-black" />
        <div className="absolute left-3 top-3 flex flex-col gap-2">
          <button type="button" onClick={aroundMe} className="h-9 rounded-full bg-white px-4 text-xs font-medium text-black transition-colors hover:bg-neutral-200">
            Autour de moi
          </button>
          <button
            type="button"
            aria-pressed={antennas}
            onClick={() => setAntennas((v) => !v)}
            className={`h-9 rounded-full border px-4 text-xs backdrop-blur-sm transition-colors ${antennas ? "border-white/40 bg-black/80 text-foreground" : "border-line bg-black/60 text-muted hover:text-foreground"}`}
          >
            Antennes
          </button>
        </div>
        {rows && shown.length === 0 && (
          <p className="pointer-events-none absolute inset-x-3 bottom-12 rounded-xl border border-line bg-black/85 p-3 text-sm text-muted sm:right-auto sm:max-w-md">
            Aucune zone publiée pour ces filtres. Une zone apparaît à partir de 3 contributeurs ou 20 mesures : lance un scan avec SYXTEE Cam.
          </p>
        )}
        {geoError && <p className="absolute inset-x-3 top-24 rounded-xl border border-line bg-black/85 p-3 text-sm text-muted">{geoError}</p>}

        {detail && picked && (
          <aside
            aria-label="Détail de la zone"
            className="absolute inset-x-3 bottom-3 max-h-[60%] overflow-y-auto rounded-2xl border border-line bg-black/95 p-4 backdrop-blur-md sm:inset-x-auto sm:right-3 sm:top-3 sm:bottom-auto sm:w-80"
          >
            <div className="flex items-start justify-between gap-3">
              <p className="text-sm font-medium">
                Zone {detail.all ? SCORES[detail.all.score].toLowerCase() : "sans données"}
                {detail.all && <span className="block font-mono text-xs text-muted">{mbps(detail.all.median_kbps)} médian</span>}
              </p>
              <button type="button" onClick={() => setPicked(null)} className="-m-1 p-1 text-muted hover:text-foreground" aria-label="Fermer">
                ✕
              </button>
            </div>
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
                    <span className="mt-1 block h-1.5 rounded-full bg-white/80" style={{ width: `${((r.median_kbps ?? 0) / maxKbps) * 100}%` }} />
                  </li>
                ))}
              </ul>
            )}
            {detail.all && (
              <dl className="mt-4 grid grid-cols-2 gap-2 font-mono text-xs">
                <div>
                  <dt className="text-muted">RTT</dt>
                  <dd>{detail.all.rtt_ms ? `${nf.format(detail.all.rtt_ms)} ms` : "–"}</dd>
                </div>
                <div>
                  <dt className="text-muted">Pertes</dt>
                  <dd>{detail.all.loss_pct != null ? `${nf.format(Math.round(detail.all.loss_pct * 10) / 10)} %` : "–"}</dd>
                </div>
                <div>
                  <dt className="text-muted">Mesures</dt>
                  <dd>{nf.format(detail.all.n)}</dd>
                </div>
                <div>
                  <dt className="text-muted">Mise à jour</dt>
                  <dd>{new Date(detail.all.last_ts).toLocaleDateString("fr-FR")}</dd>
                </div>
              </dl>
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
          <span className="h-3 w-4 rounded-sm bg-white/60" aria-hidden="true" /> Bonne (5 Mbit/s et plus)
        </li>
        <li className="flex items-center gap-2">
          <span className="h-3 w-4 rounded-sm bg-[#8a8a8a]/70" aria-hidden="true" /> Moyenne (2 à 5 Mbit/s)
        </li>
        <li className="flex items-center gap-2">
          <span className="h-3 w-4 rounded-sm border border-white/40 bg-[repeating-linear-gradient(135deg,rgba(255,255,255,0.7)_0_1.5px,transparent_1.5px_5px)]" aria-hidden="true" /> Mauvaise (moins de 2 Mbit/s ou pertes)
        </li>
        <li>Zone pâle : mesures anciennes</li>
      </ul>
    </div>
  );
}
