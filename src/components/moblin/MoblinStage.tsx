"use client";

import Image from "next/image";
import { motion, useTransform, type MotionValue } from "motion/react";
import PhoneAndroid from "@/components/illustrations/PhoneAndroid";
import { bitrate } from "@/components/relay/streamHealth";
import { band, clamp01, lerp, ramp } from "@/components/story/timeline";
import { useStoryClock } from "@/components/story/useStoryClock";
import PhoneLandscape from "./PhoneLandscape";
import ScreenLandscape from "./ScreenLandscape";

// Visuel persistant du ScrollStory /moblin, piloté par le progrès global `p` (4 scènes de 0,25) :
// 1. l'iPhone arrive en rotation 3D ; 2. panneau Bonding, tunnel, la CELL chute et le Wi-Fi compense ;
// 3. réglages : l'URL se tape, GO LIVE, puis chat et viewers ; 4. un 2e téléphone (eSIM Saily + Moblink) s'ajoute.
// L'interface est inspirée de Moblin, simplifiée (pas une copie).

export const SRTLA_URL = "srtla://<ADRESSE_RELAIS>:<PORT>?streamid=…";
const CHAT = ["la vue est folle 🌅", "on voit super bien", "t'es où exactement ?", "gg le live 🔥"];

// Débits par lien (kbit/s) selon le progrès : total stable autour de 6 000, puis ~9 000 avec Saily.
function links(v: number, t: number) {
  const drop = band(v, 0.34, 0.4, 0.44, 0.48);
  const cell = lerp(3400, 520, drop);
  const saily = 3000 * ramp(v, 0.84, 0.9);
  const jitter = bitrate(t) - 6000;
  const wifi = 6000 - cell + jitter;
  return { cell, wifi, saily, total: cell + wifi + saily };
}
const fmt = (n: number) => Math.round(n).toLocaleString("fr-FR");

function Bars({ level, label }: { level: MotionValue<number>; label: string }) {
  return (
    <span className="flex items-end gap-[0.6cqh]">
      <span className="mr-[0.8cqh] font-mono text-[3.4cqh] leading-none text-white/80">{label}</span>
      {[0, 1, 2, 3].map((k) => (
        <Bar key={k} k={k} level={level} />
      ))}
    </span>
  );
}
function Bar({ k, level }: { k: number; level: MotionValue<number> }) {
  const opacity = useTransform(level, (l) => (l * 4 > k + 0.3 ? 1 : 0.25));
  return <motion.span className="w-[0.9cqh] rounded-[0.2cqh] bg-white" style={{ height: `${1.4 + k * 0.9}cqh`, opacity }} />;
}

function Icon({ d }: { d: string }) {
  return (
    <span className="flex h-[11cqh] w-[11cqh] items-center justify-center rounded-full border border-accent/70 bg-black/30">
      <svg viewBox="0 0 24 24" className="h-[5.5cqh] w-[5.5cqh]" fill="none" stroke="#fff" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d={d} />
      </svg>
    </span>
  );
}
const ICONS = [
  "M3 8.5A1.5 1.5 0 0 1 4.5 7h2.3l1.4-2h7.6l1.4 2h2.3A1.5 1.5 0 0 1 21 8.5v9a1.5 1.5 0 0 1-1.5 1.5h-15A1.5 1.5 0 0 1 3 17.5zM12 16.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7z", // caméra
  "M12 3a3 3 0 0 1 3 3v5a3 3 0 0 1-6 0V6a3 3 0 0 1 3-3zM6 11a6 6 0 0 0 12 0M12 17v4", // micro
  "M4 7l8-4 8 4-8 4zM4 12l8 4 8-4M4 17l8 4 8-4", // scènes
  "M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM19 12l2-1-1-3-2 .3-1.3-1.3.3-2-3-1-1 2h-2l-1-2-3 1 .3 2L5 7.3 3 7 2 10l2 1v2l-2 1 1 3 2-.3 1.3 1.3-.3 2 3 1 1-2h2l1 2 3-1-.3-2 1.3-1.3 2 .3 1-3-2-1z", // réglages
];

