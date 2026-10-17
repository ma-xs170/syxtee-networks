import BackpackEncoder from "@/components/illustrations/BackpackEncoder";
import type { ReactNode } from "react";

export type ViewName = string;
export type LedState = string;

/** Illustration statique de l'Encodeur (SVG), sans WebGL. Le conteneur donne la hauteur. Les props de vue sont gardées pour les appelants. */
export default function EncoderViewer({ className = "h-[320px] sm:h-[420px]" }: { view?: ViewName; led?: LedState; zoom?: number; focusX?: number; className?: string; children?: ReactNode }) {
  return (
    <div className={`flex w-full items-center justify-center ${className}`}>
      <BackpackEncoder animated={false} className="h-full w-auto max-w-full" />
    </div>
  );
}
