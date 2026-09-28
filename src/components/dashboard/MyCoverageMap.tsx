"use client";

import { cellToBoundary } from "h3-js";
import type { Map as MlMap } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { useEffect, useRef } from "react";

// Carte personnelle (Mes contributions) : les hexagones où j'ai mesuré en 4G/5G.
// Plein = zone publiée (score public), pointillés = pas encore publiée (moins de 5 mesures valides).

export type MyCell = { h: string; n: number; score: "bonne" | "moyenne" | "mauvaise" | "inconnue" | null; reliability: string | null };

const STYLE = "https://tiles.openfreemap.org/styles/dark";

export default function MyCoverageMap({ cells }: { cells: MyCell[] }) {
  const box = useRef<HTMLDivElement>(null);
  const map = useRef<MlMap | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const maplibre = await import("maplibre-gl");
      if (cancelled || !box.current) return;
      maplibre.setWorkerUrl("/maplibre/maplibre-gl-worker.mjs");
      const features = cells.map((c) => {
        const ring = cellToBoundary(c.h, true);
        return { type: "Feature" as const, properties: { pub: c.score !== null, score: c.score ?? "" }, geometry: { type: "Polygon" as const, coordinates: [[...ring, ring[0]]] } };
      });
      const pts = features.flatMap((f) => f.geometry.coordinates[0]);
      const m = new maplibre.Map({ container: box.current, style: STYLE, center: [-61.55, 16.25], zoom: 9, attributionControl: { compact: true } });
      m.addControl(new maplibre.NavigationControl({ showCompass: false }), "top-right");
      const ro = new ResizeObserver(() => m.resize());
      ro.observe(box.current);
      m.once("remove", () => ro.disconnect());
      m.on("load", () => {
        m.addSource("mine", { type: "geojson", data: { type: "FeatureCollection", features } });
        m.addLayer({
          id: "mine-fill",
          type: "fill",
          source: "mine",
          filter: ["==", ["get", "pub"], true],
          paint: { "fill-color": ["match", ["get", "score"], "bonne", "#ffffff", "moyenne", "#8a8a8a", "#3a3a3a"], "fill-opacity": 0.55 },
        });
        m.addLayer({ id: "mine-line", type: "line", source: "mine", filter: ["==", ["get", "pub"], true], paint: { "line-color": "#ffffff", "line-width": 0.75, "line-opacity": 0.5 } });
        m.addLayer({
          id: "mine-pending",
          type: "line",
          source: "mine",
          filter: ["==", ["get", "pub"], false],
          paint: { "line-color": "#ffffff", "line-width": 1, "line-opacity": 0.7, "line-dasharray": [2, 2] },
        });
        if (pts.length) {
          const lngs = pts.map((p) => p[0]);
          const lats = pts.map((p) => p[1]);
          m.fitBounds(
            [
              [Math.min(...lngs), Math.min(...lats)],
              [Math.max(...lngs), Math.max(...lats)],
            ],
            { padding: 40, maxZoom: 15, duration: 0 },
          );
        }
      });
      map.current = m;
    })();
    return () => {
      cancelled = true;
      map.current?.remove();
      map.current = null;
    };
  }, [cells]);

  return (
    <div>
      <div className="relative overflow-hidden rounded-xl border border-line">
        <div ref={box} className="h-[min(55dvh,420px)] min-h-[300px] w-full bg-black" />
        {cells.length === 0 && (
          <p className="pointer-events-none absolute inset-x-3 bottom-3 rounded-xl border border-line bg-black/85 p-3 text-sm text-muted">Tes zones scannées apparaîtront ici.</p>
        )}
      </div>
      <ul className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-xs text-muted" aria-label="Légende">
        <li className="flex items-center gap-2">
          <span className="h-3 w-4 rounded-sm bg-white/60" aria-hidden="true" /> Publiée sur la carte
        </li>
        <li className="flex items-center gap-2">
          <span className="h-3 w-4 rounded-sm border border-dashed border-white/80" aria-hidden="true" /> Pas encore publiée (moins de 5 mesures)
        </li>
      </ul>
    </div>
  );
}
