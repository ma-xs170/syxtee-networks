"use client";

import { useEffect, useRef, type ReactNode, type SVGProps } from "react";
import { useMotionValueEvent, type MotionValue } from "motion/react";

/** Groupe SVG dont l'attribut `transform` suit une MotionValue (écrit directement dans le DOM, sans re-render). */
export default function MotionTransform({
  transform,
  children,
  ...rest
}: { transform: MotionValue<string>; children: ReactNode } & Omit<SVGProps<SVGGElement>, "transform">) {
  const ref = useRef<SVGGElement>(null);
  useMotionValueEvent(transform, "change", (v) => ref.current?.setAttribute("transform", v));
  useEffect(() => {
    ref.current?.setAttribute("transform", transform.get());
  }, [transform]);
  return (
    <g ref={ref} {...rest}>
      {children}
    </g>
  );
}
