import { DashPage } from "./ui";

// Squelette affiché tout de suite pendant qu'une page du dashboard charge ses données (loading.tsx) :
// le clic répond immédiatement, la vraie page prend la place dès qu'elle est prête.
export default function DashLoading() {
  return (
    <DashPage>
      <div role="status" aria-label="Chargement" className="motion-safe:animate-pulse">
        <div className="h-7 w-48 rounded-lg bg-foreground/10" />
        <div className="mt-3 h-4 w-72 max-w-full rounded bg-foreground/10" />
        <div className="mt-8 grid grid-cols-1 gap-4 lg:grid-cols-3">
          <div className="h-56 tile lg:col-span-2" />
          <div className="h-56 tile" />
          <div className="h-40 tile lg:col-span-3" />
        </div>
      </div>
    </DashPage>
  );
}
