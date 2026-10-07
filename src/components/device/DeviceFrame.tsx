import Image from "next/image";

// Cadres d'appareils en CSS, teintés par les tokens du thème. Trois variantes : desktop (grand écran), laptop (portable) et phone.
// Chaque cadre garde le ratio de sa capture (16:10 ou 9:19,5) : une capture mobile n'est jamais étirée dans un cadre desktop.
// Reflet de verre léger, ombre douce et halo lumineux dessous.

export type Shot = { src: string; alt: string; width: number; height: number };
export type DeviceVariant = "desktop" | "laptop" | "phone";

const glass =
  "pointer-events-none absolute inset-0 bg-[linear-gradient(115deg,rgba(255,255,255,0.10)_0%,rgba(255,255,255,0.03)_28%,transparent_42%)]";

function Screen({ shot, sizes, priority }: { shot: Shot; sizes: string; priority?: boolean }) {
  return (
    <Image
      src={shot.src}
      alt={shot.alt}
      width={shot.width}
      height={shot.height}
      sizes={sizes}
      priority={priority}
      className="absolute inset-0 h-full w-full object-cover object-top"
    />
  );
}

/** Halo diffus sous l'appareil. */
export function Halo({ className = "" }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={`pointer-events-none absolute -z-10 aspect-[2/1] w-[90%] rounded-[50%] bg-[radial-gradient(closest-side,var(--glow),transparent)] blur-2xl ${className}`}
    />
  );
}

export default function DeviceFrame({ variant, shot, priority = false, className = "" }: { variant: DeviceVariant; shot: Shot; priority?: boolean; className?: string }) {
  if (variant === "phone") {
    return (
      <div className={`relative mx-auto w-full max-w-[17rem] ${className}`}>
        <Halo className="-bottom-10 left-1/2 -translate-x-1/2" />
        <div className="relative w-full rounded-[17%/7.8%] border-[1.5px] border-foreground/50 bg-black p-[3.6%] shadow-[0_40px_70px_-25px_var(--shadow-pop)]" style={{ aspectRatio: "9 / 19.5" }}>
          <div className="relative h-full w-full overflow-hidden rounded-[12.5%/5.8%] bg-black">
            <Screen shot={shot} sizes="(min-width: 640px) 272px, 70vw" priority={priority} />
            <span aria-hidden="true" className="absolute left-1/2 top-[1.1%] h-[2.3%] w-[26%] -translate-x-1/2 rounded-full bg-black ring-1 ring-white/15" />
            <span aria-hidden="true" className={glass} />
          </div>
        </div>
      </div>
    );
  }

  if (variant === "laptop") {
    return (
      <div className={`relative w-full ${className}`}>
        <Halo className="-bottom-12 left-1/2 -translate-x-1/2" />
        <div className="relative rounded-t-[1.1rem] rounded-b-md border-[1.5px] border-foreground/50 bg-black p-[1.8%] shadow-[0_40px_80px_-30px_var(--shadow-pop)]">
          <div className="relative aspect-[16/10] overflow-hidden rounded-[0.4rem] bg-black">
            <Screen shot={shot} sizes="(min-width: 1024px) 640px, 92vw" priority={priority} />
            <span aria-hidden="true" className={glass} />
          </div>
          <span aria-hidden="true" className="absolute left-1/2 top-[0.55%] size-1 -translate-x-1/2 rounded-full bg-foreground/40" />
        </div>
        <div aria-hidden="true" className="relative mx-auto -mt-px h-3 w-[104%] -translate-x-[1.9%] rounded-b-[1.2rem] border-[1.5px] border-t-0 border-foreground/50 bg-surface">
          <span className="absolute left-1/2 top-0 h-1 w-[16%] -translate-x-1/2 rounded-b-md border border-t-0 border-foreground/40" />
        </div>
      </div>
    );
  }

  return (
    <div className={`relative w-full ${className}`}>
      <Halo className="-bottom-12 left-1/2 -translate-x-1/2" />
      <div className="relative rounded-[0.9rem] border-[1.5px] border-foreground/50 bg-black p-[1.2%] shadow-[0_40px_80px_-30px_var(--shadow-pop)]">
        <div className="relative aspect-[16/10] overflow-hidden rounded-[0.45rem] bg-black">
          <Screen shot={shot} sizes="(min-width: 1024px) 720px, 92vw" priority={priority} />
          <span aria-hidden="true" className={glass} />
        </div>
      </div>
      <div aria-hidden="true" className="mx-auto h-[3.4rem] w-[9%] min-w-10 border-x-[1.5px] border-foreground/40 bg-gradient-to-b from-foreground/15 to-foreground/5 [clip-path:polygon(12%_0,88%_0,100%_100%,0_100%)]" />
      <div aria-hidden="true" className="mx-auto h-[0.6rem] w-[26%] rounded-t-md rounded-b-[0.5rem] border-[1.5px] border-foreground/40 bg-surface" />
    </div>
  );
}
