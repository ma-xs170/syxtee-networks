"use client";

import Image from "next/image";
import { motion, useReducedMotion } from "motion/react";

// Téléphone du hero : il flotte lentement, entouré d'ondes (le signal qui part du téléphone vers ton PC). Fixe en mouvement réduit.
export default function FloatingPhone() {
  const reduce = useReducedMotion();
  return (
    <div className="relative mx-auto w-full max-w-[17rem] sm:max-w-[19rem]">
      <div aria-hidden="true" className="absolute left-1/2 top-1/2 -z-10 aspect-square w-[190%] -translate-x-1/2 -translate-y-1/2">
        {[0.34, 0.52, 0.72, 1].map((s, i) => (
          <span key={s} className="absolute inset-0 m-auto rounded-full border border-foreground/10" style={{ width: `${s * 100}%`, height: `${s * 100}%`, opacity: 1 - i * 0.18 }} />
        ))}
      </div>
      <motion.div animate={reduce ? undefined : { y: [0, -14, 0] }} transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}>
        <div className="relative w-full rounded-[18%/8.3%] border-[1.5px] border-foreground/80 bg-black p-[3.5%] shadow-[0_50px_100px_-30px_rgba(0,0,0,0.95)]" style={{ aspectRatio: "9 / 19.5" }}>
          <div className="relative h-full w-full overflow-hidden rounded-[14%/6.5%] bg-black">
            <Image src="/images/remote/controle-mobile.png" alt="Contrôle à distance sur téléphone : aperçu du programme et scènes d'OBS" fill sizes="304px" priority className="object-cover object-top" />
            <div aria-hidden="true" className="absolute left-1/2 top-[2.2%] h-[3.6%] w-[30%] -translate-x-1/2 rounded-full bg-black ring-1 ring-white/15" />
            <span aria-hidden="true" className="pointer-events-none absolute inset-0 bg-gradient-to-br from-white/[0.07] via-transparent via-40% to-transparent" />
          </div>
        </div>
      </motion.div>
    </div>
  );
}
