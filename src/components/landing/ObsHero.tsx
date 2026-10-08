"use client";

import { motion, useMotionValue, useReducedMotion, useSpring, useTransform } from "motion/react";
import { memo, useEffect, useRef, useState } from "react";
import AnimatedNumber from "./AnimatedNumber";
import { useLiveStats } from "./useLiveStats";

// Hero OBS CLOUD : un MacBook (CSS générique, sans marque) et un iPhone qui affichent la MÊME interface, synchronisés.
// Changer de scène, couper le micro ou lancer le live sur l'un agit sur l'autre. Tout est simulé côté client.
const SCENES = [
  { id: "live", name: "Live IRL" },
  { id: "drone", name: "Drone" },
  { id: "brb", name: "BRB" },
  { id: "chat", name: "Chat" },
] as const;
type SceneId = (typeof SCENES)[number]["id"];
const clock = (s: number) => {
  const n = Math.floor(s);
  return [Math.floor(n / 3600), Math.floor((n % 3600) / 60), n % 60].map((x) => String(x).padStart(2, "0")).join(":");
};

/** Aperçu vidéo : une vue par scène, fondu enchaîné (opacité + flou) quand la scène change. */
const Preview = memo(function Preview({ scene, live }: { scene: SceneId; live: boolean }) {
  const art: Record<SceneId, React.ReactNode> = {
    live: (
      <svg viewBox="0 0 160 90" className="h-full w-full" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
        <rect width="160" height="90" fill="color-mix(in srgb, var(--foreground) 5%, #0a0a0b)" />
        <path d="M0 62 L36 44 L64 56 L100 30 L132 50 L160 38 V90 H0Z" fill="var(--foreground)" fillOpacity="0.12" />
        <circle cx="122" cy="20" r="8" fill="var(--foreground)" fillOpacity="0.2" />
        <rect x="14" y="70" width="40" height="4" rx="2" fill="var(--foreground)" fillOpacity="0.3" />
      </svg>
    ),
    drone: (
      <svg viewBox="0 0 160 90" className="h-full w-full" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
        <rect width="160" height="90" fill="color-mix(in srgb, var(--foreground) 4%, #08090a)" />
        <path d="M0 70 C40 40 80 80 160 30 V90 H0Z" fill="var(--ok)" fillOpacity="0.14" />
        <path d="M0 78 C50 56 90 86 160 52 V90 H0Z" fill="var(--foreground)" fillOpacity="0.08" />
        <circle cx="80" cy="30" r="3" fill="var(--foreground)" fillOpacity="0.5" />
      </svg>
    ),
    brb: (
      <div className="grid h-full w-full place-items-center bg-[radial-gradient(ellipse_at_center,color-mix(in_srgb,var(--foreground)_10%,transparent),#08090a_70%)]">
        <span className="text-[3.4cqw] font-semibold tracking-tight">Je reviens tout de suite</span>
      </div>
    ),
    chat: (
      <div className="h-full w-full space-y-[1.2cqw] bg-[#08090a] p-[2cqw]">
        {[70, 52, 84, 40].map((w, i) => (
          <div key={i} className="flex items-center gap-[1cqw]">
            <span className="h-[2cqw] w-[2cqw] rounded-full bg-foreground/25" />
            <span className="h-[1.2cqw] rounded-full bg-foreground/20" style={{ width: `${w}%` }} />
          </div>
        ))}
      </div>
    ),
  };
  return (
    <div className="relative h-full w-full overflow-hidden rounded-[0.8cqw] border border-line bg-black">
      {SCENES.map((s) => (
        <div key={s.id} className={`absolute inset-0 transition-[opacity,filter] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none ${s.id === scene ? "opacity-100 blur-0" : "opacity-0 blur-md"}`}>
          {art[s.id]}
        </div>
      ))}
      {live && (
        <span className="absolute left-[1.4cqw] top-[1.4cqw] inline-flex items-center gap-[0.8cqw] rounded-full bg-black/60 px-[1.2cqw] py-[0.5cqw] text-[1.6cqw] font-semibold">
          <span className="live-dot" aria-hidden="true" />
          LIVE
        </span>
      )}
    </div>
  );
});

/** Niveaux audio : barres animées en CSS (aucun re-render). Micro coupé : barres au repos. */
const Levels = memo(function Levels({ muted, bars = 14, tall = "h-full" }: { muted: boolean; bars?: number; tall?: string }) {
  return (
    <div className={`flex items-end gap-[0.5cqw] ${tall}`} aria-hidden="true">
      {Array.from({ length: bars }).map((_, i) => (
        <span
          key={i}
          className={`level-bar w-full origin-bottom rounded-sm ${muted ? "scale-y-[0.08] bg-foreground/20" : i > bars - 3 ? "bg-warn" : "bg-ok"}`}
          style={muted ? undefined : ({ "--p": 0.35 + ((i * 37) % 60) / 100, animationDelay: `${(i * 91) % 700}ms`, animationDuration: `${700 + ((i * 53) % 500)}ms` } as React.CSSProperties)}
        />
      ))}
    </div>
  );
});

