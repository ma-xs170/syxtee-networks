"use client";

import { motion, useMotionValue, useReducedMotion, useSpring, useTransform } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { DeviceIphone, DeviceMac } from "../devices/Devices";
import { SCENES, type Ctl, type SceneId } from "./ObsScreens";
import { MacUI, PhoneUI } from "./RemoteScreens";
import { useLiveStats } from "./useLiveStats";

// Hero OBS CLOUD : ordinateur et téléphone (génériques, coloris noir) affichent la MÊME session, synchronisée.
// Changer de scène, couper le micro ou lancer le live sur l'un agit sur les deux autres. Tout est simulé côté client.
export type HeroImages = { laptop?: string | null; phone?: string | null };

export default function ObsHero({ images }: { images?: HeroImages }) {
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
    scene,
    muted,
    live,
    setScene: (s) => {
      touch();
      setScene(s);
    },
    toggleMute: () => {
      touch();
      setMuted((m) => !m);
    },
    toggleLive: () => {
      touch();
      setLive((l) => !l);
    },
    seconds: snap.seconds,
    bitrate: snap.total,
    latency: snap.latency,
    loss: snap.loss,
    fps: snap.fps,
  };

  // Parallaxe : chaque appareil bouge à sa vitesse (ordinateur lent, téléphone plus rapide).
  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const spring = { stiffness: 90, damping: 18 };
  const macX = useSpring(useTransform(mx, [-1, 1], [-8, 8]), spring);
  const phoneX = useSpring(useTransform(mx, [-1, 1], [18, -18]), spring);
  const phoneY = useSpring(useTransform(my, [-1, 1], [10, -10]), spring);

  return (
    <motion.div
      ref={ref}
      initial={reduce ? false : { opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
      className="relative mx-auto w-full max-w-[960px] pb-[18%] md:pb-[9%]"
      onPointerMove={(e) => {
        if (reduce) return;
        const r = e.currentTarget.getBoundingClientRect();
        mx.set(((e.clientX - r.left) / r.width) * 2 - 1);
        my.set(((e.clientY - r.top) / r.height) * 2 - 1);
      }}
      onPointerLeave={() => {
        mx.set(0);
        my.set(0);
      }}
    >
      {/* halo derrière les appareils : ils se détachent du fond */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-x-[2%] top-[4%] h-[88%] rounded-full bg-[radial-gradient(ellipse_at_center,rgba(255,255,255,0.08),transparent_68%)] blur-2xl" />
      {/* ordinateur : caché sur petit écran (téléphone et montre seulement) */}
      <motion.div style={{ x: reduce ? 0 : macX }} className="relative mx-auto hidden w-[78%] md:block">
        <DeviceMac image={images?.laptop}>
          <MacUI c={c} />
        </DeviceMac>
      </motion.div>
      {/* téléphone : devant, à droite */}
      <motion.div style={{ x: reduce ? 0 : phoneX, y: reduce ? 0 : phoneY }} className="relative mx-auto w-[50%] max-w-[230px] md:absolute md:bottom-0 md:right-[-9%] md:mx-0 md:w-[21%] md:max-w-none">
        <DeviceIphone image={images?.phone} className="device-float">
          <PhoneUI c={c} />
        </DeviceIphone>
      </motion.div>
    </motion.div>
  );
}
