/** Lignes de grille fines (1 px, 3 % d'opacité) qui s'estompent vers le bas. À poser dans une section `relative`. */
export default function GridBackground({ className = "" }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={`pointer-events-none absolute inset-0 -z-10 [background-image:linear-gradient(to_right,rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.03)_1px,transparent_1px)] [background-size:64px_64px] [background-position:50%_0] [mask-image:linear-gradient(to_bottom,#000_20%,transparent_95%)] ${className}`}
    />
  );
}
