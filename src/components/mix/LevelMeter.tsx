"use client";

import { useEffect, useRef, useState } from "react";

// VU-mètre stéréo de la console (strips, vignettes, master) : 2 barres L/R, échelle -60 à 0 dB, zones vert / jaune / orange /
// rouge, PEAK HOLD (1,5 s), voyant CLIP qui reste allumé jusqu'au clic, valeur du pic en dB. Attaque immédiate, relâchement
// lissé (~300 ms). Dessiné sur un <canvas> par requestAnimationFrame : React ne re-rend jamais à chaque image.
//
// Source des niveaux :
//  - `analyser` : un AnalyserNode Web Audio branché sur le flux réel d'un relais (niveau crête de chaque canal) ;
//  - sinon un signal SIMULÉ (parole / musique avec pics), pour la maquette.

const DB_MIN = -60;
const TICKS = [-60, -40, -30, -20, -12, -6, -3, 0];
const HOLD_MS = 1500;
const RELEASE_MS = 300;

const toPos = (db: number) => Math.min(1, Math.max(0, (db - DB_MIN) / -DB_MIN));
/** Couleur d'une graduation : vert jusqu'à -18 dB, jaune jusqu'à -6, orange jusqu'à -2, rouge au-dessus. */
const zone = (db: number) => (db > -2 ? "#ef4444" : db > -6 ? "#f97316" : db > -18 ? "#eab308" : "#22c55e");

/** Niveau simulé en dB d'un canal à l'instant t (secondes) : enveloppe de syllabes, silences, pics aléatoires. */
function simDb(t: number, seed: number, hot: boolean) {
  const syl = 0.5 + 0.5 * Math.sin(t * 5.1 + seed * 3) * Math.sin(t * 1.3 + seed);
  const phrase = Math.sin(t * 0.37 + seed * 7) > -0.35 ? 1 : 0.04;
  const burst = Math.random() < 0.012 ? 1 : 0;
  const base = -42 + 30 * syl * phrase + (Math.random() - 0.5) * 5;
  return Math.min(hot ? 1 : -1, base + burst * (hot ? 24 : 12));
}

export type MeterSource = { analyser?: AnalyserNode | null };