type Ctl = { scene: SceneId; muted: boolean; live: boolean; setScene: (s: SceneId) => void; toggleMute: () => void; toggleLive: () => void; seconds: number; bitrate: number; latency: number };

function MacUI({ c }: { c: Ctl }) {
  return (
    <div className="flex h-full flex-col gap-[1.2cqw] bg-[#0a0a0b] p-[1.6cqw] text-[1.7cqw] leading-tight">
      <div className="flex items-center justify-between">
        <span className="font-semibold">OBS CLOUD</span>
        <span className="flex items-center gap-[1.6cqw] font-mono text-muted">
          <span className="tabular-nums">{c.live ? clock(c.seconds) : "00:00:00"}</span>
          <span><AnimatedNumber value={c.live ? c.bitrate : 0} decimals={1} /> Mb/s</span>
          <span><AnimatedNumber value={c.live ? c.latency : 0} decimals={0} /> ms</span>
        </span>
      </div>
      <div className="grid min-h-0 flex-1 grid-cols-[22%_1fr_16%] gap-[1.2cqw]">
        <ul className="space-y-[0.8cqw]">
          {SCENES.map((s) => (
            <li key={s.id}>
              <button type="button" onClick={() => c.setScene(s.id)} aria-pressed={c.scene === s.id} className={`w-full rounded-[0.8cqw] border px-[1cqw] py-[0.9cqw] text-left transition-colors duration-150 ${c.scene === s.id ? "border-foreground/40 bg-surface-2 text-foreground" : "border-line text-muted hover:border-line-strong"}`}>
                {s.name}
              </button>
            </li>
          ))}
        </ul>
        <Preview scene={c.scene} live={c.live} />
        <div className="flex flex-col gap-[0.8cqw]">
          <p className="text-muted">Micro</p>
          <div className="min-h-0 flex-1"><Levels muted={c.muted} bars={8} /></div>
          <button type="button" onClick={c.toggleMute} aria-pressed={c.muted} className="rounded-[0.8cqw] border border-line py-[0.8cqw] hover:border-line-strong">{c.muted ? "Réactiver" : "Couper"}</button>
        </div>
      </div>
      <button type="button" onClick={c.toggleLive} className={`rounded-full py-[1cqw] font-semibold transition-colors duration-150 ${c.live ? "bg-bad/20 text-bad" : "bg-accent text-on-accent"}`}>
        {c.live ? "Arrêter le live" : "Démarrer le live"}
      </button>
    </div>
  );
}

function PhoneUI({ c }: { c: Ctl }) {
  return (
    <div className="flex h-full flex-col gap-[3.2cqw] bg-[#0a0a0b] px-[6cqw] pb-[6cqw] pt-[14cqw] text-[5cqw] leading-tight">
      <div className="flex items-center justify-between">
        <span className="font-semibold">OBS CLOUD</span>
        <span className="inline-flex items-center gap-[1.5cqw] text-[4cqw] text-ok"><span className="h-[2cqw] w-[2cqw] rounded-full bg-ok" aria-hidden="true" />Connecté</span>
      </div>
      <div className="aspect-video"><Preview scene={c.scene} live={c.live} /></div>
      <div className="grid grid-cols-2 gap-[2.4cqw]">
        {SCENES.map((s) => (
          <button key={s.id} type="button" onClick={() => c.setScene(s.id)} aria-pressed={c.scene === s.id} className={`rounded-[3cqw] border py-[3cqw] transition-colors duration-150 ${c.scene === s.id ? "border-foreground/40 bg-surface-2" : "border-line text-muted"}`}>{s.name}</button>
        ))}
      </div>
      <div className="flex items-center gap-[3cqw]">
        <div className="h-[8cqw] flex-1"><Levels muted={c.muted} bars={16} /></div>
        <button type="button" onClick={c.toggleMute} aria-pressed={c.muted} aria-label={c.muted ? "Réactiver le micro" : "Couper le micro"} className="rounded-[3cqw] border border-line px-[4cqw] py-[2.4cqw] text-[4.2cqw]">{c.muted ? "Muet" : "Micro"}</button>
      </div>
      <button type="button" onClick={c.toggleLive} className={`mt-auto rounded-full py-[3.4cqw] font-semibold transition-colors duration-150 ${c.live ? "bg-bad/20 text-bad" : "bg-accent text-on-accent"}`}>{c.live ? "Arrêter" : "Démarrer"}</button>
    </div>
  );
}

