// Squelette de la liste des serveurs.
export default function Loading() {
  return (
    <div className="mx-auto w-full max-w-7xl px-4 pb-16 pt-6 sm:px-6 sm:pt-12" aria-busy="true" aria-label="Chargement des serveurs">
      <div className="mb-8 h-12 w-64 animate-pulse rounded-xl bg-foreground/10 motion-reduce:animate-none" />
      <div className="h-80 animate-pulse rounded-2xl border border-line bg-surface motion-reduce:animate-none" />
    </div>
  );
}
