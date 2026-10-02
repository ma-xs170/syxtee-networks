"use client";

import { useEffect, useRef } from "react";

// Globe filaire qui tourne, avec les serveurs de relais et leur latence. Canvas 2D (projection orthographique), sans bibliothèque 3D :
// terres, quadrillage, serveurs (point plein = en ligne, anneau = bientôt), ping affiché, arc vers le serveur choisi.
// Glisser pour tourner, clic sur un serveur pour le choisir. Pause hors écran, onglet masqué, et rotation coupée en reduced-motion.

export type GlobeServer = { id: string; city: string; lat: number; lon: number; available: boolean; /** Ping mesuré (ms), sinon estimé, sinon null. */ ping: number | null; estimated?: boolean };

const RAD = Math.PI / 180;
const TILT = 22 * RAD;
const sinT = Math.sin(TILT);
const cosT = Math.cos(TILT);

type Props = {
  servers: GlobeServer[];
  selected?: string | null;
  onSelect?: (id: string) => void;
  /** Position approximative du visiteur : un repère « toi » et un arc vers le serveur choisi. */
  geo?: { lat: number; lon: number } | null;
  className?: string;
};

export default function RelayGlobe({ servers, selected, onSelect, geo, className = "" }: Props) {
  const box = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  // Les données changent sans relancer l'animation : on les range dans une ref lue à chaque image.
  const data = useRef({ servers, selected, geo, onSelect });
  data.current = { servers, selected, geo, onSelect };
  const state = useRef({ lon0: -50 * RAD, target: null as number | null, drag: false, lastX: 0, moved: 0 });

  useEffect(() => {
    const cv = canvas.current;
    const wrap = box.current;
    if (!cv || !wrap) return;
    const ctx = cv.getContext("2d")!;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let land: Float32Array[] = [];
    let size = 0;
    let dpr = 1;
    let raf = 0;
    let visible = true;
    let last = performance.now();
    let frame = 0;
    let ink = "#fff";
    let live = "#ff3b30";
    let muted = "#888";
    let bg = "#000";

    import("./land").then(({ LAND }) => {
      land = LAND.map((r) => Float32Array.from(r, (v) => v * RAD));
    });

    const resize = () => {
      size = Math.round(wrap.clientWidth);
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      cv.width = size * dpr;
      cv.height = size * dpr;
      cv.style.height = `${size}px`;
    };
    const ro = new ResizeObserver(resize);
    ro.observe(wrap);
    resize();

    const readColors = () => {
      const cs = getComputedStyle(document.documentElement);
      ink = cs.getPropertyValue("--foreground").trim() || ink;
      live = cs.getPropertyValue("--live").trim() || live;
      muted = cs.getPropertyValue("--muted").trim() || muted;
      bg = cs.getPropertyValue("--background").trim() || bg;
    };

    /** Projection orthographique : x, y en fraction du rayon, z > 0 = face visible. */
    const project = (lon: number, lat: number, lon0: number) => {
      const dl = lon - lon0;
      const cl = Math.cos(lat);
      const z = sinT * Math.sin(lat) + cosT * cl * Math.cos(dl);
      return { x: cl * Math.sin(dl), y: cosT * Math.sin(lat) - sinT * cl * Math.cos(dl), z };
    };

    const hit = (px: number, py: number) => {
      const R = size * 0.42;
      const cx = size / 2;
      const cy = size / 2;
      for (const s of data.current.servers) {
        const p = project(s.lon * RAD, s.lat * RAD, state.current.lon0);
        if (p.z > 0.05 && Math.hypot(cx + p.x * R - px, cy - p.y * R - py) < 14) return s;
      }
      return null;
    };

    const draw = (now: number) => {
      raf = requestAnimationFrame(draw);
      if (!visible || document.hidden) {
        last = now;
        return;
      }
      const dt = Math.min(now - last, 64);
      last = now;
      frame++;
      if (frame % 60 === 1) readColors();
      const st = state.current;
      if (st.target !== null) {
        let d = st.target - st.lon0;
        d = Math.atan2(Math.sin(d), Math.cos(d));
        st.lon0 += d * Math.min(1, dt / 220);
        if (Math.abs(d) < 0.002) st.target = null;
      } else if (!st.drag && !reduce) st.lon0 += dt * 0.00011; // environ 6 degrés par seconde

      const W = size * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, size, size);
      const R = size * 0.42;
      const cx = size / 2;
      const cy = size / 2;

      // Sphère : disque légèrement teinté et contour.
      ctx.fillStyle = ink;
      ctx.globalAlpha = 0.04;
      ctx.beginPath();
      ctx.arc(cx, cy, R, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 0.5;
      ctx.strokeStyle = ink;
      ctx.lineWidth = 1.25;
      ctx.stroke();

      // Quadrillage : méridiens et parallèles tous les 30 degrés.
      ctx.globalAlpha = 0.14;
      ctx.lineWidth = 1;
      ctx.beginPath();
      const seg = (lon: number, lat: number, first: boolean, prevVisible: boolean) => {
        const p = project(lon, lat, st.lon0);
        const v = p.z > 0;
        if (v) {
          if (first || !prevVisible) ctx.moveTo(cx + p.x * R, cy - p.y * R);
          else ctx.lineTo(cx + p.x * R, cy - p.y * R);
        }
        return v;
      };
      for (let lonD = -180; lonD < 180; lonD += 30) {
        let pv = false;
        for (let latD = -90; latD <= 90; latD += 6) pv = seg(lonD * RAD, latD * RAD, latD === -90, pv);
      }
      for (let latD = -60; latD <= 60; latD += 30) {
        let pv = false;
        for (let lonD = -180; lonD <= 180; lonD += 6) pv = seg(lonD * RAD, latD * RAD, lonD === -180, pv);
      }
      ctx.stroke();

      // Terres : contours seulement (filaire).
      ctx.globalAlpha = 0.7;
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (const ring of land) {
        let pv = false;
        let pLon = 0;
        for (let i = 0; i < ring.length; i += 2) {
          const lon = ring[i];
          const p = project(lon, ring[i + 1], st.lon0);
          const v = p.z > 0;
          const wrap = i > 0 && Math.abs(lon - pLon) > Math.PI;
          if (v) {
            if (!pv || i === 0 || wrap) ctx.moveTo(cx + p.x * R, cy - p.y * R);
            else ctx.lineTo(cx + p.x * R, cy - p.y * R);
          }
          pv = v;
          pLon = lon;
        }
      }
      ctx.stroke();

      // Arc du visiteur vers le serveur choisi.
      const { servers: list, selected: sel, geo: me } = data.current;
      const target = list.find((s) => s.id === sel);
      if (me && target) {
        const a = { lat: me.lat * RAD, lon: me.lon * RAD };
        const b = { lat: target.lat * RAD, lon: target.lon * RAD };
        const d = Math.acos(Math.min(1, Math.sin(a.lat) * Math.sin(b.lat) + Math.cos(a.lat) * Math.cos(b.lat) * Math.cos(b.lon - a.lon)));
        if (d > 0.01) {
          ctx.globalAlpha = 0.9;
          ctx.strokeStyle = ink;
          ctx.setLineDash([3, 4]);
          ctx.lineWidth = 1.25;
          ctx.beginPath();
          let pv = false;
          for (let i = 0; i <= 48; i++) {
            const t = i / 48;
            const A = Math.sin((1 - t) * d) / Math.sin(d);
            const B = Math.sin(t * d) / Math.sin(d);
            const x = A * Math.cos(a.lat) * Math.cos(a.lon) + B * Math.cos(b.lat) * Math.cos(b.lon);
            const y = A * Math.cos(a.lat) * Math.sin(a.lon) + B * Math.cos(b.lat) * Math.sin(b.lon);
            const z = A * Math.sin(a.lat) + B * Math.sin(b.lat);
            const lat = Math.atan2(z, Math.hypot(x, y));
            const lon = Math.atan2(y, x);
            const p = project(lon, lat, st.lon0);
            const lift = 1 + 0.18 * Math.sin(Math.PI * t);
            const v = p.z > 0.02;
            if (v) {
              if (!pv) ctx.moveTo(cx + p.x * R * lift, cy - p.y * R * lift);
              else ctx.lineTo(cx + p.x * R * lift, cy - p.y * R * lift);
            }
            pv = v;
          }
          ctx.stroke();
          ctx.setLineDash([]);
        }
        const p = project(a.lon, a.lat, st.lon0);
        if (p.z > 0) {
          ctx.globalAlpha = 1;
          ctx.fillStyle = ink;
          ctx.fillRect(cx + p.x * R - 3, cy - p.y * R - 3, 6, 6);
          ctx.font = "10px ui-monospace, monospace";
          ctx.fillText("TOI", cx + p.x * R + 8, cy - p.y * R + 3);
        }
      }

      // Serveurs.
      ctx.font = "11px ui-monospace, monospace";
      // Étiquettes : celles du serveur en ligne et du choisi d'abord, les autres seulement si elles ne se chevauchent pas.
      const placed: { x0: number; x1: number; y0: number; y1: number }[] = [];
      const ordered = [...list].sort((a, b) => Number(b.available || b.id === sel) - Number(a.available || a.id === sel));
      for (const s of ordered) {
        const p = project(s.lon * RAD, s.lat * RAD, st.lon0);
        if (p.z <= 0.05) continue;
        const x = cx + p.x * R;
        const y = cy - p.y * R;
        const isSel = s.id === sel;
        const fade = Math.min(1, p.z * 3);
        ctx.globalAlpha = fade;
        if (s.available) {
          const pulse = (((now / 1600 + s.lon) % 1) + 1) % 1;
          ctx.strokeStyle = live;
          ctx.globalAlpha = fade * (1 - pulse) * 0.7;
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.arc(x, y, 4 + pulse * 12, 0, Math.PI * 2);
          ctx.stroke();
          ctx.globalAlpha = fade;
          ctx.fillStyle = live;
          ctx.beginPath();
          ctx.arc(x, y, 4.5, 0, Math.PI * 2);
          ctx.fill();
        } else {
          ctx.strokeStyle = ink;
          ctx.fillStyle = bg;
          ctx.lineWidth = 1.25;
          ctx.beginPath();
          ctx.arc(x, y, 3.5, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
        }
        if (isSel) {
          ctx.strokeStyle = ink;
          ctx.lineWidth = 1.25;
          ctx.beginPath();
          ctx.arc(x, y, 9, 0, Math.PI * 2);
          ctx.stroke();
        }
        ctx.fillStyle = s.available || isSel ? ink : muted;
        const label = s.ping != null ? `${s.city}  ${s.estimated ? "~" : ""}${s.ping} ms` : s.city;
        const left = x > cx + R * 0.35;
        ctx.textAlign = left ? "right" : "left";
        const w = ctx.measureText(label).width;
        const x0 = left ? x - 12 - w : x + 12;
        const box = { x0, x1: x0 + w, y0: y - 8, y1: y + 8 };
        const clash = placed.some((r) => box.x0 < r.x1 && box.x1 > r.x0 && box.y0 < r.y1 && box.y1 > r.y0);
        if (!clash || s.available || isSel) {
          placed.push(box);
          ctx.fillText(label, x + (left ? -12 : 12), y + 4);
        }
      }
      ctx.globalAlpha = 1;
      void W;
    };
    raf = requestAnimationFrame(draw);

    const io = new IntersectionObserver(([e]) => (visible = e.isIntersecting), { threshold: 0 });
    io.observe(wrap);

    const down = (e: PointerEvent) => {
      state.current.drag = true;
      state.current.lastX = e.clientX;
      state.current.moved = 0;
      state.current.target = null;
      cv.setPointerCapture(e.pointerId);
    };
    const move = (e: PointerEvent) => {
      const st = state.current;
      const r = cv.getBoundingClientRect();
      if (st.drag) {
        const dx = e.clientX - st.lastX;
        st.lastX = e.clientX;
        st.moved += Math.abs(dx);
        st.lon0 -= (dx / (size * 0.42)) * 0.9;
      } else cv.style.cursor = hit(e.clientX - r.left, e.clientY - r.top) ? "pointer" : "grab";
    };
    const up = (e: PointerEvent) => {
      const st = state.current;
      st.drag = false;
      if (st.moved < 4) {
        const r = cv.getBoundingClientRect();
        const s = hit(e.clientX - r.left, e.clientY - r.top);
        if (s) {
          st.target = s.lon * RAD;
          data.current.onSelect?.(s.id);
        }
      }
    };
    cv.addEventListener("pointerdown", down);
    cv.addEventListener("pointermove", move);
    cv.addEventListener("pointerup", up);
    cv.addEventListener("pointercancel", up);
    readColors();

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      io.disconnect();
      cv.removeEventListener("pointerdown", down);
      cv.removeEventListener("pointermove", move);
      cv.removeEventListener("pointerup", up);
      cv.removeEventListener("pointercancel", up);
    };
  }, []);

  // Choisir un serveur ailleurs (liste) : le globe tourne vers lui.
  useEffect(() => {
    const s = servers.find((x) => x.id === selected);
    if (s) state.current.target = s.lon * RAD;
  }, [selected, servers]);

  return (
    <div ref={box} className={`relative aspect-square w-full touch-pan-y select-none ${className}`}>
      <canvas ref={canvas} className="h-full w-full cursor-grab touch-pan-y" role="img" aria-label={`Globe des serveurs de relais : ${servers.map((s) => s.city).join(", ")}`} />
    </div>
  );
}
