// Fond de survol d'une entrée de menu. Statique (sans bibliothèque d'animation) : apparaît à l'endroit survolé.
// À poser dans un lien `relative`, avant son contenu (le contenu en `relative z-10`). `id` gardé pour les appelants.

export default function GlidePill({ show, className = "rounded-lg" }: { show: boolean; id?: string; className?: string }) {
  if (!show) return null;
  return <span aria-hidden="true" className={`pointer-events-none absolute inset-0 bg-foreground/[0.09] ${className}`} />;
}
