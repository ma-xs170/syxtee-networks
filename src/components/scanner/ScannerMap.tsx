"use client";

import { cellToBoundary } from "h3-js";
import type { GeoJSONSource, Map as MlMap } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { useEffect, useRef, useState } from "react";

// Mini-carte du Scanner réseau : ma position, les hexagones publiés autour (Bonne / Moyenne / Mauvaise / Inconnue)
// et le tracé de la session, coloré en direct selon la qualité mesurée.

export type Score = "bonne" | "moyenne" | "mauvaise" | "inconnue";
export type AroundCell = { h: string; score: Score };
export type TrackSeg = { from: [number, number]; to: [number, number]; score: Score | "ecartee" };

const STYLE = "https://tiles.openfreemap.org/styles/dark";
export const SCORE_COLOR: Record<Score | "ecartee", string> = {
  bonne: "#ffffff",
  moyenne: "#8a8a8a",
  mauvaise: "#4a4a4a",
  inconnue: "#2a2a2a",
  ecartee: "#5a5a5a",
};

const hexes = (cells: AroundCell[]) => ({
  type: "FeatureCollection" as const,
  features: cells.map((c) => {
    const ring = cellToBoundary(c.h, true);
    return { type: "Feature" as const, properties: { score: c.score }, geometry: { type: "Polygon" as const, coordinates: [[...ring, ring[0]]] } };
  }),
});
const track = (segs: TrackSeg[]) => ({
  type: "FeatureCollection" as const,
  features: segs.map((s) => ({ type: "Feature" as const, properties: { score: s.score }, geometry: { type: "LineString" as const, coordinates: [s.from, s.to] } })),
});
const me = (p: [number, number] | null) => ({
  type: "FeatureCollection" as const,
  features: p ? [{ type: "Feature" as const, properties: {}, geometry: { type: "Point" as const, coordinates: p } }] : [],
});

export default function ScannerMap({ position, cells, segments }: { position: [number, number] | null; cells: AroundCell[]; segments: TrackSeg[] }) {
  const box = useRef<HTMLDivElement>(null);
  const map = useRef<MlMap | null>(null);
  const [ready, setReady] = useState(false);
  const centered = useRef(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const maplibre = await import("maplibre-gl");
      if (cancelled || !box.current) return;
      maplibre.setWorkerUrl("/maplibre/maplibre-gl-worker.mjs");
      const m = new maplibre.Map({ container: box.current, style: STYLE, center: [-61.55, 16.25], zoom: 13, attributionControl: { compact: true } });
      const ro = new ResizeObserver(() => m.resize());
      ro.observe(box.current);
      m.once("remove", () => ro.disconnect());
      m.on("load", () => {
        const empty = { type: "FeatureCollection" as const, features: [] };
        m.addSource("around", { type: "geojson", data: empty });
        m.addSource("track", { type: "geojson", data: empty });
        m.addSource("me", { type: "geojson", data: empty });
        const color = ["match", ["get", "score"], "bonne", SCORE_COLOR.bonne, "moyenne", SCORE_COLOR.moyenne, "mauvaise", SCORE_COLOR.mauvaise, SCORE_COLOR.inconnue];
        m.addLayer({ id: "around-fill", type: "fill", source: "around", paint: { "fill-color": color as never, "fill-opacity": 0.45 } });
        m.addLayer({ id: "around-line", type: "line", source: "around", paint: { "line-color": "#ffffff", "line-width": 0.6, "line-opacity": 0.35 } });
        m.addLayer({
          id: "track",
          type: "line",
          source: "track",
          layout: { "line-cap": "round", "line-join": "round" },
          paint: {
            "line-width": 4,
            "line-color": ["match", ["get", "score"], "bonne", SCORE_COLOR.bonne, "moyenne", SCORE_COLOR.moyenne, "mauvaise", SCORE_COLOR.mauvaise, SCORE_COLOR.ecartee] as never,
          },
        });
        m.addLayer({ id: "me-halo", type: "circle", source: "me", paint: { "circle-radius": 14, "circle-color": "#ffffff", "circle-opacity": 0.15 } });
        m.addLayer({ id: "me", type: "circle", source: "me", paint: { "circle-radius": 6, "circle-color": "#000000", "circle-stroke-color": "#ffffff", "circle-stroke-width": 2 } });
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

  useEffect(() => {
    const m = map.current;
    if (!ready || !m) return;
    (m.getSource("around") as GeoJSONSource | undefined)?.setData(hexes(cells));
  }, [ready, cells]);

  useEffect(() => {
    const m = map.current;
    if (!ready || !m) return;
    (m.getSource("track") as GeoJSONSource | undefined)?.setData(track(segments));
  }, [ready, segments]);

  useEffect(() => {
    const m = map.current;
    if (!ready || !m) return;
    (m.getSource("me") as GeoJSONSource | undefined)?.setData(me(position));
    if (!position) return;
    // Recentrage doux sur ma position (instantané au premier point, sans animation si mouvement réduit).
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!centered.current || reduce) m.jumpTo({ center: position, zoom: centered.current ? m.getZoom() : 14.5 });
    else m.easeTo({ center: position, duration: 600 });
    centered.current = true;
  }, [ready, position]);

  return <div ref={box} className="h-full w-full bg-black" role="img" aria-label="Carte de ta position, des zones autour et du tracé de ta session" />;
}
