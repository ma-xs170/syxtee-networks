"use client";

import { motion, useReducedMotion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { DeviceIphone, DeviceMac } from "../devices/Devices";
import { EncoderMacUI, EncoderPhoneUI } from "./EncoderScreens";
import { useDemoEngine, useEncoder } from "./useEncoder";

/**
 * Démo publique du tableau de bord de l'Encodeur : 100 % simulée, sans compte. Écran d'ordinateur et téléphone noirs partagent la même session.
 * Données : provider mock (src/lib/encoder). Pause hors écran ; sur petit écran, seul le téléphone s'affiche.
 */
export default function EncoderDashboardDemo({ images }: { images?: { laptop?: string | null; phone?: string | null } }) {
  const reduce = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  const engine = useDemoEngine();
  const d = useEncoder(engine, visible);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setVisible(e.isIntersecting), { threshold: 0.1 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <motion.div
      ref={ref}
      initial={reduce ? false : { opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.15 }}
      transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
      className="relative mx-auto w-full max-w-[1040px] pb-[6%] md:pb-[9%]"
    >
      <div aria-hidden="true" className="pointer-events-none absolute inset-x-[2%] top-[4%] h-[88%] rounded-full bg-[radial-gradient(ellipse_at_center,rgba(255,255,255,0.08),transparent_68%)] blur-2xl" />
      <div className="relative mx-auto hidden w-[84%] md:block">
        <DeviceMac image={images?.laptop}>
          <EncoderMacUI d={d} />
        </DeviceMac>
      </div>
      <div className="relative mx-auto w-[64%] max-w-[300px] md:absolute md:bottom-0 md:right-[1%] md:mx-0 md:w-[19%] md:max-w-none">
        <DeviceIphone image={images?.phone} className="device-float">
          <EncoderPhoneUI d={d} />
        </DeviceIphone>
      </div>
      {d.auto && <p className="mt-4 text-center text-xs text-muted">Simulation automatique. Clique n&apos;importe où dans l&apos;écran pour reprendre la main.</p>}
    </motion.div>
  );
}
