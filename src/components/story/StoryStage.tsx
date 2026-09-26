import type { ReactNode } from "react";

/** Carré centré qui occupe la plus grande place possible : SVG 600 × 600 + calques HTML alignés dessus. */
export default function StoryStage({ children, overlay }: { children: ReactNode; overlay?: ReactNode }) {
  return (
    <div className="relative h-full w-full [container-type:size]">
      <div className="absolute left-1/2 top-1/2 aspect-square w-[min(100cqw,100cqh)] -translate-x-1/2 -translate-y-1/2">
        <svg viewBox="0 0 600 600" className="absolute inset-0 h-full w-full overflow-visible text-foreground" fill="none" aria-hidden="true">
          {children}
        </svg>
        {overlay}
      </div>
    </div>
  );
}
