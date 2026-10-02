// Fond de hero en nuages : un dégradé rouge vers blanc, de grands nuages flous (blancs et rouge profond) qui dérivent
// lentement, une traînée de fumée rouge sombre en diagonale et un grain fin par-dessus (comme le bruit d'une pellicule).
// L'aurore et les nuages s'animent par `transform` seulement ; arrêté en prefers-reduced-motion. À placer dans une section `relative overflow-hidden`.

const GRAIN =
  "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='220' height='220'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 0.55 0'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>\")";

/** `flip` : blanc en haut, rouge soutenu en bas (appel final de la page). */
/** `tone="theme"` : version du dashboard, teintée avec le fond du thème (rouge profond sur anthracite, rosé en thème clair). */
export default function CloudBackdrop({ flip = false, tone = "sky" }: { flip?: boolean; tone?: "sky" | "theme" }) {
  if (tone === "theme") return <ThemeClouds />;
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
      <div
        className={`absolute inset-0 ${
          flip
            ? "bg-[linear-gradient(to_top,color-mix(in_srgb,var(--accent)_62%,white)_0%,color-mix(in_srgb,var(--accent)_36%,white)_40%,color-mix(in_srgb,var(--accent)_12%,white)_74%,var(--background)_100%)]"
            : "bg-[linear-gradient(to_bottom,color-mix(in_srgb,var(--accent)_62%,white)_0%,color-mix(in_srgb,var(--accent)_36%,white)_40%,color-mix(in_srgb,var(--accent)_12%,white)_74%,var(--background)_100%)]"
        }`}
      />

      {/* Aurore : un grand dégradé conique qui tourne lentement et fait changer toutes les couleurs du fond */}
      <div className={`${flip ? "aurora-mask-flip" : "aurora-mask"} absolute inset-0`}>
        <div className="aurora absolute left-1/2 top-[-45%] h-[190%] w-[190%] rounded-full opacity-80 blur-[70px] [background:conic-gradient(from_0deg,color-mix(in_srgb,var(--accent)_70%,white),white,color-mix(in_srgb,var(--accent)_96%,black),color-mix(in_srgb,var(--accent)_40%,white),white,color-mix(in_srgb,var(--accent)_70%,white))]" />
      </div>

      {/* Nuages blancs */}
      <div className="cloud-a absolute -left-[12%] top-[2%] h-[46%] w-[58%] rounded-full bg-white/70 blur-[90px]" />
      <div className="cloud-b absolute left-[34%] top-[40%] h-[40%] w-[62%] rounded-full bg-white/80 blur-[100px]" />
      <div className="cloud-c absolute -right-[10%] top-[6%] h-[34%] w-[44%] rounded-full bg-white/45 blur-[90px]" />

      {/* Rouge profond */}
      <div className="cloud-b absolute right-[-8%] top-[18%] h-[42%] w-[46%] rounded-full bg-[color-mix(in_srgb,var(--accent)_92%,black)]/55 blur-[110px]" />
      <div className="cloud-a absolute left-[8%] top-[48%] h-[34%] w-[40%] rounded-full bg-accent/45 blur-[100px]" />

      {/* Traînée de fumée */}
      <div className="cloud-c absolute left-[-10%] top-[30%] h-[18%] w-[120%] -rotate-[14deg] rounded-full bg-[color-mix(in_srgb,var(--accent)_70%,black)]/35 blur-[70px]" />

      {/* Grain */}
      <div className="absolute inset-0 opacity-[0.22] mix-blend-multiply" style={{ backgroundImage: GRAIN }} />
    </div>
  );
}

function ThemeClouds() {
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
      <div className="absolute inset-0 bg-[linear-gradient(to_bottom,color-mix(in_srgb,var(--accent)_42%,var(--background))_0%,color-mix(in_srgb,var(--accent)_18%,var(--background))_48%,var(--background)_100%)]" />
      <div className="aurora-mask absolute inset-0">
        <div className="aurora absolute left-1/2 top-[-60%] h-[220%] w-[160%] rounded-full opacity-50 blur-[80px] [background:conic-gradient(from_0deg,color-mix(in_srgb,var(--accent)_75%,var(--background)),var(--background),color-mix(in_srgb,var(--accent)_95%,black),color-mix(in_srgb,var(--accent)_35%,var(--background)),var(--background),color-mix(in_srgb,var(--accent)_75%,var(--background)))]" />
      </div>
      <div className="cloud-a absolute -left-[10%] top-[0%] h-[70%] w-[50%] rounded-full bg-accent/30 blur-[90px]" />
      <div className="cloud-b absolute right-[-6%] top-[8%] h-[60%] w-[46%] rounded-full bg-[color-mix(in_srgb,var(--accent)_90%,black)]/35 blur-[100px]" />
      <div className="cloud-c absolute left-[30%] top-[-10%] h-[50%] w-[40%] rounded-full bg-foreground/10 blur-[90px]" />
      <div className="absolute inset-0 opacity-[0.12] mix-blend-soft-light" style={{ backgroundImage: GRAIN }} />
    </div>
  );
}
