// Grain de fond : bruit SVG à 3,5 % sur toute la page, pour casser le noir plat. Fixe, sans interaction, jamais sur un conteneur qui défile.
const NOISE = "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='160' height='160'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='2' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 0.9 0'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>\")";

export default function GrainOverlay() {
  return <div aria-hidden="true" className="pointer-events-none fixed inset-0 z-[70] opacity-[0.035] mix-blend-screen" style={{ backgroundImage: NOISE }} />;
}