export default function LevelMeter({
  active,
  vertical = true,
  hot = false,
  seed = 0,
  scale = false,
  barWidth = 5,
  source,
  className = "",
  label,
}: {
  active: boolean;
  vertical?: boolean;
  /** Signal simulé qui atteint parfois 0 dB (pour montrer le CLIP). */
  hot?: boolean;
  seed?: number;
  /** Affiche les graduations (strips et master). */
  scale?: boolean;
  barWidth?: number;
  source?: MeterSource;
  className?: string;
  label?: string;
}) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const peakText = useRef<HTMLSpanElement>(null);
  const [clip, setClip] = useState(false);
  const clipRef = useRef(false);
  const live = useRef({ active, hot, seed, source });
  useEffect(() => {
    live.current = { active, hot, seed, source };
  });

  useEffect(() => {
    const cv = canvas.current;
    if (!cv) return;
    const ctx = cv.getContext("2d");
    if (!ctx) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const state = [
      { level: DB_MIN, peak: DB_MIN, peakAt: 0 },
      { level: DB_MIN, peak: DB_MIN, peakAt: 0 },
    ];
    let raf = 0;
    let last = performance.now();
    let lastText = 0;
    let buf: Float32Array<ArrayBuffer> | null = null;
    let w = 0;
    let h = 0;
    let dpr = 1;
    let fg = "rgb(255 255 255)";

    const fit = () => {
      dpr = Math.min(2, window.devicePixelRatio || 1);
      const r = cv.getBoundingClientRect();
      w = r.width;
      h = r.height;
      cv.width = Math.round(w * dpr);
      cv.height = Math.round(h * dpr);
      fg = getComputedStyle(cv).color;
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(cv);

    const read = (i: number, t: number) => {
      const { active: on, hot: hh, seed: sd, source: src } = live.current;
      if (!on) return DB_MIN;
      const an = src?.analyser;
      if (an) {
        buf ??= new Float32Array(an.fftSize);
        an.getFloatTimeDomainData(buf);
        let pk = 0;
        for (let k = 0; k < buf.length; k++) pk = Math.max(pk, Math.abs(buf[k]));
        return pk > 0 ? 20 * Math.log10(pk) : DB_MIN;
      }
      return simDb(t, sd + i * 0.37, hh);
    };

    const draw = (now: number) => {
      const dt = now - last;
      last = now;
      const t = now / 1000;
      const tickSpace = scale ? 22 : 0;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);
      const bars = barWidth * 2 + 2;
      const x0 = vertical ? (scale ? tickSpace : Math.max(0, (w - bars) / 2)) : 0;
      let maxPeak = DB_MIN;

      state.forEach((s, i) => {
        const db = reduce ? (live.current.active ? -20 : DB_MIN) : read(i, t);
        if (db >= s.level) s.level = db;
        else s.level = Math.max(DB_MIN, s.level - (dt / RELEASE_MS) * (s.level - db + 6));
        if (s.level >= s.peak || now - s.peakAt > HOLD_MS) {
          if (s.level >= s.peak) {
            s.peak = s.level;
            s.peakAt = now;
          } else s.peak = Math.max(s.level, s.peak - dt * 0.04);
        }
        if (s.peak > maxPeak) maxPeak = s.peak;
        if (s.level >= -0.2 && !clipRef.current) {
          clipRef.current = true;
          setClip(true);
        }

        // Fond de la barre, puis la barre colorée par zones.
        const bx = vertical ? x0 + i * (barWidth + 2) : 0;
        const by = vertical ? 0 : i * (barWidth + 2);
        const len = vertical ? h : w - 0;
        ctx.globalAlpha = 0.14;
        ctx.fillStyle = fg;
        if (vertical) ctx.fillRect(bx, by, barWidth, len);
        else ctx.fillRect(bx, by, len, barWidth);
        ctx.globalAlpha = 1;

        const fill = toPos(s.level) * len;
        const steps = [
          [-60, -18],
          [-18, -6],
          [-6, -2],
          [-2, 0],
        ] as const;
        for (const [a, b] of steps) {
          const from = toPos(a) * len;
          const to = Math.min(fill, toPos(b) * len);
          if (to <= from) continue;
          ctx.fillStyle = zone((a + b) / 2);
          if (vertical) ctx.fillRect(bx, len - to, barWidth, to - from);
          else ctx.fillRect(bx + from, by, to - from, barWidth);
        }
        // Trait de peak hold.
        const pp = toPos(s.peak) * len;
        ctx.fillStyle = fg;
        if (vertical) ctx.fillRect(bx, Math.max(0, len - pp - 1), barWidth, 2);
        else ctx.fillRect(Math.min(len - 2, pp), by, 2, barWidth);
      });

      if (scale && vertical) {
        ctx.font = "9px ui-monospace, monospace";
        ctx.textBaseline = "middle";
        ctx.textAlign = "right";
        for (const db of TICKS) {
          const y = h - toPos(db) * h;
          ctx.globalAlpha = 0.55;
          ctx.fillStyle = fg;
          ctx.fillText(String(db), tickSpace - 4, Math.min(h - 5, Math.max(5, y)));
          ctx.fillRect(tickSpace - 2, y, 2, 1);
        }
        ctx.globalAlpha = 1;
      }

      if (peakText.current && now - lastText > 120) {
        lastText = now;
        peakText.current.textContent = maxPeak <= DB_MIN + 0.5 ? "−∞" : `${maxPeak > 0 ? "+" : ""}${maxPeak.toFixed(1)}`;
      }
      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, [vertical, scale, barWidth]);

  return (
    <div style={vertical && scale ? { width: 22 + barWidth * 2 + 4 } : undefined} className={`flex ${vertical ? "h-full flex-col items-center gap-1" : "w-full flex-col gap-1"} ${className}`} role="img" aria-label={label ?? (active ? "Niveau audio" : "Pas de signal audio")}>
      {vertical && (
        <div className="flex w-full items-center justify-between gap-1">
          <span ref={peakText} className="font-mono text-[9px] tabular-nums text-muted">
            −∞
          </span>
          <button
            type="button"
            onClick={() => {
              clipRef.current = false;
              setClip(false);
            }}
            aria-label={clip ? "CLIP : cliquer pour réinitialiser" : "Pas de saturation"}
            title={clip ? "CLIP : cliquer pour réinitialiser" : "CLIP"}
            className={`h-2.5 w-2.5 shrink-0 rounded-full border ${clip ? "border-red-500 bg-red-500" : "border-line bg-transparent"}`}
          />
        </div>
      )}
      <canvas ref={canvas} className={`text-foreground ${vertical ? "min-h-0 w-full flex-1" : "h-3 w-full"}`} aria-hidden="true" />
    </div>
  );
}