/** Interface Moblin simplifiée : logo, LIVE + timer, débit, barres de connexion, boutons ronds. */
function LiveUI({ p, time }: { p: MotionValue<number>; time: MotionValue<number> }) {
  const timer = useTransform(time, (t) => {
    const s = Math.floor(754 + t);
    return `00:${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
  });
  const rate = useTransform([p, time], ([v, t]: number[]) => `${fmt(links(v, t).total)} kbps`);
  const cellLvl = useTransform([p, time], ([v, t]: number[]) => clamp01(links(v, t).cell / 3400));
  const wifiLvl = useTransform([p, time], ([v, t]: number[]) => clamp01(links(v, t).wifi / 5000));
  const sailyLvl = useTransform(p, (v) => ramp(v, 0.84, 0.9));
  return (
    <div className="absolute inset-0 p-[5cqh] pl-[9cqw]">
      <div className="flex items-center gap-[2.2cqh]">
        <Image src="/images/moblin/icon.png" alt="" width={20} height={20} className="h-[8cqh] w-[8cqh] rounded-[22%]" />
        <span className="rounded-[1cqh] bg-[var(--live)] px-[1.6cqh] py-[0.4cqh] font-mono text-[3.6cqh] font-semibold leading-none text-white">LIVE</span>
        <motion.span className="font-mono text-[3.8cqh] leading-none text-white">{timer}</motion.span>
        <motion.span className="font-mono text-[3.8cqh] leading-none text-white/85">{rate}</motion.span>
      </div>
      <div className="mt-[2.6cqh] flex gap-[3cqh]">
        <Bars level={cellLvl} label="CELL" />
        <Bars level={wifiLvl} label="WI-FI" />
        <motion.span style={{ opacity: sailyLvl }}>
          <Bars level={sailyLvl} label="CELL 2" />
        </motion.span>
      </div>
      <div className="absolute right-[4cqw] top-1/2 flex -translate-y-1/2 flex-col gap-[3cqh]">
        {ICONS.map((d) => (
          <Icon key={d} d={d} />
        ))}
      </div>
    </div>
  );
}

function PanelRow({ label, value, max }: { label: string; value: MotionValue<number>; max: number }) {
  const width = useTransform(value, (x) => `${clamp01(x / max) * 100}%`);
  const text = useTransform(value, (x) => fmt(x));
  return (
    <div className="grid grid-cols-[22cqh_1fr_18cqh] items-center gap-[2cqh]">
      <span className="font-mono text-[3.4cqh] text-white/80">{label}</span>
      <span className="h-[2.2cqh] overflow-hidden rounded-full bg-accent/20">
        <motion.span className="block h-full rounded-full bg-white" style={{ width }} />
      </span>
      <motion.span className="text-right font-mono text-[3.4cqh] text-white">{text}</motion.span>
    </div>
  );
}

/** Panneau « Bonding » par-dessus le paysage : un débit par lien, le total au centre, la jauge de marge (scène 4). */
function BondingPanel({ p, time }: { p: MotionValue<number>; time: MotionValue<number> }) {
  const opacity = useTransform(p, (v) => Math.max(band(v, 0.27, 0.31, 0.46, 0.5), ramp(v, 0.8, 0.83)));
  const cell = useTransform([p, time], ([v, t]: number[]) => links(v, t).cell);
  const wifi = useTransform([p, time], ([v, t]: number[]) => links(v, t).wifi);
  const saily = useTransform(p, (v) => links(v, 0).saily);
  const sailyO = useTransform(p, (v) => ramp(v, 0.82, 0.85));
  const total = useTransform([p, time], ([v, t]: number[]) => fmt(links(v, t).total));
  const margin = useTransform(p, (v) => lerp(0.34, 0.86, ramp(v, 0.86, 0.92)));
  const marginW = useTransform(margin, (m) => `${m * 100}%`);
  const marginColor = useTransform(margin, (m) => (m > 0.6 ? "#4ade80" : "#ffffff"));
  const marginO = useTransform(p, (v) => ramp(v, 0.84, 0.88));
  return (
    <motion.div className="absolute inset-x-[10cqw] top-[12cqh] rounded-[4cqh] border border-accent/35 bg-black/75 p-[4cqh] backdrop-blur-sm" style={{ opacity }}>
      <div className="flex items-baseline justify-between">
        <span className="font-mono text-[3.4cqh] uppercase tracking-[0.15em] text-white/70">Bonding</span>
        <span className="font-mono text-[3.4cqh] text-white/60">kbps</span>
      </div>
      <p className="mt-[1cqh] text-center font-mono text-[13cqh] leading-none text-white">
        <motion.span>{total}</motion.span>
      </p>
      <div className="mt-[3cqh] space-y-[2cqh]">
        <PanelRow label="CELL · 5G" value={cell} max={4000} />
        <PanelRow label="WI-FI" value={wifi} max={6000} />
        <motion.div style={{ opacity: sailyO }}>
          <PanelRow label="CELL 2 · SAILY" value={saily} max={4000} />
        </motion.div>
      </div>
      <motion.div className="mt-[3cqh] flex items-center gap-[2cqh]" style={{ opacity: marginO }}>
        <span className="font-mono text-[3.2cqh] text-white/70">MARGE</span>
        <span className="h-[1.6cqh] flex-1 overflow-hidden rounded-full bg-accent/20">
          <motion.span className="block h-full rounded-full" style={{ width: marginW, backgroundColor: marginColor }} />
        </span>
      </motion.div>
    </motion.div>
  );
}

/** Écran de réglages : l'URL du relais se tape lettre par lettre, puis GO LIVE est pressé. */
function SettingsScreen({ p }: { p: MotionValue<number> }) {
  const opacity = useTransform(p, (v) => band(v, 0.5, 0.52, 0.63, 0.65));
  const typed = useTransform(p, (v) => SRTLA_URL.slice(0, Math.floor(ramp(v, 0.52, 0.59) * SRTLA_URL.length)));
  const press = useTransform(p, (v) => 1 - 0.08 * band(v, 0.6, 0.605, 0.615, 0.62));
  const ripple = useTransform(p, (v) => ramp(v, 0.605, 0.63));
  const rippleScale = useTransform(ripple, (r) => 1 + r * 1.6);
  const rippleO = useTransform(ripple, (r) => (r > 0 ? 0.7 * (1 - r) : 0));
  return (
    <motion.div className="absolute inset-0 bg-[#05070d] p-[6cqh] pl-[9cqw]" style={{ opacity }}>
      <p className="font-mono text-[3.4cqh] uppercase tracking-[0.15em] text-white/60">Réglages › Streams › SYXTEE</p>
      <p className="mt-[4cqh] font-mono text-[3.4cqh] text-white/60">URL</p>
      <p className="mt-[1.5cqh] max-w-[62cqw] overflow-hidden whitespace-nowrap rounded-[2cqh] border border-accent/50 px-[2.5cqh] py-[2cqh] font-mono text-[3.6cqh] text-white">
        <motion.span>{typed}</motion.span>
        <span className="ml-[0.3cqh] inline-block h-[4cqh] w-[0.5cqh] translate-y-[0.6cqh] animate-pulse bg-white" />
      </p>
      <div className="mt-[3cqh] grid max-w-[62cqw] grid-cols-2 gap-[2cqh] font-mono text-[3.2cqh] text-white/60">
        <span>Codec · H.265</span>
        <span>Bitrate adaptatif · activé</span>
      </div>
      <div className="absolute right-[7cqw] top-1/2 -translate-y-1/2">
        <motion.span className="absolute inset-0 rounded-full border-2 border-accent" style={{ scale: rippleScale, opacity: rippleO }} aria-hidden="true" />
        <motion.span
          className="relative flex h-[34cqh] w-[34cqh] items-center justify-center rounded-full bg-[var(--live)] font-mono text-[5cqh] font-semibold text-white"
          style={{ scale: press }}
        >
          GO LIVE
        </motion.span>
      </div>
    </motion.div>
  );
}

/** Retour au live : chat en superposition et viewers qui augmentent. */
function ChatOverlay({ p }: { p: MotionValue<number> }) {
  const opacity = useTransform(p, (v) => band(v, 0.65, 0.68, 0.78, 0.8));
  const viewers = useTransform(p, (v) => fmt(ramp(v, 0.65, 0.74) * 248));
  return (
    <motion.div className="absolute inset-0" style={{ opacity }}>
      <p className="absolute right-[18cqw] top-[5cqh] rounded-full bg-black/60 px-[2cqh] py-[0.8cqh] font-mono text-[3.6cqh] text-white">
        ● <motion.span>{viewers}</motion.span> viewers
      </p>
      <div className="absolute bottom-[6cqh] left-[9cqw] h-[46cqh] w-[48cqw] overflow-hidden">
        {CHAT.map((m, i) => (
          <p
            key={m}
            className="float-up absolute bottom-0 left-0 whitespace-nowrap rounded-[2cqh] bg-black/55 px-[2cqh] py-[0.8cqh] font-mono text-[3.4cqh] text-white"
            style={{ animationDelay: `${i * 0.9}s` }}
          >
            {m}
          </p>
        ))}
      </div>
    </motion.div>
  );
}

/** Le visuel complet. `still` : version statique d'une scène (même rendu, figé au progrès donné). */
export default function MoblinStage({ p }: { p: MotionValue<number> }) {
  const time = useStoryClock();
  const rotateY = useTransform(p, (v) => lerp(78, 0, ramp(v, 0, 0.16)));
  const android = useTransform(p, (v) => ramp(v, 0.76, 0.82));
  const scale = useTransform([p, android], ([v, a]: number[]) => lerp(0.88, 1, ramp(v, 0, 0.16)) * (1 + 0.1 * band(v, 0.25, 0.3, 0.46, 0.5)) * (1 - 0.22 * a));
  const shift = useTransform(android, (a) => `${-13 * a}%`);
  const uiO = useTransform(p, (v) => ramp(v, 0.1, 0.18));
  const tunnel = useTransform(p, (v) => band(v, 0.34, 0.4, 0.44, 0.48));
  const androidX = useTransform(android, (a) => `${(1 - a) * 140}%`);
  const lan = useTransform(p, (v) => ramp(v, 0.8, 0.84));

  return (
    <div className="relative flex h-full w-full items-center justify-center">
      <motion.div className="w-full max-w-[680px]" style={{ x: shift }}>
        <PhoneLandscape rotateY={rotateY} scale={scale}>
          <svg viewBox="0 0 844 390" className="absolute inset-0 h-full w-full" aria-hidden="true">
            <ScreenLandscape w={844} h={390} tunnel={tunnel} />
          </svg>
          <motion.div className="absolute inset-0" style={{ opacity: uiO }}>
            <LiveUI p={p} time={time} />
            <ChatOverlay p={p} />
            <BondingPanel p={p} time={time} />
            <SettingsScreen p={p} />
          </motion.div>
        </PhoneLandscape>
      </motion.div>

      {/* Scène 4 : 2e téléphone (Android + Moblink + eSIM Saily), relié en réseau local */}
      <motion.div className="pointer-events-none absolute inset-0" style={{ opacity: lan }} aria-hidden="true">
        <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 h-full w-full">
          <path d="M76.5 50H83" fill="none" stroke="#fff" strokeWidth={1.25} strokeDasharray="3 4" vectorEffect="non-scaling-stroke" className="bond-dash" />
        </svg>
        <p className="absolute right-[9%] top-1/2 w-max translate-x-1/2 -translate-y-[calc(50%+min(12vw,90px))] whitespace-nowrap font-mono text-[9px] uppercase tracking-[0.12em] text-white sm:text-[11px]">
          Réseau local
        </p>
      </motion.div>
      <motion.div className="absolute right-0 top-1/2 w-[18%] max-w-[150px] -translate-y-1/2" style={{ x: androidX, opacity: android }}>
        <PhoneAndroid />
      </motion.div>
    </div>
  );
}
