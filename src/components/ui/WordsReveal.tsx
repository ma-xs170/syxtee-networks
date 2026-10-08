"use client";

import { motion, useReducedMotion } from "motion/react";

/** Titre qui apparaît mot par mot : flou 12 px vers net, fondu, montée de 12 px, décalage de 60 ms, 700 ms. `em` : mots passés en italique serif gris. */
export default function WordsReveal({ text, em = [], className = "" }: { text: string; em?: string[]; className?: string }) {
  const reduce = useReducedMotion();
  const words = text.split(" ");
  return (
    <span className={className} aria-label={text}>
      {words.map((w, i) => (
        <motion.span
          key={i}
          aria-hidden="true"
          className={`inline-block ${em.includes(w) ? "italic text-muted" : ""}`}
          initial={reduce ? { opacity: 0 } : { opacity: 0, y: 12, filter: "blur(12px)" }}
          animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          transition={{ duration: reduce ? 0.2 : 0.7, delay: reduce ? 0 : i * 0.06, ease: [0.22, 1, 0.36, 1] }}
        >
          {w}
          {i < words.length - 1 ? " " : ""}
        </motion.span>
      ))}
    </span>
  );
}
