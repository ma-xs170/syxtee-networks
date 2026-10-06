import Particles from "./Particles";

// Fond de hero en volutes : de grandes formes courbes grises, floues, qui dérivent très lentement sur le noir (blanc cassé en thème clair),
// un grain fin, puis des petits « + » et des particules qui scintillent. Tout est teinté par --foreground : les deux thèmes marchent.
// Dérive en `transform` seulement ; arrêtée en prefers-reduced-motion. À placer dans une section `relative overflow-hidden`.

const GRAIN =
  "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='220' height='220'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 0.9 0'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>\")";

const INK = "color-mix(in srgb, var(--foreground) 34%, transparent)";

/** `flip` : volutes ancrées en bas (appel final de la page). `tone="theme"` : version discrète pour dashboard, admin et connexion. */
export default function CloudBackdrop({ flip = false, tone = "sky" }: { flip?: boolean; tone?: "sky" | "theme" }) {
  const subtle = tone === "theme";
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
      <div className={`absolute inset-0 ${subtle ? "opacity-45" : ""} ${flip ? "-scale-y-100" : ""}`}>
        <svg viewBox="0 0 1600 900" preserveAspectRatio="xMidYMid slice" fill="none" className="absolute inset-0 h-full w-full blur-[34px]">
          <g className="cloud-a">
            <path d="M-120 330 C 120 -40, 520 -70, 700 150 C 790 260, 640 330, 520 250" stroke={INK} strokeWidth="150" strokeLinecap="round" />
          </g>
          <g className="cloud-b">
            <ellipse cx="1420" cy="470" rx="150" ry="230" stroke={INK} strokeWidth="130" />
            <path d="M1010 -60 C 1120 200, 1180 420, 1010 640" stroke={INK} strokeWidth="110" strokeLinecap="round" />
          </g>
          <g className="cloud-c">
            <path d="M-80 880 C 200 640, 560 700, 760 960" stroke={INK} strokeWidth="170" strokeLinecap="round" />
            <path d="M780 40 C 900 -40, 1040 -20, 1100 60" stroke={INK} strokeWidth="90" strokeLinecap="round" />
          </g>
        </svg>
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_55%_at_50%_50%,var(--background)_0%,transparent_75%)] opacity-70" />
      </div>
      <div className="absolute inset-0 opacity-[0.07] mix-blend-screen [html[data-theme=light]_&]:opacity-[0.12] [html[data-theme=light]_&]:mix-blend-multiply" style={{ backgroundImage: GRAIN }} />
      <Particles density={subtle ? 0.45 : 1} />
      <div className="absolute inset-x-0 bottom-0 h-1/4 bg-gradient-to-b from-transparent to-background" />
    </div>
  );
}
