// Fond de hero statique : un halo gris discret sur le noir, sans flou, sans animation ni particules.
// À placer dans une section `relative overflow-hidden`. `flip` ancre le halo en bas ; `tone` gardé pour les appelants.
export default function CloudBackdrop({ flip = false }: { flip?: boolean; tone?: "sky" | "theme" }) {
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
      <div
        className="absolute inset-0"
        style={{ background: `radial-gradient(ellipse 70% 55% at 50% ${flip ? "100%" : "0%"}, color-mix(in srgb, var(--foreground) 9%, transparent), transparent 70%)` }}
      />
      <div className="absolute inset-x-0 bottom-0 h-1/4 bg-gradient-to-b from-transparent to-background" />
    </div>
  );
}
