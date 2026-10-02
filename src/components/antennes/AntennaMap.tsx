"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { GeoJSONSource, Map as MlMap } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { BANDS_5G, TECH, TERRITORIES, type Outage, type Status, type TerritoryFile, type TerritoryId } from "@/lib/antennes/build.ts";

// Carte des antennes : MapLibre + fond OpenFreeMap « Dark » (gratuit, sans clé, usage commercial autorisé).
// Données : fichiers par territoire publiés chaque jour dans le stockage public Supabase (voir /api/cron/antennes).
//
// Couleurs des opérateurs : 3 teintes validées « toutes paires » sur fond noir (daltonisme + vision normale, skill dataviz)
// + blanc neutre pour le 4e opérateur. Au-delà de 3 couleurs sur un nuage de points, l'opérateur reste aussi lisible par la
// légende et la fiche au clic (encodage secondaire). Statuts : anneau jaune (maintenance) ou rouge (incident) + libellé.

const STYLE = "https://tiles.openfreemap.org/styles/dark";
const OP_COLORS = ["#3987e5", "#d95926", "#199e70", "#e8e8e8", "#8a8a8a"];
const opColor = (i: number) => OP_COLORS[Math.min(i, OP_COLORS.length - 1)];
const STATUS = [
  { id: 0 as Status, label: "En service", ring: null },
  { id: 1 as Status, label: "Maintenance", ring: "#fab219" },
  { id: 2 as Status, label: "Incident", ring: "#d03b3b" },
  { id: 3 as Status, label: "Statut non publié", ring: null },
];

type Picked = { i: number; lng: number; lat: number };

/** Nom commercial des opérateurs (l'Arcep publie la raison sociale). */
const BRAND: Record<string, string> = { "Outremer Telecom": "SFR Caraïbe", SRR: "SFR Réunion" };
const brand = (name: string) => BRAND[name] ?? name;

const dataUrl = (t: TerritoryId) =>
  `${(process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").trim()}/storage/v1/object/public/open-data/antennes/${t}.json`;

const fmtDate = (s: string | null) =>
  s ? new Date(s.replace(" ", "T")).toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" }) : null;

function techList(flags: number) {
  return (["2G", "3G", "4G", "5G"] as const).filter((_, k) => flags & (1 << k));
}

