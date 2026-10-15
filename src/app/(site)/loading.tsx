import Image from "next/image";

// Squelette des pages publiques : s'affiche tout de suite au clic, la vraie page prend la place dès qu'elle est prête.
export default function SiteLoading() {
  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6 sm:py-24">
      <div role="status" aria-label="Chargement" className="grid place-items-center py-6">
        <Image src="/logo-400.png" alt="" width={36} height={50} style={{ width: 36, height: "auto" }} className="ink-img logo-load" priority />
      </div>
      <div aria-hidden="true" className="animate-pulse motion-reduce:animate-none">
        <div className="h-12 w-3/4 max-w-xl rounded-lg bg-foreground/10 sm:h-16" />
        <div className="mt-5 h-4 w-full max-w-lg rounded bg-foreground/10" />
        <div className="mt-3 h-4 w-2/3 max-w-md rounded bg-foreground/10" />
        <div className="mt-12 grid grid-cols-1 gap-4 lg:grid-cols-3">
          <div className="h-56 tile lg:col-span-2" />
          <div className="h-56 tile" />
        </div>
      </div>
    </div>
  );
}