export default function ObsHero() {
  const reduce = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  const [scene, setScene] = useState<SceneId>("live");
  const [muted, setMuted] = useState(false);
  const [live, setLive] = useState(true);
  const lastTouch = useRef(0);
  const { snap } = useLiveStats(visible);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setVisible(e.isIntersecting), { threshold: 0.15 });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  // Sans interaction depuis 12 s, les scènes défilent seules (la démo reste vivante).
  useEffect(() => {
    if (reduce || !visible) return;
    const id = setInterval(() => {
      if (Date.now() - lastTouch.current < 12000) return;
      setScene((s) => SCENES[(SCENES.findIndex((x) => x.id === s) + 1) % SCENES.length].id);
    }, 5000);
    return () => clearInterval(id);
  }, [reduce, visible]);

  const touch = () => (lastTouch.current = Date.now());
  const c: Ctl = {
    scene, muted, live,
    setScene: (s) => { touch(); setScene(s); },
    toggleMute: () => { touch(); setMuted((m) => !m); },
    toggleLive: () => { touch(); setLive((l) => !l); },
    seconds: snap.seconds, bitrate: snap.total, latency: snap.latency,
  };

  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const macX = useSpring(useTransform(mx, [-1, 1], [-8, 8]), { stiffness: 90, damping: 18 });
  const phoneX = useSpring(useTransform(mx, [-1, 1], [18, -18]), { stiffness: 90, damping: 18 });
  const phoneY = useSpring(useTransform(my, [-1, 1], [10, -10]), { stiffness: 90, damping: 18 });
  const shine = useTransform(mx, [-1, 1], ["15%", "85%"]);
  const shineBg = useTransform(shine, (g) => `radial-gradient(60% 50% at ${g} 0%, rgba(255,255,255,0.16), transparent 70%)`);

  return (
    <motion.div
      ref={ref}
      initial={reduce ? false : { opacity: 0, y: 24, filter: "blur(8px)" }}
      whileInView={{ opacity: 1, y: 0, filter: "blur(0px)" }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
      className="relative mx-auto w-full max-w-[860px] pb-[8%]"
      onPointerMove={(e) => {
        if (reduce) return;
        const r = e.currentTarget.getBoundingClientRect();
        mx.set(((e.clientX - r.left) / r.width) * 2 - 1);
        my.set(((e.clientY - r.top) / r.height) * 2 - 1);
      }}
      onPointerLeave={() => { mx.set(0); my.set(0); }}
    >
      <div aria-hidden="true" className="pointer-events-none absolute inset-x-[8%] top-[10%] h-3/4 rounded-full bg-[radial-gradient(ellipse_at_center,color-mix(in_srgb,var(--foreground)_12%,transparent),transparent_70%)] blur-2xl" />
      {/* MacBook générique */}
      <motion.div style={{ x: reduce ? 0 : macX }} className="relative w-[88%] [perspective:1600px]">
        <div className="[transform:rotateY(-8deg)_rotateX(3deg)] [transform-style:preserve-3d]">
          <div className="relative rounded-t-[1.6%/2.6%] border border-white/15 bg-[#050506] p-[1.1%] shadow-[0_30px_80px_-20px_rgba(0,0,0,0.9)]">
            <span aria-hidden="true" className="absolute left-1/2 top-[0.8%] z-10 h-[2.2%] w-[9%] -translate-x-1/2 rounded-b-md bg-black" />
            <div className="relative aspect-[16/10] overflow-hidden rounded-[0.8%/1.3%] [container-type:inline-size]">
              <MacUI c={c} />
              {!reduce && <motion.span aria-hidden="true" className="pointer-events-none absolute inset-0 mix-blend-overlay" style={{ background: shineBg }} />}
            </div>
          </div>
          <div aria-hidden="true" className="relative mx-auto h-[3.2%] min-h-3 w-[104%] -translate-x-[2%] rounded-b-[40%/100%] border border-t-0 border-white/10 bg-[linear-gradient(to_bottom,#2a2a2e,#111113)] pt-[40%] [clip-path:polygon(0_0,100%_0,98%_100%,2%_100%)]" />
        </div>
      </motion.div>
      {/* iPhone générique */}
      <motion.div style={{ x: reduce ? 0 : phoneX, y: reduce ? 0 : phoneY }} className="absolute bottom-0 right-[2%] w-[24%] min-w-[110px]">
        <div className="relative rounded-[18%/8.5%] border border-white/20 bg-[#050506] p-[3.5%] shadow-[0_30px_70px_-15px_rgba(0,0,0,0.95)]">
          <span aria-hidden="true" className="absolute left-1/2 top-[2.2%] z-10 h-[2.6%] w-[30%] -translate-x-1/2 rounded-full bg-black" />
          <div className="relative aspect-[9/19.5] overflow-hidden rounded-[14%/6.4%] [container-type:inline-size]">
            <PhoneUI c={c} />
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