function Chip({ on, onClick, children, color }: { on: boolean; onClick: () => void; children: React.ReactNode; color?: string }) {
  return (
    <button
      type="button"
      aria-pressed={on}
      onClick={onClick}
      className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs transition-colors ${
        on ? "border-foreground/40 bg-foreground/[0.12] text-foreground" : "border-line text-muted hover:text-foreground"
      }`}
    >
      {color && <span className="h-2.5 w-2.5 rounded-full" style={{ background: color, opacity: on ? 1 : 0.35 }} aria-hidden="true" />}
      {children}
    </button>
  );
}

export default function AntennaMap() {
  const box = useRef<HTMLDivElement>(null);
  const map = useRef<MlMap | null>(null);
  const [ready, setReady] = useState(false);
  const [territory, setTerritory] = useState<TerritoryId>("971");
  const [file, setFile] = useState<TerritoryFile | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [ops, setOps] = useState<Set<number> | null>(null); // null = tous
  const [tech, setTech] = useState<"all" | "4g" | "5g">("all");
  const [statuses, setStatuses] = useState<Set<Status>>(new Set([0, 1, 2, 3]));
  const [picked, setPicked] = useState<Picked | null>(null);

  // Carte (chargée côté navigateur uniquement ; MapLibre pèse ~250 Ko compressé).
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const maplibre = await import("maplibre-gl");
      if (cancelled || !box.current) return;
      // Worker servi depuis /public (même origine) : Turbopack ne l'embarque pas. Après une mise à jour de
      // maplibre-gl : npm run maplibre:worker.
      maplibre.setWorkerUrl("/maplibre/maplibre-gl-worker.mjs");
      const t = TERRITORIES[0];
      const m = new maplibre.Map({ container: box.current, style: STYLE, center: t.center, zoom: t.zoom, attributionControl: { compact: true } });
      m.addControl(new maplibre.NavigationControl({ showCompass: false }), "top-right");
      m.on("load", () => {
        m.addSource("sites", { type: "geojson", data: { type: "FeatureCollection", features: [] }, cluster: true, clusterRadius: 38, clusterMaxZoom: 10 });
        m.addLayer({
          id: "clusters",
          type: "circle",
          source: "sites",
          filter: ["has", "point_count"],
          paint: {
            "circle-color": "#ffffff",
            "circle-opacity": 0.1,
            "circle-stroke-color": "#ffffff",
            "circle-stroke-opacity": 0.45,
            "circle-stroke-width": 1,
            "circle-radius": ["step", ["get", "point_count"], 14, 50, 18, 500, 24, 5000, 30],
          },
        });
        m.addLayer({
          id: "cluster-count",
          type: "symbol",
          source: "sites",
          filter: ["has", "point_count"],
          layout: { "text-field": ["get", "point_count_abbreviated"], "text-font": ["Noto Sans Regular"], "text-size": 11 },
          paint: { "text-color": "#f5f5f5" },
        });
        m.addLayer({
          id: "sites",
          type: "circle",
          source: "sites",
          filter: ["!", ["has", "point_count"]],
          paint: {
            "circle-color": ["match", ["get", "op"], 0, OP_COLORS[0], 1, OP_COLORS[1], 2, OP_COLORS[2], 3, OP_COLORS[3], OP_COLORS[4]],
            "circle-radius": ["interpolate", ["linear"], ["zoom"], 8, 3.5, 13, 6, 16, 8],
            "circle-stroke-color": ["match", ["get", "st"], 1, "#fab219", 2, "#d03b3b", "#000000"],
            "circle-stroke-width": ["match", ["get", "st"], 1, 2.5, 2, 2.5, 1],
          },
        });
        m.on("click", "clusters", (e) => {
          const id = e.features?.[0]?.properties?.cluster_id as number | undefined;
          if (id === undefined) return;
          (m.getSource("sites") as GeoJSONSource).getClusterExpansionZoom(id).then((zoom) => m.easeTo({ center: e.lngLat, zoom }));
        });
        m.on("click", "sites", (e) => {
          const i = e.features?.[0]?.properties?.i as number | undefined;
          if (i !== undefined) setPicked({ i, lng: e.lngLat.lng, lat: e.lngLat.lat });
        });
        for (const l of ["clusters", "sites"]) {
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

  const selectTerritory = (t: TerritoryId) => {
    setTerritory(t);
    setFile(null);
    setError(null);
    setPicked(null);
    setOps(null);
  };

  // Données du territoire choisi.
  useEffect(() => {
    let cancelled = false;
    fetch(dataUrl(territory))
      .then((r) => (r.ok ? (r.json() as Promise<TerritoryFile>) : Promise.reject(new Error(String(r.status)))))
      .then((f) => !cancelled && setFile(f))
      .catch(() => !cancelled && setError("Données indisponibles pour le moment. Réessaie dans quelques minutes."));
    const t = TERRITORIES.find((x) => x.id === territory)!;
    map.current?.flyTo({ center: t.center, zoom: t.zoom, duration: 900 });
    return () => {
      cancelled = true;
    };
  }, [territory]);

  // Filtres appliqués avant le regroupement : on renvoie les points visibles à la source.
  const visible = useMemo(() => {
    if (!file) return null;
    const need = tech === "4g" ? TECH.g4 : tech === "5g" ? TECH.g5 : 0;
    const features = [];
    for (let i = 0; i < file.sites.length; i++) {
      const [lon, lat, op, st, fl] = file.sites[i];
      if (ops && !ops.has(op)) continue;
      if (need && !(fl & need)) continue;
      if (!statuses.has(st)) continue;
      features.push({ type: "Feature" as const, geometry: { type: "Point" as const, coordinates: [lon, lat] }, properties: { i, op, st } });
    }
    return { type: "FeatureCollection" as const, features };
  }, [file, ops, tech, statuses]);

  useEffect(() => {
    if (ready && visible) (map.current?.getSource("sites") as GeoJSONSource | undefined)?.setData(visible);
  }, [ready, visible]);

  const published = file?.operators.some((o) => o.statusPublished) ?? false;
  const site = picked && file ? file.sites[picked.i] : null;
  const outage: Outage | undefined = picked && file ? file.outages[picked.i] : undefined;
  const toggle = <T,>(set: Set<T>, v: T) => {
    const n = new Set(set);
    if (n.has(v)) n.delete(v);
    else n.add(v);
    return n;
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[300px_minmax(0,1fr)]">
      {/* Filtres + légende (sous la carte sur mobile) */}
      <div className="order-2 space-y-6 lg:order-1">
        <div>
          <label htmlFor="territoire" className="block text-sm font-medium text-foreground/80">
            Territoire
          </label>
          <select
            id="territoire"
            value={territory}
            onChange={(e) => selectTerritory(e.target.value as TerritoryId)}
            className="mt-2 h-11 w-full appearance-none rounded-xl border border-foreground/20 bg-foreground/[0.08] px-4 text-sm text-foreground focus:border-foreground/40 focus:outline-none"
          >
            {TERRITORIES.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </div>

        <fieldset>
          <legend className="text-sm font-medium text-foreground/80">Opérateurs</legend>
          <div className="mt-2 flex flex-wrap gap-2">
            {file?.operators.map((o, i) => (
              <Chip key={o.name} color={opColor(i)} on={!ops || ops.has(i)} onClick={() => setOps(toggle(ops ?? new Set(file.operators.map((_, k) => k)), i))}>
                {brand(o.name)} <span className="tabular-nums text-muted">{o.count.toLocaleString("fr-FR")}</span>
              </Chip>
            ))}
            {!file && <span className="text-xs text-muted">Chargement…</span>}
          </div>
        </fieldset>

        <fieldset>
          <legend className="text-sm font-medium text-foreground/80">Technologie</legend>
          <div className="mt-2 flex flex-wrap gap-2">
            {(["all", "4g", "5g"] as const).map((t) => (
              <Chip key={t} on={tech === t} onClick={() => setTech(t)}>
                {t === "all" ? "Toutes" : t.toUpperCase()}
              </Chip>
            ))}
          </div>
        </fieldset>

        <fieldset>
          <legend className="text-sm font-medium text-foreground/80">Statut</legend>
          <div className={`mt-2 flex flex-wrap gap-2 ${file && !published ? "hidden" : ""}`}>
            {STATUS.filter((s) => s.id !== 3).map((s) => (
              <Chip key={s.id} on={statuses.has(s.id)} onClick={() => setStatuses(toggle(statuses, s.id))}>
                {s.ring && <span className="h-2.5 w-2.5 rounded-full border-2" style={{ borderColor: s.ring }} aria-hidden="true" />}
                {s.label}
              </Chip>
            ))}
          </div>
          {file && !published && (
            <p className="mt-2 text-xs leading-relaxed text-muted">
              L&apos;Arcep ne publie pas les pannes et maintenances des opérateurs de ce territoire : statut « non publié ».
            </p>
          )}
          {file && published && (
            <p className="mt-3 text-xs leading-relaxed text-muted">
              {Object.keys(file.outages).length.toLocaleString("fr-FR")} sites indisponibles ce jour.
            </p>
          )}
        </fieldset>

        {visible && (
          <p className="font-mono text-xs text-muted">
            {visible.features.length.toLocaleString("fr-FR")} sites affichés
          </p>
        )}
      </div>

      {/* Carte */}
      <div className="relative order-1 overflow-hidden rounded-2xl border border-line lg:order-2">
        <div ref={box} className="h-[62dvh] min-h-[420px] w-full bg-[#0a0a0a] lg:h-[70dvh]" />
        {error && <p className="absolute inset-x-4 top-4 rounded-xl bg-background/85 p-4 text-sm text-red-400/90">{error}</p>}

        {site && file && (
          <div className="absolute bottom-3 left-3 right-3 max-w-sm rounded-2xl border border-line bg-background/90 p-4 backdrop-blur-md sm:right-auto" role="dialog" aria-label="Détail du site">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="flex items-center gap-2 text-sm font-medium">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ background: opColor(site[2]) }} aria-hidden="true" />
                  {brand(file.operators[site[2]].name)}
                </p>
                <p className="mt-1 text-xs text-muted">{file.communes[site[5]]}</p>
              </div>
              <button type="button" onClick={() => setPicked(null)} className="text-muted hover:text-foreground" aria-label="Fermer">
                ✕
              </button>
            </div>
            <p className="mt-3 font-mono text-xs">{techList(site[4]).join(" · ") || "Technologies non précisées"}</p>
            {site[4] & TECH.g5 ? (
              <p className="mt-1 text-xs text-muted">5G : {BANDS_5G.filter((b) => site[4] & b.bit).map((b) => b.label).join(", ") || "bandes non précisées"}</p>
            ) : null}
            <div className="mt-3 border-t border-line pt-3 text-xs">
              {site[3] === 3 ? (
                <p className="text-muted">Statut non publié par l&apos;Arcep pour cet opérateur.</p>
              ) : outage ? (
                <div className="space-y-1">
                  <p className="font-medium" style={{ color: STATUS[site[3]].ring ?? undefined }}>
                    {outage.reason === "MAINT" ? "Maintenance" : "Incident"}
                    {outage.detail ? ` · ${outage.detail}` : ""}
                  </p>
                  {outage.down.length > 0 && <p className="text-muted">Hors service : {outage.down.join(", ")}</p>}
                  {outage.start && <p className="text-muted">Depuis le {fmtDate(outage.start)}</p>}
                  {outage.end && <p className="text-muted">Fin prévue le {fmtDate(outage.end)}</p>}
                </div>
              ) : (
                <p className="text-muted">En service</p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
