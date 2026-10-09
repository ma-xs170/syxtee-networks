// Squelette de la page d'un serveur : affiché tout de suite pendant que le serveur de diffusion répond.
export default function Loading() {
  return (
    <div className="mx-auto w-full max-w-7xl px-4 pb-16 pt-6 sm:px-6 sm:pt-12" aria-busy="true" aria-label="Chargement du serveur">
      <div className="h-4 w-56 animate-pulse rounded bg-foreground/10 motion-reduce:animate-none" />
      <div className="mb-8 mt-5 h-12 w-72 animate-pulse rounded-xl bg-foreground/10 motion-reduce:animate-none" />
      <div className="mb-8 flex gap-8 border-b border-line pb-4">
        {[0, 1, 2, 3, 4].map((i) => (
          <div key={i} className="h-4 w-28 animate-pulse rounded bg-foreground/10 motion-reduce:animate-none" />
        ))}
      </div>
      <div className="mb-5 h-56 animate-pulse rounded-2xl border border-line bg-surface motion-reduce:animate-none" />
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-72 animate-pulse rounded-2xl border border-line bg-surface motion-reduce:animate-none" />
        ))}
      </div>
    </div>
  );
}
