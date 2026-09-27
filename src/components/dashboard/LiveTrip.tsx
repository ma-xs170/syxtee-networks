"use client";

import type { GeoJSONSource, Map as MlMap } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { useEffect, useRef, useState } from "react";
import { coreFetch } from "./coreClient";
import { useLiveStatus } from "./LiveStatus";
import { Tile, TileLabel } from "./ui";

// Santé du flux : trajet du direct en cours (positions envoyées par SYXTEE Cam), chaque segment coloré selon le débit
// reçu au relais à ce moment (gris foncé = faible, blanc = bon). Point rouge = position actuelle (live).

type Pos = { t: number; lat: number; lon: number };
type Sample = { t: number; bitrate: number };

const STYLE = "https://tiles.openfreemap.org/styles/dark";

/** Débit le plus proche dans le temps (échantillons triés). */
function kbpsAt(samples: Sample[], t: number) {
  let lo = 0;
  let hi = samples.length - 1;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (samples[mid].t < t) lo = mid + 1;
    else hi = mid;
  }
  const s = samples[lo];
  return s && Math.abs(s.t - t) < 10_000 ? s.bitrate : null;
}

export default function LiveTrip() {
  const { state, coreUrl } = useLiveStatus();
  const live = !!state?.live;
  const box = useRef<HTMLDivElement>(null);
  const map = useRef<MlMap | null>(null);
  const [ready, setReady] = useState(false);
  const [points, setPoints] = useState<{ p: Pos[]; s: Sample[] } | null>(null);
  const framed = useRef(false);

  useEffect(() => {
    if (!live || !coreUrl) return;
    let stopped = false;
    const load = async () => {
      try {
        const [p, h] = await Promise.all([coreFetch(coreUrl, "/v1/me/positions?range=6h"), coreFetch(coreUrl, "/v1/me/health?range=6h")]);
        if (!p.ok || !h.ok || stopped) return;
        const since = state?.started_at ?? 0;
        const pos = ((await p.json()) as { positions: Pos[] }).positions.filter((x) => x.t >= since);
        const smp = ((await h.json()) as { samples: Sample[] }).samples;
        if (!stopped) setPoints({ p: pos, s: smp });
      } catch {
        // Relais injoignable : prochain essai dans 10 s.
      }
    };
    load();
    const t = setInterval(() => document.visibilityState === "visible" && load(), 10_000);
    return () => {
      stopped = true;
      clearInterval(t);
    };
  }, [live, coreUrl, state?.started_at]);

  const hasTrip = (points?.p.length ?? 0) >= 2;

  useEffect(() => {
    if (!hasTrip || map.current) return;
    let cancelled = false;
    (async () => {
      const maplibre = await import("maplibre-gl");
      if (cancelled || !box.current) return;
      maplibre.setWorkerUrl("/maplibre/maplibre-gl-worker.mjs");
      const m = new maplibre.Map({ container: box.current, style: STYLE, center: [-61.53, 16.24], zoom: 12, attributionControl: { compact: true } });
      m.on("load", () => {
        const empty = { type: "FeatureCollection" as const, features: [] };
        m.addSource("trip", { type: "geojson", data: empty });
        m.addSource("here", { type: "geojson", data: empty });
        m.addLayer({
          id: "trip",
          type: "line",
          source: "trip",
          layout: { "line-cap": "round", "line-join": "round" },
          paint: {
            "line-color": ["interpolate", ["linear"], ["coalesce", ["get", "k"], 0], 0, "#3a3a3a", 2000, "#8a8a8a", 5000, "#ffffff"],
            "line-width": 4,
          },
        });
        m.addLayer({ id: "here", type: "circle", source: "here", paint: { "circle-color": "#ff3b30", "circle-radius": 6, "circle-stroke-color": "#000", "circle-stroke-width": 2 } });
        setReady(true);
      });
      map.current = m;
    })();
    return () => {
      cancelled = true;
    };
  }, [hasTrip]);

  useEffect(() => () => map.current?.remove(), []);

  useEffect(() => {
    const m = map.current;
    if (!ready || !m || !points || points.p.length < 2) return;
    const { p, s } = points;
    (m.getSource("trip") as GeoJSONSource).setData({
      type: "FeatureCollection",
      features: p.slice(1).map((b, i) => ({
        type: "Feature",
        properties: { k: kbpsAt(s, b.t) },
        geometry: { type: "LineString", coordinates: [[p[i].lon, p[i].lat], [b.lon, b.lat]] },
      })),
    });
    const last = p[p.length - 1];
    (m.getSource("here") as GeoJSONSource).setData({ type: "FeatureCollection", features: [{ type: "Feature", properties: {}, geometry: { type: "Point", coordinates: [last.lon, last.lat] } }] });
    if (!framed.current) {
      const lons = p.map((x) => x.lon);
      const lats = p.map((x) => x.lat);
      m.fitBounds([[Math.min(...lons), Math.min(...lats)], [Math.max(...lons), Math.max(...lats)]], { padding: 40, maxZoom: 16, duration: 0 });
      framed.current = true;
    } else m.easeTo({ center: [last.lon, last.lat] });
  }, [ready, points]);

  return (
    <Tile aria-labelledby="trajet">
      <TileLabel id="trajet">Trajet du direct</TileLabel>
      {live && hasTrip ? (
        <>
          <div ref={box} data-sensitive className="mt-4 h-72 overflow-hidden rounded-xl border border-line" />
          <p className="mt-2 text-xs text-muted">Couleur du trait : débit reçu au relais (gris foncé = faible, blanc = bon).</p>
        </>
      ) : (
        <p className="mt-4 text-sm text-muted">
          {live ? "Pas encore de position : active « Envoyer ma position » dans SYXTEE Cam." : "Le trajet s'affiche ici pendant un direct avec SYXTEE Cam."}
        </p>
      )}
    </Tile>
  );
}
